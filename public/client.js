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
  const tags = (channel.tags || []).slice(0, 3).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  const initials = escapeHtml(channel.initials || channel.name?.[0] || 'N');
  const isLive = channel.isLive;

  return `<a class="channel-card" href="/channel/${encodeURIComponent(channel.slug)}" style="--card-accent:${escapeHtml(channel.accent)};--card-surface:${escapeHtml(channel.surface)};">
    <div class="channel-thumb">
      <div class="channel-thumb-bg">
        <div class="channel-thumb-avatar">${initials}</div>
      </div>
      <div class="channel-thumb-overlay">
        ${isLive
          ? `<span class="live-badge">LIVE</span><span class="viewer-chip">👁 ${formatCompact(channel.viewers)}</span>`
          : `<span class="offline-badge">OFFLINE</span>`}
      </div>
    </div>
    <div class="channel-body">
      <div class="channel-body-top">
        <div class="channel-body-avatar">${initials}</div>
        <div class="channel-body-info">
          <div class="channel-title">${escapeHtml(channel.title)}</div>
          <div class="channel-name">${escapeHtml(channel.name)}</div>
        </div>
      </div>
      <span class="channel-category">${escapeHtml(channel.category)}</span>
      <div class="tag-row">${tags}</div>
    </div>
  </a>`;
}

function donationRow(donation) {
  return `<article class="donation-row">
    <div class="donation-main">
      <strong>${escapeHtml(donation.supporterName)}</strong>
      <span>${formatCurrency(donation.amount)}</span>
    </div>
    <p>${escapeHtml(donation.message || 'Тэмдэглэлгүй дэмжлэг.')}</p>
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
  const homeViewers = document.querySelector('#homeViewers');
  const homeLive = document.querySelector('#homeLiveChannels');
  const homeRevenue = document.querySelector('#homeRevenue');

  if (featuredGrid) {
    featuredGrid.innerHTML = payload.channels.length
      ? payload.channels.map(channelCard).join('')
      : '<p class="form-note" style="padding:20px">Суваг байхгүй байна.</p>';
  }

  // Wire category filter buttons
  bindCategoryFilter(payload.channels);

  // Update hero stats
  const totalViewers = payload.channels.reduce((s, c) => s + Number(c.viewers || 0), 0);
  const liveCount    = payload.channels.filter((c) => c.isLive).length;
  const totalRevenue = payload.channels.reduce((s, c) => s + Number(c.donationTotal || 0), 0);

  if (homeViewers) homeViewers.textContent = formatCompact(totalViewers);
  if (homeLive)    homeLive.textContent    = String(liveCount);
  if (homeRevenue) homeRevenue.textContent = formatCurrency(totalRevenue);
}

function renderPlayerMedia(channel) {
  const playbackUrl = channel.stream?.playbackUrl || '';
  const viewerJoinUrl = channel.stream?.viewerJoinUrl || '';

  if (/\.(mp4|webm|ogg)$/i.test(playbackUrl)) {
    return `<video class="player-video" controls playsinline src="${escapeHtml(playbackUrl)}"></video>`;
  }

  if (playbackUrl) {
    return `<div class="player-placeholder">
      <strong>Тоглуулах URL тохируулагдсан</strong>
      <p>Гадны тоглуулах URL ашиглаарай эсвэл шууд медиа эх сурвалж нэмэрэй.</p>
      <a class="button button-ghost" href="${escapeHtml(playbackUrl)}" target="_blank" rel="noreferrer">Тоглуулах URL нээх</a>
    </div>`;
  }

  if (viewerJoinUrl) {
    return `<div class="player-placeholder">
      <strong>Үзэгчийн өрөө бэлэн байна</strong>
      <p>Бүтээгч үзэгчийн холболтын линк тохируулсан байна.</p>
      <a class="button button-ghost" href="${escapeHtml(viewerJoinUrl)}" target="_blank" rel="noreferrer">Үзэгчийн өрөө нээх</a>
    </div>`;
  }

  return `<div class="player-placeholder">
    <strong>Шууд дамжуулалт хүлээж байна</strong>
    <p>Студид тоглуулах URL эсвэл үзэгчийн холболтын URL нэмнэ үү.</p>
  </div>`;
}

function renderChannelPlayer(channel) {
  const initials = channel.initials || channel.name?.[0] || 'N';

  // Update surrounding elements if they exist
  const avatarEl  = document.querySelector('#playerAvatar');
  const titleEl   = document.querySelector('#playerTitle');
  const nameEl    = document.querySelector('#playerChannelName');
  const viewersEl = document.querySelector('#statViewers');
  const followEl  = document.querySelector('#statFollowers');
  const catEl     = document.querySelector('#statCategory');
  const statusEl  = document.querySelector('#statStatus');
  const tagsEl    = document.querySelector('#playerTags');

  if (avatarEl)  { avatarEl.textContent = initials; avatarEl.style.color = channel.accent || 'var(--green)'; }
  if (titleEl)   titleEl.textContent  = channel.title;
  if (nameEl)    nameEl.textContent   = channel.handle || channel.name;
  if (viewersEl) viewersEl.textContent = formatCompact(channel.viewers);
  if (followEl)  followEl.textContent  = formatCompact(channel.followers);
  if (catEl)     catEl.textContent     = channel.category;
  if (statusEl)  statusEl.innerHTML    = channel.isLive
    ? '<span class="live-badge">LIVE</span>'
    : '<span class="offline-badge">OFFLINE</span>';
  if (tagsEl) {
    tagsEl.innerHTML = (channel.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  }

  // Return inner player HTML
  return `<div style="--channel-surface:${escapeHtml(channel.surface || '#0d1f0a')}; width:100%; height:100%;">
    <div class="player-art">${renderPlayerMedia(channel)}</div>
  </div>`;
}

function renderChannelAbout(channel) {
  const moderationState = channel.moderation?.state || 'approved';
  const provider = channel.stream?.provider || 'manual';
  const owner = channel.owner?.name || 'Эзэмшигч тодорхойгүй';

  return `<div class="section-head compact">
    <div>
      <span class="eyebrow">About</span>
      <h2>${escapeHtml(channel.name)}</h2>
    </div>
  </div>
  <p style="color:var(--text-2);font-size:13px;line-height:1.65;margin-bottom:14px">${escapeHtml(channel.description)}</p>
  <div class="info-grid" style="grid-template-columns:repeat(3,1fr)">
    <div>
      <span>Эзэмшигч</span>
      <strong>${escapeHtml(owner)}</strong>
    </div>
    <div>
      <span>Үйлчлэгч</span>
      <strong>${escapeHtml(provider)}</strong>
    </div>
    <div>
      <span>Модерация</span>
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
    : '<p class="empty-copy">Хандив байхгүй байна.</p>';
}

function chatRow(message) {
  const author = message.user?.name || 'Тодорхойгүй хэрэглэгч';
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
    : '<p class="empty-copy">Чат одоохондоо хоосон байна.</p>';
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
    statusNode.textContent = 'Төлбөрийн байдал шалгаж байна...';
    const result = await requestJson(`/api/payments/status?sessionId=${encodeURIComponent(sessionId)}`);
    if (result.donation.status === 'paid') {
      statusNode.textContent = `Төлбөр баталгаажлаа: ${formatCurrency(result.donation.amount)} дэмжигчдийн жагсаалтад нэмэгдлээ.`;
    }
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }

  if (checkoutState === 'cancelled') {
    statusNode.textContent = 'Төлбөр хийгдээгүй, checkout цуцлагдлаа.';
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }

  if (checkoutState === 'sandbox_paid') {
    statusNode.textContent = 'Туршилтын төлбөр баталгаажлаа.';
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

  // Apply channel colour theme to page
  document.body.style.setProperty('--channel-surface', payload.channel.surface || '#0d1f0a');

  if (player) player.innerHTML = renderChannelPlayer(payload.channel);
  if (about) about.innerHTML = renderChannelAbout(payload.channel);
  updateDonationFeed(payload.donations);
  updateChatFeed(payload.chat || []);
  startChatStream(payload.channel.id);

  // Update chat online count
  const countEl = document.querySelector('#chatOnlineCount');
  if (countEl) countEl.textContent = formatCompact(payload.channel.viewers || 0);

  if (donationStatus) {
    if (state.viewer) {
      donationStatus.textContent = `Нэвтэрсэн: ${state.viewer.name}. Төлбөрийн горим: ${payload.providerStatus.payments.mode}.`;
      await handleCheckoutReturn(donationStatus);
    } else {
      donationStatus.textContent = 'Хандив хийхийн тулд нэвтрэнэ үү.';
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
      donationStatus.textContent = 'Checkout үүсгэж байна...';
      try {
        const result = await requestJson('/api/payments/checkout', {
          method: 'POST',
          body: JSON.stringify({
            channelId: payload.channel.id,
            amount: Number(formData.get('amount')),
            message: String(formData.get('message') || '')
          })
        });

        donationStatus.textContent = 'Төлбөр рүү шилжиж байна...';
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
      reportStatus.textContent = 'Мэдүүлэг илгээж байна...';

      try {
        await requestJson(`/api/channels/${encodeURIComponent(payload.channel.id)}/report`, {
          method: 'POST',
          body: JSON.stringify({
            reason: formData.get('reason'),
            detail: formData.get('detail')
          })
        });

        reportStatus.textContent = 'Мэдүүлэг дамжуулагдлаа.';
        reportForm.reset();
      } catch (error) {
        reportStatus.textContent = error.message;
      }
    });
  }

  if (chatStatus) {
    chatStatus.textContent = state.viewer
      ? `Нэвтэрсэн: ${state.viewer.name}. Мессежүүд бодит цагт харагдана.`
      : 'Чатад орохын тулд нэвтрэнэ үү.';
  }

  if (chatForm) {
    chatForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!state.viewer) {
        redirectToAuth();
        return;
      }

      const formData = new FormData(chatForm);
      chatStatus.textContent = 'Мессеж илгээж байна...';

      try {
        await requestJson('/api/chat/messages', {
          method: 'POST',
          body: JSON.stringify({
            channelId: payload.channel.id,
            body: formData.get('body')
          })
        });

        chatForm.reset();
        chatStatus.textContent = 'Мессеж илгээгдлээ.';
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
    const metNodes = {
      metAccessible: String(summary.metrics.accessibleChannels),
      metLive:       String(summary.metrics.liveChannels),
      metRevenue:    formatCurrency(summary.metrics.revenueTracked),
      metReports:    String(summary.metrics.openReports)
    };
    Object.entries(metNodes).forEach(([id, val]) => {
      const el = document.querySelector(`#${id}`);
      if (el) el.textContent = val;
    });
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
      statusNode.textContent = 'Сувгийн тохиргоо ачааллаа.';
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    statusNode.textContent = 'Хадгалж байна...';

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
      statusNode.textContent = 'Хадгалагдлаа.';
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
    <small>Мэдүүлэгч: ${escapeHtml(report.reporterName)} · ${timeAgo(report.createdAt)}</small>
    <div class="action-row">
      <button class="button button-ghost" type="button" data-report-id="${escapeHtml(report.id)}" data-decision="dismissed">Цуцлах</button>
      <button class="button" type="button" data-report-id="${escapeHtml(report.id)}" data-decision="actioned" data-offline="1">Арга хэмжээ + Офлайн болгох</button>
    </div>
  </article>`;
}

function userCard(user) {
  const banLabel = user.activeBan ? `Хориглосон: ${escapeHtml(user.activeBan.reason)}` : 'Идэвхтэй хориглолт байхгүй';

  return `<article class="moderation-card">
    <div class="moderation-head">
      <strong>${escapeHtml(user.name)}</strong>
      <small>${escapeHtml(user.role)}</small>
    </div>
    <p>${escapeHtml(user.email)}</p>
    <small>${banLabel}</small>
    <div class="action-row">
      <button class="button button-ghost" type="button" data-ban-user-id="${escapeHtml(user.id)}">7 хоног хориглох</button>
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
    <small>${channel.isLive ? 'Шууд' : 'Офлайн'} · ${formatCurrency(channel.donationTotal)} төлсөн</small>
    <div class="action-row">
      <button class="button button-ghost" type="button" data-takedown-channel-id="${escapeHtml(channel.id)}">Сувгийг хязгаарлах</button>
    </div>
  </article>`;
}

function recentChatCard(message) {
  const author = message.user?.name || 'Тодорхойгүй хэрэглэгч';
  return `<article class="moderation-card">
    <div class="moderation-head">
      <strong>${escapeHtml(author)}</strong>
      <small>${timeAgo(message.createdAt)}</small>
    </div>
    <p>${escapeHtml(message.body)}</p>
    <small>${escapeHtml(message.channelId)}</small>
    <div class="action-row">
      <button class="button button-ghost" type="button" data-hide-chat-id="${escapeHtml(message.id)}">Мессеж нуух</button>
    </div>
  </article>`;
}

function renderAdminSummary(summary) {
  const metricsNode = document.querySelector('#adminMetrics');
  const reportQueue = document.querySelector('#reportQueue');
  const userModeration = document.querySelector('#userModeration');
  const recentChats = document.querySelector('#recentChats');

  if (metricsNode) {
    const metNodes = {
      metOpenReports:  String(summary.metrics.openReports),
      metActiveBans:   String(summary.metrics.activeBans),
      metLiveChannels: String(summary.metrics.liveChannels),
      metPaidRevenue:  formatCurrency(summary.metrics.paidRevenue)
    };
    Object.entries(metNodes).forEach(([id, val]) => {
      const el = document.querySelector(`#${id}`);
      if (el) el.textContent = val;
    });
  }

  if (reportQueue) {
    reportQueue.innerHTML = summary.reports.length
      ? summary.reports.map(reportCard).join('')
      : '<p class="empty-copy">Одоогоор нээлттэй мэдүүлэг байхгүй байна.</p>';
  }

  if (userModeration) {
    userModeration.innerHTML = `
      <h3>Хэрэглэгчид</h3>
      <div class="report-queue">${summary.users.map(userCard).join('')}</div>
      <h3>Сувгууд</h3>
      <div class="report-queue">${summary.channels.map(channelModerationCard).join('')}</div>
    `;
  }

  if (recentChats) {
    recentChats.innerHTML = summary.recentChats.length
      ? summary.recentChats.map(recentChatCard).join('')
      : '<p class="empty-copy">Сүүлийн үеийн чат мессеж байхгүй байна.</p>';
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

      const actionNotes = window.prompt('Модерацийн тэмдэглэл нэмэх', 'Админ консолоос шалгасан') || '';
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
        const reason = window.prompt('Хориглох шалтгаан', 'Дүрэм зөрчсөн') || 'Дүрэм зөрчсөн';
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
      loginStatus.textContent = 'Нэвтэрч байна...';

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
      registerStatus.textContent = 'Бүртгэл үүсгэж байна...';

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
    statusNode.textContent = 'Туршилтын төлбөр баталгаажуулж байна...';
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
  bindTopbarSearch();
  loadSidebarChannels().catch(() => {});

  const page = document.body.dataset.page;

  if (page === 'home') {
    await loadHomePage();
  }

  if (page === 'browse') {
    await loadBrowsePage();
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

// ── Sidebar – live channel list ─────────────────────────────
async function loadSidebarChannels() {
  const container = document.querySelector('#sidebarLiveChannels');
  if (!container) return;

  const payload = await requestJson('/api/channels');
  const channels = payload.channels || [];

  if (!channels.length) return;

  container.innerHTML = channels.map((ch) => {
    const initial = (ch.initials || ch.name?.[0] || 'N').charAt(0).toUpperCase();
    const accent  = escapeHtml(ch.accent || 'var(--green)');
    const isLive  = ch.isLive;
    const viewers = isLive ? formatCompact(ch.viewers) : '—';

    return `<a class="sidebar-channel" href="/channel/${encodeURIComponent(ch.slug)}">
      <div class="sidebar-avatar">
        <div class="sidebar-avatar-char" style="background:${accent}22;color:${accent}">${initial}</div>
        ${isLive ? '<div class="live-dot"></div>' : ''}
      </div>
      <div class="sidebar-channel-info">
        <strong>${escapeHtml(ch.name)}</strong>
        <small>${escapeHtml(ch.category)} · ${viewers}</small>
      </div>
    </a>`;
  }).join('');
}

// ── Browse page ─────────────────────────────────────────────
async function loadBrowsePage() {
  const grid = document.querySelector('#browseGrid');
  if (!grid) return;

  const payload = await requestJson('/api/channels');
  const allChannels = payload.channels || [];

  // Check if a category pre-filter was in the URL (e.g. /browse?category=Gaming)
  const params = new URLSearchParams(window.location.search);
  const preCategory = params.get('category') || '';

  function renderBrowseGrid(cat) {
    const filtered = cat
      ? allChannels.filter((c) => c.category === cat)
      : allChannels;
    grid.innerHTML = filtered.length
      ? filtered.map(channelCard).join('')
      : `<p class="form-note" style="padding:20px">Энэ ангилалд суваг байхгүй байна.</p>`;
  }

  renderBrowseGrid(preCategory);

  // Highlight matching cat-card if pre-filtered
  if (preCategory) {
    document.querySelectorAll('.cat-card').forEach((card) => {
      const name = card.querySelector('.cat-card-name')?.textContent;
      if (name === preCategory) card.style.borderColor = 'var(--cat-color, var(--green))';
    });
    // Scroll to channels section
    document.querySelector('#browseChannels')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Cat-card clicks filter instead of navigating (prevent reload)
  document.querySelectorAll('.cat-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const href = card.getAttribute('href') || '';
      const cat = new URL(href, window.location.origin).searchParams.get('category') || '';
      renderBrowseGrid(cat);
      document.querySelector('#browseChannels')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update section title
      const titleEl = document.querySelector('#browseChannels .section-title');
      if (titleEl) titleEl.textContent = cat ? `🔴 ${cat} сувгууд` : '🔴 Бүх шууд сувгууд';
    });
  });
}

// ── Home category filter ─────────────────────────────────────
function bindCategoryFilter(allChannels) {
  const row = document.querySelector('#catFilterRow');
  if (!row) return;

  row.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-filter-btn');
    if (!btn) return;

    row.querySelectorAll('.cat-filter-btn').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    const cat = btn.dataset.cat;
    const grid = document.querySelector('#featuredGrid');
    if (!grid) return;

    const filtered = cat ? allChannels.filter((c) => c.category === cat) : allChannels;
    grid.innerHTML = filtered.length
      ? filtered.map(channelCard).join('')
      : `<p class="form-note" style="padding:20px">Энэ ангилалд суваг байхгүй байна.</p>`;
  });
}

// ── Topbar search – filter channel grid on home ─────────────
function bindTopbarSearch() {
  const input = document.querySelector('#topbarSearch');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const cards = document.querySelectorAll('#featuredGrid .channel-card');
    cards.forEach((card) => {
      const text = card.textContent.toLowerCase();
      card.style.display = !q || text.includes(q) ? '' : 'none';
    });
  });

  // Focus on Ctrl+K / Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
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
      statusNode.textContent = `Алдаа: ${error.message}`;
    }

    console.error('[NEXA boot error]', error);
  });
});
