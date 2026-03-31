const http = require('http');
const { URL } = require('url');
const { config } = require('./config');
const { sendJson, sendHtml, serveStaticFile, readRequestBody, readRawRequestBody } = require('./http');
const { readStore, writeStore, ensureStore } = require('./store');
const {
  sanitizeUser,
  buildSessionCookie,
  buildClearedSessionCookie,
  getCurrentUser,
  hasRole,
  createSession,
  destroySession,
  registerUser,
  authenticateUser
} = require('./auth');
const {
  getProviderStatus,
  createDonationCheckout,
  retrieveStripeSessionStatus,
  verifyStripeWebhookSignature,
  buildLiveBlueprint
} = require('./providers');
const {
  renderHomePage,
  renderAuthPage,
  renderChannelPage,
  renderStudioPage,
  renderAdminPage,
  renderSandboxCheckoutPage,
  renderNotFoundPage
} = require('./views');
const { randomId } = require('./security');

const chatStreams = new Map();

function getInitials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
}

function findUser(store, userId) {
  return store.users.find((user) => user.id === userId) || null;
}

function findChannelById(store, channelId) {
  return store.channels.find((channel) => channel.id === channelId) || null;
}

function findChannelBySlug(store, slug) {
  return store.channels.find((channel) => channel.slug === slug) || null;
}

function getPaidDonations(store, channelId) {
  return store.donations.filter((donation) => donation.channelId === channelId && donation.status === 'paid');
}

function getChannelDonationTotal(store, channelId) {
  return getPaidDonations(store, channelId).reduce((sum, donation) => sum + Number(donation.amount || 0), 0);
}

function serializeDonation(store, donation) {
  const supporter = findUser(store, donation.userId);
  return {
    id: donation.id,
    channelId: donation.channelId,
    amount: donation.amount,
    currency: donation.currency,
    message: donation.message,
    status: donation.status,
    supporterName: donation.supporterName || supporter?.name || 'Anonymous',
    paymentProvider: donation.paymentProvider,
    createdAt: donation.createdAt,
    paidAt: donation.paidAt || null
  };
}

function getChannelSummary(store, channel) {
  const owner = findUser(store, channel.ownerUserId);
  const paidDonations = getPaidDonations(store, channel.id)
    .sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))
    .slice(0, 5)
    .map((donation) => serializeDonation(store, donation));

  return {
    ...channel,
    initials: getInitials(channel.name),
    owner: owner ? sanitizeUser(owner) : null,
    donationTotal: getChannelDonationTotal(store, channel.id),
    paidDonations,
    openReports: store.reports.filter((report) => report.channelId === channel.id && report.status === 'open').length
  };
}

function getVisibleChannelsForUser(store, user) {
  if (!user) {
    return [];
  }

  if (hasRole(user, 'moderator')) {
    return store.channels;
  }

  return store.channels.filter((channel) => channel.ownerUserId === user.id);
}

function canManageChannel(user, channel) {
  if (!user || !channel) {
    return false;
  }

  if (hasRole(user, 'moderator')) {
    return true;
  }

  return user.role === 'creator' && channel.ownerUserId === user.id;
}

function audit(store, actorUserId, action, targetType, targetId, detail) {
  store.auditLogs.unshift({
    id: randomId('audit'),
    actorUserId: actorUserId || null,
    action,
    targetType,
    targetId,
    detail,
    createdAt: new Date().toISOString()
  });

  store.auditLogs = store.auditLogs.slice(0, 200);
}

function ensureCreatorChannel(store, user) {
  if (user.role !== 'creator') {
    return null;
  }

  const existing = store.channels.find((channel) => channel.ownerUserId === user.id);
  if (existing) {
    return existing;
  }

  const slugBase = slugify(user.name) || user.id;
  const uniqueSlug = store.channels.some((channel) => channel.slug === slugBase) ? `${slugBase}-${store.channels.length + 1}` : slugBase;
  const channel = {
    id: randomId('chn'),
    slug: uniqueSlug,
    name: `${user.name} Live`,
    handle: `@${uniqueSlug}`,
    ownerUserId: user.id,
    title: 'New creator stream setup',
    category: 'Just Chatting',
    description: 'New creator channel ready for your first NEXA production stream.',
    accent: '#3ce0d1',
    surface: '#14203a',
    isLive: false,
    viewers: 0,
    followers: 0,
    tags: ['New creator', 'Setup'],
    startedAt: null,
    stream: {
      provider: 'manual',
      roomName: `nexa-${uniqueSlug}`,
      ingressUrl: 'rtmp://live.nexa.local/live',
      streamKey: `${uniqueSlug}-stream-key-demo`,
      playbackUrl: '',
      viewerJoinUrl: '',
      latency: 'low-latency',
      region: 'global'
    },
    moderation: {
      state: 'approved',
      automodLevel: 'standard',
      matureContent: false,
      lastReviewedAt: null
    }
  };

  store.channels.unshift(channel);
  return channel;
}

function getChatHistory(store, channelId, limit = 40) {
  return store.chats
    .filter((message) => message.channelId === channelId && message.status === 'visible')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-limit)
    .map((message) => ({
      ...message,
      user: sanitizeUser(findUser(store, message.userId))
    }));
}

function publishChatEvent(channelId, event, payload) {
  const listeners = chatStreams.get(channelId);
  if (!listeners || !listeners.size) {
    return;
  }

  const packet = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of listeners) {
    res.write(packet);
  }
}

function openChatStream(channelId, req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  });

  if (!chatStreams.has(channelId)) {
    chatStreams.set(channelId, new Set());
  }

  const listeners = chatStreams.get(channelId);
  listeners.add(res);
  res.write('retry: 3000\n\n');

  const cleanup = () => {
    listeners.delete(res);
    if (!listeners.size) {
      chatStreams.delete(channelId);
    }
  };

  req.on('close', cleanup);
  req.on('end', cleanup);
}

function unauthorized(res, message = 'Authentication required.') {
  sendJson(res, 401, { error: message });
}

function forbidden(res, message = 'You do not have access to this resource.') {
  sendJson(res, 403, { error: message });
}

function notFound(res, viewer) {
  sendHtml(res, 404, renderNotFoundPage({ viewer }));
}

function validateDonationInput(payload) {
  const amount = Number(payload.amount);
  const message = String(payload.message || '').trim();
  const channelId = String(payload.channelId || '').trim();

  if (!channelId) {
    return 'Channel is required.';
  }

  if (!Number.isFinite(amount) || amount < 1 || amount > 5000) {
    return 'Donation amount must be between 1 and 5000 USD.';
  }

  if (message.length > 120) {
    return 'Donation message must be 120 characters or less.';
  }

  return null;
}

function validateReportInput(payload) {
  const reason = String(payload.reason || '').trim();
  const detail = String(payload.detail || '').trim();

  if (!reason) {
    return 'A report reason is required.';
  }

  if (detail.length < 6 || detail.length > 180) {
    return 'Report details must be between 6 and 180 characters.';
  }

  return null;
}

function validateChatInput(payload) {
  const channelId = String(payload.channelId || '').trim();
  const body = String(payload.body || '').trim();

  if (!channelId) {
    return 'Channel is required.';
  }

  if (body.length < 1 || body.length > 240) {
    return 'Chat messages must be between 1 and 240 characters.';
  }

  return null;
}

function finalizeDonationPaid(store, donation, source) {
  donation.status = 'paid';
  donation.paidAt = new Date().toISOString();
  donation.providerReceipt = source;
}

function buildAuthPayload(store, user) {
  return {
    user: sanitizeUser(user),
    providerStatus: getProviderStatus()
  };
}

function buildStudioSummary(store, user, channelId) {
  const manageableChannels = getVisibleChannelsForUser(store, user).map((channel) => getChannelSummary(store, channel));
  const selectedChannel =
    manageableChannels.find((channel) => channel.id === channelId) || manageableChannels[0] || null;

  return {
    providerStatus: getProviderStatus(),
    channels: manageableChannels,
    selectedChannel,
    metrics: {
      accessibleChannels: manageableChannels.length,
      liveChannels: manageableChannels.filter((channel) => channel.isLive).length,
      revenueTracked: manageableChannels.reduce((sum, channel) => sum + channel.donationTotal, 0),
      openReports: manageableChannels.reduce((sum, channel) => sum + channel.openReports, 0)
    },
    liveBlueprint: selectedChannel ? buildLiveBlueprint(selectedChannel, user) : null
  };
}

function buildAdminSummary(store) {
  const openReports = store.reports
    .filter((report) => report.status === 'open')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((report) => {
      const channel = findChannelById(store, report.channelId);
      const reporter = findUser(store, report.reporterUserId);

      return {
        ...report,
        channelName: channel?.name || 'Unknown channel',
        channelSlug: channel?.slug || '',
        reporterName: reporter?.name || 'Unknown user'
      };
    });

  const users = store.users.map((user) => {
    const activeBan = store.bans.find((ban) => ban.userId === user.id && ban.active !== false);
    return {
      ...sanitizeUser(user),
      activeBan
    };
  });

  const channels = store.channels.map((channel) => getChannelSummary(store, channel));
  const paidRevenue = store.donations
    .filter((donation) => donation.status === 'paid')
    .reduce((sum, donation) => sum + Number(donation.amount || 0), 0);

  return {
    metrics: {
      openReports: openReports.length,
      activeBans: store.bans.filter((ban) => ban.active !== false).length,
      liveChannels: channels.filter((channel) => channel.isLive).length,
      paidRevenue
    },
    reports: openReports,
    users,
    channels,
    auditLogs: store.auditLogs.slice(0, 12)
  };
}

function getCurrentViewer(store, req) {
  const user = getCurrentUser(store, req);
  return sanitizeUser(user);
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  try {
    if (pathname.startsWith('/static/') && req.method === 'GET') {
      serveStaticFile(res, config.publicDir, pathname);
      return;
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const store = readStore();
      const user = getCurrentUser(store, req);
      writeStore(store);
      sendJson(res, 200, buildAuthPayload(store, user));
      return;
    }

    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const store = readStore();
      const body = await readRequestBody(req);
      const user = registerUser(store, body);
      ensureCreatorChannel(store, user);
      const session = createSession(store, user.id);
      audit(store, user.id, 'auth.register', 'user', user.id, `Role: ${user.role}`);
      writeStore(store);
      sendJson(
        res,
        201,
        buildAuthPayload(store, user),
        { 'Set-Cookie': buildSessionCookie(session.id, session.expiresAt) }
      );
      return;
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const store = readStore();
      const body = await readRequestBody(req);
      const user = authenticateUser(store, body);
      const session = createSession(store, user.id);
      audit(store, user.id, 'auth.login', 'user', user.id, 'User signed in.');
      writeStore(store);
      sendJson(
        res,
        200,
        buildAuthPayload(store, user),
        { 'Set-Cookie': buildSessionCookie(session.id, session.expiresAt) }
      );
      return;
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const store = readStore();
      const user = getCurrentUser(store, req);
      destroySession(store, req);
      audit(store, user?.id || null, 'auth.logout', 'user', user?.id || 'anonymous', 'User signed out.');
      writeStore(store);
      sendJson(res, 200, { ok: true }, { 'Set-Cookie': buildClearedSessionCookie() });
      return;
    }

    if (pathname === '/api/channels' && req.method === 'GET') {
      const store = readStore();
      sendJson(res, 200, {
        channels: store.channels.map((channel) => getChannelSummary(store, channel)),
        providerStatus: getProviderStatus()
      });
      return;
    }

    if (pathname.startsWith('/api/channels/') && pathname.endsWith('/report') && req.method === 'POST') {
      const store = readStore();
      const user = getCurrentUser(store, req);
      if (!user) {
        unauthorized(res, 'Log in to send a moderation report.');
        return;
      }

      const channelId = pathname.replace('/api/channels/', '').replace('/report', '');
      const channel = findChannelById(store, channelId);
      if (!channel) {
        sendJson(res, 404, { error: 'Channel not found.' });
        return;
      }

      const body = await readRequestBody(req);
      const validationError = validateReportInput(body);
      if (validationError) {
        sendJson(res, 400, { error: validationError });
        return;
      }

      const report = {
        id: randomId('rep'),
        channelId,
        reporterUserId: user.id,
        reason: String(body.reason).trim(),
        detail: String(body.detail).trim(),
        status: 'open',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null,
        actionNotes: ''
      };

      store.reports.unshift(report);
      audit(store, user.id, 'report.created', 'channel', channelId, report.reason);
      writeStore(store);
      sendJson(res, 201, { report });
      return;
    }

    if (pathname.startsWith('/api/channels/') && req.method === 'GET') {
      const slug = pathname.replace('/api/channels/', '');
      const store = readStore();
      const channel = findChannelBySlug(store, slug);
      if (!channel) {
        sendJson(res, 404, { error: 'Channel not found.' });
        return;
      }

      sendJson(res, 200, {
        channel: getChannelSummary(store, channel),
        donations: getPaidDonations(store, channel.id)
          .sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))
          .slice(0, 8)
          .map((donation) => serializeDonation(store, donation)),
        providerStatus: getProviderStatus()
      });
      return;
    }

    if (pathname === '/api/payments/checkout' && req.method === 'POST') {
      const store = readStore();
      const user = getCurrentUser(store, req);
      if (!user) {
        unauthorized(res, 'Log in before starting a donation checkout.');
        return;
      }

      const body = await readRequestBody(req);
      const validationError = validateDonationInput(body);
      if (validationError) {
        sendJson(res, 400, { error: validationError });
        return;
      }

      const channel = findChannelById(store, body.channelId);
      if (!channel) {
        sendJson(res, 404, { error: 'Channel not found.' });
        return;
      }

      const donation = {
        id: randomId('don'),
        channelId: channel.id,
        userId: user.id,
        supporterName: user.name,
        amount: Number(body.amount),
        currency: 'usd',
        message: String(body.message || '').trim(),
        status: 'pending',
        paymentProvider: '',
        paymentSessionId: '',
        checkoutUrl: '',
        createdAt: new Date().toISOString(),
        paidAt: null
      };

      const checkout = await createDonationCheckout(req, donation, channel, user);
      donation.paymentProvider = checkout.provider;
      donation.paymentSessionId = checkout.paymentSessionId;
      donation.checkoutUrl = checkout.checkoutUrl;
      store.donations.unshift(donation);
      audit(store, user.id, 'payment.checkout.created', 'donation', donation.id, checkout.provider);
      writeStore(store);

      sendJson(res, 201, {
        donationId: donation.id,
        provider: checkout.provider,
        checkoutUrl: checkout.checkoutUrl,
        paymentSessionId: checkout.paymentSessionId
      });
      return;
    }

    if (pathname === '/api/payments/details' && req.method === 'GET') {
      const store = readStore();
      const user = getCurrentUser(store, req);
      if (!user) {
        unauthorized(res);
        return;
      }

      const donationId = requestUrl.searchParams.get('donationId');
      const donation = store.donations.find((candidate) => candidate.id === donationId);
      if (!donation) {
        sendJson(res, 404, { error: 'Donation not found.' });
        return;
      }

      if (donation.userId !== user.id && !hasRole(user, 'moderator')) {
        forbidden(res);
        return;
      }

      const channel = findChannelById(store, donation.channelId);
      sendJson(res, 200, {
        donation: serializeDonation(store, donation),
        channel: channel ? { id: channel.id, slug: channel.slug, name: channel.name } : null
      });
      return;
    }

    if (pathname === '/api/payments/status' && req.method === 'GET') {
      const store = readStore();
      const user = getCurrentUser(store, req);
      if (!user) {
        unauthorized(res);
        return;
      }

      const sessionId = requestUrl.searchParams.get('sessionId');
      const donationId = requestUrl.searchParams.get('donationId');
      const donation =
        store.donations.find((candidate) => candidate.paymentSessionId === sessionId) ||
        store.donations.find((candidate) => candidate.id === donationId);

      if (!donation) {
        sendJson(res, 404, { error: 'Donation not found.' });
        return;
      }

      if (donation.userId !== user.id && !hasRole(user, 'moderator')) {
        forbidden(res);
        return;
      }

      if (donation.paymentProvider === 'stripe' && donation.paymentSessionId && donation.status !== 'paid') {
        const stripeState = await retrieveStripeSessionStatus(donation.paymentSessionId);
        if (stripeState.status === 'complete' && stripeState.paymentStatus === 'paid') {
          finalizeDonationPaid(store, donation, stripeState);
          audit(store, user.id, 'payment.checkout.paid', 'donation', donation.id, 'Stripe session completed.');
          writeStore(store);
        }
      }

      sendJson(res, 200, { donation: serializeDonation(store, donation) });
      return;
    }

    if (pathname === '/api/payments/sandbox/confirm' && req.method === 'POST') {
      const store = readStore();
      const user = getCurrentUser(store, req);
      if (!user) {
        unauthorized(res);
        return;
      }

      const body = await readRequestBody(req);
      const donation = store.donations.find((candidate) => candidate.id === body.donationId);
      if (!donation) {
        sendJson(res, 404, { error: 'Donation not found.' });
        return;
      }

      if (donation.userId !== user.id && !hasRole(user, 'moderator')) {
        forbidden(res);
        return;
      }

      finalizeDonationPaid(store, donation, { provider: 'sandbox' });
      audit(store, user.id, 'payment.sandbox.confirmed', 'donation', donation.id, 'Sandbox checkout paid.');
      writeStore(store);
      sendJson(res, 200, { donation: serializeDonation(store, donation) });
      return;
    }

    if (pathname === '/api/studio/summary' && req.method === 'GET') {
      const store = readStore();
      const user = getCurrentUser(store, req);
      if (!user || !(user.role === 'creator' || hasRole(user, 'moderator'))) {
        unauthorized(res, 'Creator access is required for studio.');
        return;
      }

      sendJson(res, 200, buildStudioSummary(store, user, requestUrl.searchParams.get('channelId')));
      return;
    }

    if (pathname === '/api/studio/save' && req.method === 'POST') {
      const store = readStore();
      const user = getCurrentUser(store, req);
      if (!user || !(user.role === 'creator' || hasRole(user, 'moderator'))) {
        unauthorized(res, 'Creator access is required for studio.');
        return;
      }

      const body = await readRequestBody(req);
      const channel = findChannelById(store, String(body.channelId || ''));
      if (!channel) {
        sendJson(res, 404, { error: 'Channel not found.' });
        return;
      }

      if (!canManageChannel(user, channel)) {
        forbidden(res);
        return;
      }

      if (channel.moderation.state === 'suspended' && body.isLive) {
        sendJson(res, 400, { error: 'This channel is suspended and cannot go live.' });
        return;
      }

      channel.title = String(body.title || channel.title).trim().slice(0, 120) || channel.title;
      channel.category = String(body.category || channel.category).trim().slice(0, 40) || channel.category;
      channel.isLive = Boolean(body.isLive);
      channel.startedAt = channel.isLive ? channel.startedAt || new Date().toISOString() : null;
      channel.stream.playbackUrl = String(body.playbackUrl || '').trim().slice(0, 240);
      channel.stream.viewerJoinUrl = String(body.viewerJoinUrl || '').trim().slice(0, 240);
      channel.stream.ingressUrl = String(body.ingressUrl || channel.stream.ingressUrl).trim().slice(0, 240);
      channel.stream.streamKey = String(body.streamKey || channel.stream.streamKey).trim().slice(0, 120);
      audit(store, user.id, 'studio.channel.updated', 'channel', channel.id, channel.title);
      writeStore(store);

      sendJson(res, 200, buildStudioSummary(store, user, channel.id));
      return;
    }

    if (pathname === '/api/admin/summary' && req.method === 'GET') {
      const store = readStore();
      const user = getCurrentUser(store, req);
      if (!user || !hasRole(user, 'moderator')) {
        unauthorized(res, 'Moderator access is required for admin.');
        return;
      }

      sendJson(res, 200, buildAdminSummary(store));
      return;
    }

    if (pathname.startsWith('/api/admin/reports/') && pathname.endsWith('/resolve') && req.method === 'POST') {
      const store = readStore();
      const user = getCurrentUser(store, req);
      if (!user || !hasRole(user, 'moderator')) {
        unauthorized(res, 'Moderator access is required for admin.');
        return;
      }

      const reportId = pathname.replace('/api/admin/reports/', '').replace('/resolve', '');
      const report = store.reports.find((candidate) => candidate.id === reportId);
      if (!report) {
        sendJson(res, 404, { error: 'Report not found.' });
        return;
      }

      const body = await readRequestBody(req);
      const decision = String(body.decision || 'dismissed');
      report.status = decision === 'actioned' ? 'actioned' : 'dismissed';
      report.resolvedAt = new Date().toISOString();
      report.resolvedBy = user.id;
      report.actionNotes = String(body.actionNotes || '').trim().slice(0, 200);

      if (body.takeChannelOffline) {
        const channel = findChannelById(store, report.channelId);
        if (channel) {
          channel.isLive = false;
          channel.moderation.state = 'restricted';
        }
      }

      audit(store, user.id, 'admin.report.resolved', 'report', report.id, report.status);
      writeStore(store);
      sendJson(res, 200, buildAdminSummary(store));
      return;
    }

    if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/ban') && req.method === 'POST') {
      const store = readStore();
      const user = getCurrentUser(store, req);
      if (!user || !hasRole(user, 'moderator')) {
        unauthorized(res, 'Moderator access is required for admin.');
        return;
      }

      const userId = pathname.replace('/api/admin/users/', '').replace('/ban', '');
      const target = findUser(store, userId);
      if (!target) {
        sendJson(res, 404, { error: 'User not found.' });
        return;
      }

      const body = await readRequestBody(req);
      const days = Number(body.days || 7);
      const expiresAt = Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;

      store.bans.unshift({
        id: randomId('ban'),
        userId: target.id,
        reason: String(body.reason || 'Manual moderation ban').trim().slice(0, 160),
        scope: 'site',
        active: true,
        createdAt: new Date().toISOString(),
        expiresAt,
        createdBy: user.id
      });

      audit(store, user.id, 'admin.user.banned', 'user', target.id, body.reason || 'Manual ban');
      writeStore(store);
      sendJson(res, 200, buildAdminSummary(store));
      return;
    }

    if (pathname.startsWith('/api/admin/channels/') && pathname.endsWith('/takedown') && req.method === 'POST') {
      const store = readStore();
      const user = getCurrentUser(store, req);
      if (!user || !hasRole(user, 'moderator')) {
        unauthorized(res, 'Moderator access is required for admin.');
        return;
      }

      const channelId = pathname.replace('/api/admin/channels/', '').replace('/takedown', '');
      const channel = findChannelById(store, channelId);
      if (!channel) {
        sendJson(res, 404, { error: 'Channel not found.' });
        return;
      }

      const body = await readRequestBody(req);
      channel.isLive = false;
      channel.moderation.state = String(body.state || 'restricted');
      channel.moderation.lastReviewedAt = new Date().toISOString();
      audit(store, user.id, 'admin.channel.takedown', 'channel', channel.id, channel.moderation.state);
      writeStore(store);
      sendJson(res, 200, buildAdminSummary(store));
      return;
    }

    if (pathname === '/' && req.method === 'GET') {
      const store = readStore();
      sendHtml(res, 200, renderHomePage({ viewer: getCurrentViewer(store, req), providerStatus: getProviderStatus() }));
      return;
    }

    if (pathname === '/auth' && req.method === 'GET') {
      const store = readStore();
      sendHtml(
        res,
        200,
        renderAuthPage({ viewer: getCurrentViewer(store, req), next: requestUrl.searchParams.get('next') || '/' })
      );
      return;
    }

    if (pathname === '/studio' && req.method === 'GET') {
      const store = readStore();
      sendHtml(res, 200, renderStudioPage({ viewer: getCurrentViewer(store, req) }));
      return;
    }

    if (pathname === '/admin' && req.method === 'GET') {
      const store = readStore();
      sendHtml(res, 200, renderAdminPage({ viewer: getCurrentViewer(store, req) }));
      return;
    }

    if (pathname === '/checkout/sandbox' && req.method === 'GET') {
      const store = readStore();
      sendHtml(
        res,
        200,
        renderSandboxCheckoutPage({
          viewer: getCurrentViewer(store, req),
          donationId: requestUrl.searchParams.get('donationId') || ''
        })
      );
      return;
    }

    if (pathname.startsWith('/channel/') && req.method === 'GET') {
      const slug = pathname.replace('/channel/', '');
      const store = readStore();
      const channel = findChannelBySlug(store, slug);
      if (!channel) {
        notFound(res, getCurrentViewer(store, req));
        return;
      }

      sendHtml(res, 200, renderChannelPage({ viewer: getCurrentViewer(store, req), slug }));
      return;
    }

    const store = readStore();
    notFound(res, getCurrentViewer(store, req));
  } catch (error) {
    sendJson(res, 500, {
      error: 'NEXA hit an internal error.',
      detail: error.message
    });
  }
});

server.listen(config.port, () => {
  ensureStore();
  console.log(`NEXA running at http://localhost:${config.port}`);
});
