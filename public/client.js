const state = {
  viewer: window.__NEXA__?.viewer || null
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value) {
  return currency.format(Number(value || 0));
}

function formatCompact(value) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number(value || 0));
}

function timeAgo(value) {
  const then = new Date(value).getTime();
  const now = Date.now();
  const diffMinutes = Math.max(1, Math.floor((now - then) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.floor(diffHours / 24)}d ago`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload;
}

function redirectToAuth() {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.href = `/auth?next=${encodeURIComponent(next)}`;
}

function bindLogout() {
  const button = document.querySelector('#logoutButton');
  if (!button) {
    return;
  }

  button.addEventListener('click', async () => {
    await requestJson('/api/auth/logout', { method: 'POST', body: '{}' });
    window.location.href = '/';
  });
}

function channelCard(channel) {
  const tags = (channel.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  const owner = channel.owner ? escapeHtml(channel.owner.name) : 'Unknown owner';

  return `<article class="channel-card reveal" style="--card-accent:${escapeHtml(channel.accent)}; --card-surface:${escapeHtml(channel.surface)};">
    <div class="channel-cover">
      <div class="channel-badge ${channel.isLive ? 'is-live' : ''}">${channel.isLive ? 'Live now' : 'Offline'}</div>
      <div class="channel-avatar">${escapeHtml(channel.initials)}</div>
      <div class="channel-meta">
        <strong>${escapeHtml(channel.name)}</strong>
        <small>${escapeHtml(channel.category)}</small>
      </div>
    </div>
    <div class="channel-body">
      <h3>${escapeHtml(channel.title)}</h3>
      <p>${escapeHtml(channel.description)}</p>
      <div class="tag-row">${tags}</div>
      <div class="channel-stats">
        <span>${formatCompact(channel.viewers)} viewers</span>
        <span>${formatCurrency(channel.donationTotal)} paid</span>
      </div>
      <p class="micro-copy">Owner: ${owner} · Reports: ${channel.openReports}</p>
    </div>
    <a class="button button-ghost" href="/channel/${encodeURIComponent(channel.slug)}">Open channel</a>
  </article>`;
}

function donationRow(donation) {
  return `<article class="donation-row">
    <div class="donation-main">
      <strong>${escapeHtml(donation.supporterName)}</strong>
      <span>${formatCurrency(donation.amount)}</span>
    </div>
    <p>${escapeHtml(donation.message || 'Paid support without a note.')}</p>
    <small>${timeAgo(donation.paidAt || donation.createdAt)}</small>
  </article>`;
}

function metricCard(label, value) {
  return `<article class="metric-card">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
  </article>`;
}

async function loadHomePage() {
  const payload = await requestJson('/api/channels');
  const featuredGrid = document.querySelector('#featuredGrid');

  if (featuredGrid) {
    featuredGrid.innerHTML = payload.channels.map(channelCard).join('');
  }
}

function renderPlayerMedia(channel) {
  const playbackUrl = channel.stream?.playbackUrl || '';
  const viewerJoinUrl = channel.stream?.viewerJoinUrl || '';

  if (/\.(mp4|webm|ogg)$/i.test(playbackUrl)) {
    return `<video class="player-video" controls playsinline src="${escapeHtml(playbackUrl)}"></video>`;
  }

  if (playbackUrl) {
    return `<div class="player-placeholder">
      <strong>Playback endpoint configured</strong>
      <p>Use the external playback URL or replace it with a direct media source for inline video playback.</p>
      <a class="button button-ghost" href="${escapeHtml(playbackUrl)}" target="_blank" rel="noreferrer">Open playback URL</a>
    </div>`;
  }

  if (viewerJoinUrl) {
    return `<div class="player-placeholder">
      <strong>Viewer room ready</strong>
      <p>The creator has configured a live room join link for an external playback client.</p>
      <a class="button button-ghost" href="${escapeHtml(viewerJoinUrl)}" target="_blank" rel="noreferrer">Open viewer room</a>
    </div>`;
  }

  return `<div class="player-placeholder">
    <strong>Waiting for a live signal</strong>
    <p>Set a playback URL or viewer join URL in Studio to turn this into a real watch experience.</p>
  </div>`;
}

function renderChannelPlayer(channel) {
  return `<div class="player-shell" style="--channel-accent:${escapeHtml(channel.accent)}; --channel-surface:${escapeHtml(channel.surface)};">
    <div class="player-stage">
      <div class="player-art">${renderPlayerMedia(channel)}</div>
      <div class="player-overlay">
        <span class="live-pill ${channel.isLive ? '' : 'is-offline'}">${channel.isLive ? 'LIVE' : 'OFFLINE'}</span>
        <strong>${escapeHtml(channel.title)}</strong>
        <small>${escapeHtml(channel.name)} ${escapeHtml(channel.handle)}</small>
      </div>
    </div>
    <div class="player-stats">
      <div>
        <span>Viewers</span>
        <strong>${formatCompact(channel.viewers)}</strong>
      </div>
      <div>
        <span>Followers</span>
        <strong>${formatCompact(channel.followers)}</strong>
      </div>
      <div>
        <span>Paid donations</span>
        <strong>${formatCurrency(channel.donationTotal)}</strong>
      </div>
    </div>
  </div>`;
}

function renderChannelAbout(channel) {
  const tags = (channel.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  const moderationState = channel.moderation?.state || 'approved';
  const provider = channel.stream?.provider || 'manual';
  const owner = channel.owner?.name || 'Unknown owner';

  return `<div class="section-head compact">
    <div>
      <span class="eyebrow">Channel profile</span>
      <h2>${escapeHtml(channel.name)}</h2>
    </div>
  </div>
  <p class="channel-description">${escapeHtml(channel.description)}</p>
  <div class="tag-row">${tags}</div>
  <div class="info-grid">
    <div>
      <span>Owner</span>
      <strong>${escapeHtml(owner)}</strong>
    </div>
    <div>
      <span>Stream provider</span>
      <strong>${escapeHtml(provider)}</strong>
    </div>
    <div>
      <span>Moderation state</span>
      <strong>${escapeHtml(moderationState)}</strong>
    </div>
  </div>`;
}

function updateDonationFeed(donations) {
  const feed = document.querySelector('#donationFeed');
  if (!feed) {
    return;
  }

  feed.innerHTML = donations.length
    ? donations.map(donationRow).join('')
    : '<p class="empty-copy">No paid donations yet.</p>';
}

function chatRow(message) {
  const author = message.user?.name || 'Unknown user';
  const role = message.user?.role || 'viewer';

  return `<article class="chat-row" data-chat-id="${escapeHtml(message.id)}">
    <div class="chat-head">
      <strong>${escapeHtml(author)}</strong>
      <small>${escapeHtml(role)} · ${timeAgo(message.createdAt)}</small>
    </div>
    <p>${escapeHtml(message.body)}</p>
  </article>`;
}

function updateChatFeed(messages) {
  const feed = document.querySelector('#chatFeed');
  if (!feed) {
    return;
  }

  feed.innerHTML = messages.length
    ? messages.map(chatRow).join('')
    : '<p class="empty-copy">Chat is quiet right now.</p>';
  feed.scrollTop = feed.scrollHeight;
}

function startChatStream(channelId) {
  const feed = document.querySelector('#chatFeed');
  if (!feed) {
    return;
  }

  const source = new EventSource(`/api/chat/stream?channelId=${encodeURIComponent(channelId)}`);

  source.addEventListener('bootstrap', (event) => {
    const payload = JSON.parse(event.data);
    updateChatFeed(payload.messages || []);
  });

  source.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data);
    const current = Array.from(feed.querySelectorAll('.chat-row')).map((node) => node.outerHTML);
    current.push(chatRow(payload));
    feed.innerHTML = current.slice(-60).join('');
    feed.scrollTop = feed.scrollHeight;
  });

  source.addEventListener('moderation', (event) => {
    const payload = JSON.parse(event.data);
    const row = feed.querySelector(`[data-chat-id="${payload.id}"]`);
    if (row) {
      row.remove();
    }
  });
}

async function handleCheckoutReturn(statusNode) {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  const checkoutState = params.get('checkout');

  if (sessionId && state.viewer) {
    statusNode.textContent = 'Checking payment status...';
    const result = await requestJson(`/api/payments/status?sessionId=${encodeURIComponent(sessionId)}`);
    if (result.donation.status === 'paid') {
      statusNode.textContent = `Payment confirmed: ${formatCurrency(result.donation.amount)} is now on the supporter wall.`;
    }
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }

  if (checkoutState === 'cancelled') {
    statusNode.textContent = 'Checkout was cancelled before payment completed.';
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }

  if (checkoutState === 'sandbox_paid') {
    statusNode.textContent = 'Sandbox payment marked as paid.';
    window.history.replaceState({}, '', window.location.pathname);
  }
}

async function loadChannelPage() {
  const slug = window.__NEXA__?.slug;
  const payload = await requestJson(`/api/channels/${encodeURIComponent(slug)}`);
  const player = document.querySelector('#channelPlayer');
  const about = document.querySelector('#channelAbout');
  const donationForm = document.querySelector('#donationForm');
  const donationStatus = document.querySelector('#donationStatus');
  const reportForm = document.querySelector('#reportForm');
  const reportStatus = document.querySelector('#reportStatus');
  const chatForm = document.querySelector('#chatForm');
  const chatStatus = document.querySelector('#chatStatus');

  if (player) player.innerHTML = renderChannelPlayer(payload.channel);
  if (about) about.innerHTML = renderChannelAbout(payload.channel);
  updateDonationFeed(payload.donations);
  updateChatFeed(payload.chat || []);
  startChatStream(payload.channel.id);

  if (donationStatus) {
    if (state.viewer) {
      donationStatus.textContent = `Signed in as ${state.viewer.name}. Payment mode: ${payload.providerStatus.payments.mode}.`;
      await handleCheckoutReturn(donationStatus);
    } else {
      donationStatus.textContent = 'Log in first to create a tracked donation checkout.';
    }
  }

  if (donationForm) {
    donationForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!state.viewer) {
        redirectToAuth();
        return;
      }

      const formData = new FormData(donationForm);
      donationStatus.textContent = 'Creating checkout session...';
      try {
        const result = await requestJson('/api/payments/checkout', {
          method: 'POST',
          body: JSON.stringify({
            channelId: payload.channel.id,
            amount: Number(formData.get('amount')),
            message: String(formData.get('message') || '')
          })
        });

        donationStatus.textContent = 'Redirecting to payment...';
        window.location.href = result.checkoutUrl;
      } catch (error) {
        donationStatus.textContent = error.message;
      }
    });
  }

  if (reportForm) {
    reportForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!state.viewer) {
        redirectToAuth();
        return;
      }

      const formData = new FormData(reportForm);
      reportStatus.textContent = 'Submitting report...';

      try {
        await requestJson(`/api/channels/${encodeURIComponent(payload.channel.id)}/report`, {
          method: 'POST',
          body: JSON.stringify({
            reason: formData.get('reason'),
            detail: formData.get('detail')
          })
        });

        reportStatus.textContent = 'Report submitted to the moderation queue.';
        reportForm.reset();
      } catch (error) {
        reportStatus.textContent = error.message;
      }
    });
  }

  if (chatStatus) {
    chatStatus.textContent = state.viewer
      ? `Signed in as ${state.viewer.name}. Messages appear in real time.`
      : 'Log in to join the live chat room.';
  }

  if (chatForm) {
    chatForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!state.viewer) {
        redirectToAuth();
        return;
      }

      const formData = new FormData(chatForm);
      chatStatus.textContent = 'Sending message...';

      try {
        await requestJson('/api/chat/messages', {
          method: 'POST',
          body: JSON.stringify({
            channelId: payload.channel.id,
            body: formData.get('body')
          })
        });

        chatForm.reset();
        chatStatus.textContent = 'Message sent.';
      } catch (error) {
        chatStatus.textContent = error.message;
      }
    });
  }
}

function renderStudioSummary(summary) {
  const metricsNode = document.querySelector('#studioMetrics');
  const channelSelect = document.querySelector('#studioChannel');
  const titleInput = document.querySelector('#studioTitle');
  const categoryInput = document.querySelector('#studioCategory');
  const playbackInput = document.querySelector('#studioPlaybackUrl');
  const viewerJoinInput = document.querySelector('#studioViewerJoinUrl');
  const ingressInput = document.querySelector('#studioIngressUrl');
  const streamKeyInput = document.querySelector('#studioStreamKey');
  const liveInput = document.querySelector('#studioLive');
  const blueprintNode = document.querySelector('#liveBlueprint');
  const tokenNode = document.querySelector('#tokenPanel');

  if (metricsNode) {
    metricsNode.innerHTML = [
      metricCard('Channels', String(summary.metrics.accessibleChannels)),
      metricCard('Live now', String(summary.metrics.liveChannels)),
      metricCard('Revenue', formatCurrency(summary.metrics.revenueTracked)),
      metricCard('Open reports', String(summary.metrics.openReports))
    ].join('');
  }

  if (channelSelect) {
    channelSelect.innerHTML = summary.channels
      .map(
        (channel) =>
          `<option value="${escapeHtml(channel.id)}" ${channel.id === summary.selectedChannel?.id ? 'selected' : ''}>
            ${escapeHtml(channel.name)}
          </option>`
      )
      .join('');
  }

  if (summary.selectedChannel) {
    if (titleInput) titleInput.value = summary.selectedChannel.title;
    if (categoryInput) categoryInput.value = summary.selectedChannel.category;
    if (playbackInput) playbackInput.value = summary.selectedChannel.stream?.playbackUrl || '';
    if (viewerJoinInput) viewerJoinInput.value = summary.selectedChannel.stream?.viewerJoinUrl || '';
    if (ingressInput) ingressInput.value = summary.selectedChannel.stream?.ingressUrl || '';
    if (streamKeyInput) streamKeyInput.value = summary.selectedChannel.stream?.streamKey || '';
    if (liveInput) liveInput.checked = Boolean(summary.selectedChannel.isLive);
  }

  if (blueprintNode && summary.liveBlueprint) {
    blueprintNode.innerHTML = [
      metricCard('Provider', summary.liveBlueprint.provider),
      metricCard('Room', summary.liveBlueprint.roomName),
      metricCard('Ingest', summary.liveBlueprint.ingressUrl || 'Not set'),
      metricCard('Playback', summary.liveBlueprint.playbackUrl || 'Not set')
    ].join('');
  }

  if (tokenNode && summary.liveBlueprint) {
    tokenNode.innerHTML = `
      <div class="token-box">
        <span>Publisher token</span>
        <textarea readonly rows="5">${summary.liveBlueprint.publisherToken || 'Enable LiveKit credentials to generate publisher tokens.'}</textarea>
      </div>
      <div class="token-box">
        <span>Viewer token</span>
        <textarea readonly rows="5">${summary.liveBlueprint.viewerToken || 'Enable LiveKit credentials to generate viewer tokens.'}</textarea>
      </div>
      <div class="token-box">
        <span>OBS preset</span>
        <textarea readonly rows="4">Service: ${summary.liveBlueprint.obsPreset.service}
Server: ${summary.liveBlueprint.obsPreset.server}
Stream Key: ${summary.liveBlueprint.obsPreset.streamKey}</textarea>
      </div>`;
  }
}

async function loadStudioPage() {
  const statusNode = document.querySelector('#studioStatus');
  const channelSelect = document.querySelector('#studioChannel');
  const form = document.querySelector('#studioForm');

  if (!statusNode || !form) {
    return;
  }

  let summary = await requestJson('/api/studio/summary');
  renderStudioSummary(summary);

  if (channelSelect) {
    channelSelect.addEventListener('change', async () => {
      summary = await requestJson(`/api/studio/summary?channelId=${encodeURIComponent(channelSelect.value)}`);
      renderStudioSummary(summary);
      statusNode.textContent = 'Loaded channel settings.';
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    statusNode.textContent = 'Saving channel settings...';

    try {
      summary = await requestJson('/api/studio/save', {
        method: 'POST',
        body: JSON.stringify({
          channelId: formData.get('channelId'),
          title: formData.get('title'),
          category: formData.get('category'),
          playbackUrl: formData.get('playbackUrl'),
          viewerJoinUrl: formData.get('viewerJoinUrl'),
          ingressUrl: formData.get('ingressUrl'),
          streamKey: formData.get('streamKey'),
          isLive: formData.get('isLive') === 'on'
        })
      });

      renderStudioSummary(summary);
      statusNode.textContent = 'Studio updated successfully.';
    } catch (error) {
      statusNode.textContent = error.message;
    }
  });
}

function reportCard(report) {
  return `<article class="moderation-card">
    <div class="moderation-head">
      <strong>${escapeHtml(report.channelName)}</strong>
      <small>${escapeHtml(report.reason)}</small>
    </div>
    <p>${escapeHtml(report.detail)}</p>
    <small>Reporter: ${escapeHtml(report.reporterName)} · ${timeAgo(report.createdAt)}</small>
    <div class="action-row">
      <button class="button button-ghost" type="button" data-report-id="${escapeHtml(report.id)}" data-decision="dismissed">Dismiss</button>
      <button class="button" type="button" data-report-id="${escapeHtml(report.id)}" data-decision="actioned" data-offline="1">Action + Take Offline</button>
    </div>
  </article>`;
}

function userCard(user) {
  const banLabel = user.activeBan ? `Banned: ${escapeHtml(user.activeBan.reason)}` : 'No active ban';

  return `<article class="moderation-card">
    <div class="moderation-head">
      <strong>${escapeHtml(user.name)}</strong>
      <small>${escapeHtml(user.role)}</small>
    </div>
    <p>${escapeHtml(user.email)}</p>
    <small>${banLabel}</small>
    <div class="action-row">
      <button class="button button-ghost" type="button" data-ban-user-id="${escapeHtml(user.id)}">Ban 7 days</button>
    </div>
  </article>`;
}

function channelModerationCard(channel) {
  return `<article class="moderation-card">
    <div class="moderation-head">
      <strong>${escapeHtml(channel.name)}</strong>
      <small>${escapeHtml(channel.moderation?.state || 'approved')}</small>
    </div>
    <p>${escapeHtml(channel.title)}</p>
    <small>${channel.isLive ? 'Live now' : 'Offline'} · ${formatCurrency(channel.donationTotal)} paid</small>
    <div class="action-row">
      <button class="button button-ghost" type="button" data-takedown-channel-id="${escapeHtml(channel.id)}">Restrict channel</button>
    </div>
  </article>`;
}

function recentChatCard(message) {
  const author = message.user?.name || 'Unknown user';
  return `<article class="moderation-card">
    <div class="moderation-head">
      <strong>${escapeHtml(author)}</strong>
      <small>${timeAgo(message.createdAt)}</small>
    </div>
    <p>${escapeHtml(message.body)}</p>
    <small>${escapeHtml(message.channelId)}</small>
    <div class="action-row">
      <button class="button button-ghost" type="button" data-hide-chat-id="${escapeHtml(message.id)}">Hide message</button>
    </div>
  </article>`;
}

function renderAdminSummary(summary) {
  const metricsNode = document.querySelector('#adminMetrics');
  const reportQueue = document.querySelector('#reportQueue');
  const userModeration = document.querySelector('#userModeration');
  const recentChats = document.querySelector('#recentChats');

  if (metricsNode) {
    metricsNode.innerHTML = [
      metricCard('Open reports', String(summary.metrics.openReports)),
      metricCard('Active bans', String(summary.metrics.activeBans)),
      metricCard('Live channels', String(summary.metrics.liveChannels)),
      metricCard('Paid revenue', formatCurrency(summary.metrics.paidRevenue)),
      metricCard('Chat messages', String(summary.metrics.chatMessages))
    ].join('');
  }

  if (reportQueue) {
    reportQueue.innerHTML = summary.reports.length
      ? summary.reports.map(reportCard).join('')
      : '<p class="empty-copy">No open reports right now.</p>';
  }

  if (userModeration) {
    userModeration.innerHTML = `
      <h3>Users</h3>
      <div class="report-queue">${summary.users.map(userCard).join('')}</div>
      <h3>Channels</h3>
      <div class="report-queue">${summary.channels.map(channelModerationCard).join('')}</div>
    `;
  }

  if (recentChats) {
    recentChats.innerHTML = summary.recentChats.length
      ? summary.recentChats.map(recentChatCard).join('')
      : '<p class="empty-copy">No recent chat messages.</p>';
  }
}

async function loadAdminPage() {
  const summary = await requestJson('/api/admin/summary');
  renderAdminSummary(summary);

  const reportQueue = document.querySelector('#reportQueue');
  const userModeration = document.querySelector('#userModeration');
  const recentChats = document.querySelector('#recentChats');

  if (reportQueue) {
    reportQueue.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-report-id]');
      if (!button) {
        return;
      }

      const actionNotes = window.prompt('Add moderation notes', 'Reviewed in admin console') || '';
      const nextSummary = await requestJson(`/api/admin/reports/${button.dataset.reportId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          decision: button.dataset.decision,
          takeChannelOffline: button.dataset.offline === '1',
          actionNotes
        })
      });

      renderAdminSummary(nextSummary);
    });
  }

  if (userModeration) {
    userModeration.addEventListener('click', async (event) => {
      const banButton = event.target.closest('[data-ban-user-id]');
      if (banButton) {
        const reason = window.prompt('Ban reason', 'Policy violation') || 'Policy violation';
        const nextSummary = await requestJson(`/api/admin/users/${banButton.dataset.banUserId}/ban`, {
          method: 'POST',
          body: JSON.stringify({ reason, days: 7 })
        });
        renderAdminSummary(nextSummary);
        return;
      }

      const takeDownButton = event.target.closest('[data-takedown-channel-id]');
      if (takeDownButton) {
        const nextSummary = await requestJson(`/api/admin/channels/${takeDownButton.dataset.takedownChannelId}/takedown`, {
          method: 'POST',
          body: JSON.stringify({ state: 'restricted' })
        });
        renderAdminSummary(nextSummary);
      }
    });
  }

  if (recentChats) {
    recentChats.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-hide-chat-id]');
      if (!button) {
        return;
      }

      const nextSummary = await requestJson(`/api/admin/chat/${button.dataset.hideChatId}/hide`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      renderAdminSummary(nextSummary);
    });
  }
}

async function loadAuthPage() {
  const loginForm = document.querySelector('#loginForm');
  const registerForm = document.querySelector('#registerForm');
  const next = window.__NEXA__?.next || '/';

  if (loginForm) {
    const loginStatus = document.querySelector('#loginStatus');
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      loginStatus.textContent = 'Signing in...';

      try {
        await requestJson('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: formData.get('email'),
            password: formData.get('password')
          })
        });

        window.location.href = next || '/';
      } catch (error) {
        loginStatus.textContent = error.message;
      }
    });
  }

  if (registerForm) {
    const registerStatus = document.querySelector('#registerStatus');
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(registerForm);
      registerStatus.textContent = 'Creating account...';

      try {
        await requestJson('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            role: formData.get('role')
          })
        });

        window.location.href = next || '/';
      } catch (error) {
        registerStatus.textContent = error.message;
      }
    });
  }
}

async function loadSandboxCheckoutPage() {
  const donationId = window.__NEXA__?.donationId;
  const summaryNode = document.querySelector('#checkoutSummary');
  const statusNode = document.querySelector('#checkoutStatus');
  const confirmButton = document.querySelector('#sandboxConfirmButton');

  if (!donationId || !summaryNode || !confirmButton || !statusNode) {
    return;
  }

  if (!state.viewer) {
    redirectToAuth();
    return;
  }

  const payload = await requestJson(`/api/payments/details?donationId=${encodeURIComponent(donationId)}`);
  summaryNode.innerHTML = `
    <label>
      <span>Channel</span>
      <input type="text" value="${escapeHtml(payload.channel?.name || 'Unknown')}" readonly />
    </label>
    <label>
      <span>Amount</span>
      <input type="text" value="${escapeHtml(formatCurrency(payload.donation.amount))}" readonly />
    </label>
    <label>
      <span>Message</span>
      <textarea readonly rows="4">${payload.donation.message || ''}</textarea>
    </label>`;

  confirmButton.addEventListener('click', async () => {
    statusNode.textContent = 'Confirming sandbox payment...';
    try {
      await requestJson('/api/payments/sandbox/confirm', {
        method: 'POST',
        body: JSON.stringify({ donationId })
      });

      window.location.href = `/channel/${encodeURIComponent(payload.channel.slug)}?checkout=sandbox_paid`;
    } catch (error) {
      statusNode.textContent = error.message;
    }
  });
}

async function boot() {
  bindLogout();
  const page = document.body.dataset.page;

  if (page === 'home') {
    await loadHomePage();
  }

  if (page === 'auth') {
    await loadAuthPage();
  }

  if (page === 'channel') {
    await loadChannelPage();
  }

  if (page === 'studio') {
    await loadStudioPage();
  }

  if (page === 'admin') {
    await loadAdminPage();
  }

  if (page === 'sandbox-checkout') {
    await loadSandboxCheckoutPage();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  boot().catch((error) => {
    const statusNode =
      document.querySelector('#loginStatus') ||
      document.querySelector('#registerStatus') ||
      document.querySelector('#donationStatus') ||
      document.querySelector('#studioStatus') ||
      document.querySelector('#checkoutStatus');

    if (statusNode) {
      statusNode.textContent = error.message;
    }
  });
});
