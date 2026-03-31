const crypto = require('crypto');
const { config } = require('./config');
const { signJwt, randomId, secureEqualStrings } = require('./security');

function resolveAppOrigin(req) {
  if (config.appOrigin) {
    return config.appOrigin.replace(/\/+$/, '');
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = forwardedProto ? String(forwardedProto).split(',')[0] : 'http';
  const host = req.headers.host || `localhost:${config.port}`;
  return `${protocol}://${host}`;
}

function isStripeConfigured() {
  return config.paymentProvider === 'stripe' && Boolean(config.stripeSecretKey);
}

function isStripeWebhookConfigured() {
  return isStripeConfigured() && Boolean(config.stripeWebhookSecret);
}

function isLiveKitConfigured() {
  return (
    config.liveProvider === 'livekit' &&
    Boolean(config.livekitUrl) &&
    Boolean(config.livekitApiKey) &&
    Boolean(config.livekitApiSecret)
  );
}

function getProviderStatus() {
  return {
    payments: {
      mode: isStripeConfigured() ? 'stripe' : 'sandbox',
      stripeConfigured: isStripeConfigured(),
      stripeWebhookConfigured: isStripeWebhookConfigured(),
      publishableKey: config.stripePublishableKey || ''
    },
    live: {
      mode: isLiveKitConfigured() ? 'livekit' : 'manual',
      livekitConfigured: isLiveKitConfigured(),
      livekitUrl: config.livekitUrl || '',
      livekitRtmpUrl: config.livekitRtmpUrl || ''
    }
  };
}

async function parseProviderError(response) {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.message || 'Provider request failed.';
  } catch (error) {
    return 'Provider request failed.';
  }
}

async function createStripeCheckoutSession(req, donation, channel, user) {
  const origin = resolveAppOrigin(req);
  const params = new URLSearchParams();

  params.set('mode', 'payment');
  params.set('submit_type', 'donate');
  params.set('success_url', `${origin}/channel/${channel.slug}?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${origin}/channel/${channel.slug}?checkout=cancelled&donation=${donation.id}`);
  params.set('client_reference_id', donation.id);
  params.set('customer_email', user.email);
  params.set('billing_address_collection', 'auto');
  params.set('allow_promotion_codes', 'true');
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', donation.currency);
  params.set('line_items[0][price_data][unit_amount]', String(Math.round(donation.amount * 100)));
  params.set('line_items[0][price_data][product_data][name]', `Support ${channel.name} on NEXA`);
  params.set(
    'line_items[0][price_data][product_data][description]',
    donation.message || `Donation from ${user.name} on NEXA`
  );
  params.set('metadata[donation_id]', donation.id);
  params.set('metadata[channel_id]', channel.id);
  params.set('metadata[user_id]', user.id);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error(await parseProviderError(response));
  }

  const payload = await response.json();
  return {
    provider: 'stripe',
    paymentSessionId: payload.id,
    checkoutUrl: payload.url || '',
    raw: payload
  };
}

function createSandboxCheckoutSession(donation) {
  return {
    provider: 'sandbox',
    paymentSessionId: `sandbox-${donation.id}`,
    checkoutUrl: `/checkout/sandbox?donationId=${donation.id}`,
    raw: {
      id: `sandbox-${donation.id}`,
      url: `/checkout/sandbox?donationId=${donation.id}`
    }
  };
}

async function createDonationCheckout(req, donation, channel, user) {
  if (isStripeConfigured()) {
    return createStripeCheckoutSession(req, donation, channel, user);
  }

  return createSandboxCheckoutSession(donation);
}

async function retrieveStripeSessionStatus(sessionId) {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${config.stripeSecretKey}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseProviderError(response));
  }

  const payload = await response.json();
  return {
    id: payload.id,
    status: payload.status,
    paymentStatus: payload.payment_status,
    metadata: payload.metadata || {},
    raw: payload
  };
}

function verifyStripeWebhookSignature(rawBody, signatureHeader) {
  if (!config.stripeWebhookSecret) {
    throw new Error('Stripe webhook secret is not configured.');
  }

  if (!signatureHeader) {
    throw new Error('Missing Stripe signature header.');
  }

  const parts = String(signatureHeader).split(',').reduce((accumulator, chunk) => {
    const [key, value] = chunk.split('=');
    if (key && value) {
      accumulator[key.trim()] = value.trim();
    }
    return accumulator;
  }, {});

  if (!parts.t || !parts.v1) {
    throw new Error('Invalid Stripe signature format.');
  }

  const payload = `${parts.t}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', config.stripeWebhookSecret).update(payload).digest('hex');

  if (!secureEqualStrings(expected, parts.v1)) {
    throw new Error('Stripe signature verification failed.');
  }

  return JSON.parse(rawBody.toString('utf8'));
}

function buildLiveKitAccessToken({ identity, name, roomName, canPublish, canSubscribe, metadata = {} }) {
  if (!isLiveKitConfigured()) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.livekitApiKey,
    sub: identity,
    name,
    nbf: now,
    exp: now + 60 * 60,
    metadata: JSON.stringify(metadata),
    video: {
      room: roomName,
      roomJoin: true,
      canPublish,
      canPublishData: canPublish,
      canSubscribe
    }
  };

  return signJwt(payload, config.livekitApiSecret);
}

function buildLiveBlueprint(channel, user) {
  const livekitEnabled = isLiveKitConfigured();
  const provider = livekitEnabled ? 'livekit' : 'manual';
  const publisherIdentity = `${user.id}:publisher:${channel.id}`;
  const viewerIdentity = `${user.id}:viewer:${channel.id}`;

  return {
    provider,
    providerStatus: getProviderStatus().live,
    serverUrl: livekitEnabled ? config.livekitUrl : '',
    roomName: channel.stream.roomName,
    ingressUrl: livekitEnabled ? config.livekitRtmpUrl || channel.stream.ingressUrl : channel.stream.ingressUrl,
    streamKey: channel.stream.streamKey,
    playbackUrl: channel.stream.playbackUrl,
    viewerJoinUrl: channel.stream.viewerJoinUrl,
    publisherToken: livekitEnabled
      ? buildLiveKitAccessToken({
          identity: publisherIdentity,
          name: `${user.name} Publisher`,
          roomName: channel.stream.roomName,
          canPublish: true,
          canSubscribe: true,
          metadata: { role: user.role, channelId: channel.id, mode: 'publisher' }
        })
      : null,
    viewerToken: livekitEnabled
      ? buildLiveKitAccessToken({
          identity: viewerIdentity,
          name: `${user.name} Viewer`,
          roomName: channel.stream.roomName,
          canPublish: false,
          canSubscribe: true,
          metadata: { role: user.role, channelId: channel.id, mode: 'viewer' }
        })
      : null,
    ingestKeyId: randomId('ing'),
    obsPreset: {
      service: livekitEnabled ? 'Custom (LiveKit RTMP ingress)' : 'Custom RTMP',
      server: livekitEnabled ? config.livekitRtmpUrl || channel.stream.ingressUrl : channel.stream.ingressUrl,
      streamKey: channel.stream.streamKey
    }
  };
}

module.exports = {
  resolveAppOrigin,
  getProviderStatus,
  isStripeConfigured,
  isStripeWebhookConfigured,
  isLiveKitConfigured,
  createDonationCheckout,
  retrieveStripeSessionStatus,
  verifyStripeWebhookSignature,
  buildLiveBlueprint
};
