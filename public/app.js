const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

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

function channelCard(channel) {
  const tags = channel.tags.map((tag) => `<span>${tag}</span>`).join('');

  return `<article class="channel-card reveal" style="--card-accent:${channel.accent}; --card-surface:${channel.surface};">
    <div class="channel-cover">
      <div class="channel-badge ${channel.isLive ? 'is-live' : ''}">${channel.isLive ? 'Live now' : 'Offline'}</div>
      <div class="channel-avatar">${channel.initials}</div>
      <div class="channel-meta">
        <strong>${channel.name}</strong>
        <small>${channel.category}</small>
      </div>
    </div>
    <div class="channel-body">
      <h3>${channel.title}</h3>
      <p>${channel.description}</p>
      <div class="tag-row">${tags}</div>
      <div class="channel-stats">
        <span>${formatCompact(channel.viewers)} viewers</span>
        <span>${formatCurrency(channel.donationTotal)} donated</span>
      </div>
    </div>
    <a class="button button-ghost" href="/channel/${channel.slug}">Open channel</a>
  </article>`;
}

function donationRow(donation) {
  return `<article class="donation-row">
    <div class="donation-main">
      <strong>${donation.supporterName}</strong>
      <span>${formatCurrency(donation.amount)}</span>
    </div>
    <p>${donation.message || 'Sent support without a note.'}</p>
    <small>${timeAgo(donation.createdAt)}</small>
  </article>`;
}

async function loadHomePage() {
  const { channels } = await requestJson('/api/channels');
  const featuredGrid = document.querySelector('#featuredGrid');
  const revenue = channels.reduce((sum, channel) => sum + Number(channel.donationTotal || 0), 0);
  const viewers = channels.reduce((sum, channel) => sum + Number(channel.viewers || 0), 0);
  const liveChannels = channels.filter((channel) => channel.isLive).length;

  if (featuredGrid) {
    featuredGrid.innerHTML = channels.map(channelCard).join('');
  }

  const revenueNode = document.querySelector('#homeRevenue');
  const liveNode = document.querySelector('#homeLiveChannels');
  const viewersNode = document.querySelector('#homeViewers');

  if (revenueNode) revenueNode.textContent = formatCurrency(revenue);
  if (liveNode) liveNode.textContent = String(liveChannels);
  if (viewersNode) viewersNode.textContent = formatCompact(viewers);
}

function renderChannelPlayer(channel) {
  const livePill = channel.isLive ? '<span class="live-pill">LIVE</span>' : '<span class="live-pill is-offline">OFFLINE</span>';

  return `<div class="player-shell" style="--channel-accent:${channel.accent}; --channel-surface:${channel.surface};">
    <div class="player-stage">
      <div class="player-art">
        <div class="avatar-big">${channel.initials}</div>
      </div>
      <div class="player-overlay">
        ${livePill}
        <strong>${channel.title}</strong>
        <small>${channel.name} ${channel.handle}</small>
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
        <span>Total donations</span>
        <strong>${formatCurrency(channel.donationTotal)}</strong>
      </div>
    </div>
  </div>`;
}

function renderChannelAbout(channel) {
  const tags = channel.tags.map((tag) => `<span>${tag}</span>`).join('');

  return `<div class="section-head compact">
    <div>
      <span class="eyebrow">Creator profile</span>
      <h2>${channel.name}</h2>
    </div>
  </div>
  <p class="channel-description">${channel.description}</p>
  <div class="tag-row">${tags}</div>
  <div class="info-grid">
    <div>
      <span>Handle</span>
      <strong>${channel.handle}</strong>
    </div>
    <div>
      <span>Category</span>
      <strong>${channel.category}</strong>
    </div>
    <div>
      <span>Status</span>
      <strong>${channel.isLive ? 'Broadcasting now' : 'Preparing next session'}</strong>
    </div>
  </div>`;
}

function updateDonationFeed(donations) {
  const feed = document.querySelector('#donationFeed');
  if (!feed) return;

  feed.innerHTML = donations.length
    ? donations.map(donationRow).join('')
    : '<p class="empty-copy">No donations yet. Be the first supporter.</p>';
}

async function loadChannelPage() {
  const slug = document.body.dataset.page === 'channel' ? window.__NEXA__.slug : null;
  if (!slug) return;

  const payload = await requestJson(`/api/channels/${slug}`);
  const player = document.querySelector('#channelPlayer');
  const about = document.querySelector('#channelAbout');
  const form = document.querySelector('#donationForm');
  const status = document.querySelector('#donationStatus');

  if (player) player.innerHTML = renderChannelPlayer(payload.channel);
  if (about) about.innerHTML = renderChannelAbout(payload.channel);
  updateDonationFeed(payload.donations);

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const body = {
      channelId: payload.channel.id,
      supporterName: formData.get('supporterName'),
      amount: Number(formData.get('amount')),
      message: formData.get('message')
    };

    try {
      status.textContent = 'Submitting donation...';

      const result = await requestJson('/api/donations', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      status.textContent = `${body.supporterName}, your support was added to the wall.`;
      form.reset();
      form.querySelector('input[name="amount"]').value = '10';
      updateDonationFeed(result.donations);

      if (player) {
        payload.channel.donationTotal = result.donationTotal;
        player.innerHTML = renderChannelPlayer(payload.channel);
      }
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

function metricCard(label, value) {
  return `<article class="metric-card">
    <span>${label}</span>
    <strong>${value}</strong>
  </article>`;
}

function populateStudioForm(summary) {
  const channelSelect = document.querySelector('#studioChannel');
  const titleInput = document.querySelector('#studioTitle');
  const categoryInput = document.querySelector('#studioCategory');
  const liveInput = document.querySelector('#studioLive');

  if (channelSelect) {
    channelSelect.innerHTML = summary.channels
      .map(
        (channel) =>
          `<option value="${channel.id}" ${channel.id === summary.selectedChannel.id ? 'selected' : ''}>
            ${channel.name}
          </option>`
      )
      .join('');
  }

  if (titleInput) titleInput.value = summary.selectedChannel.title;
  if (categoryInput) categoryInput.value = summary.selectedChannel.category;
  if (liveInput) liveInput.checked = summary.selectedChannel.isLive;
}

async function loadStudioPage() {
  const metricsNode = document.querySelector('#studioMetrics');
  const form = document.querySelector('#studioForm');
  const status = document.querySelector('#studioStatus');
  if (!metricsNode || !form) return;

  let summary = await requestJson('/api/studio/summary');

  function renderStudio(summaryPayload) {
    metricsNode.innerHTML = [
      metricCard('Channels live', String(summaryPayload.metrics.liveChannels)),
      metricCard('Network viewers', formatCompact(summaryPayload.metrics.totalViewers)),
      metricCard('Revenue tracked', formatCurrency(summaryPayload.metrics.totalRevenue)),
      metricCard('Followers total', formatCompact(summaryPayload.metrics.totalFollowers))
    ].join('');

    populateStudioForm(summaryPayload);
  }

  renderStudio(summary);

  const channelSelect = document.querySelector('#studioChannel');
  if (channelSelect) {
    channelSelect.addEventListener('change', async () => {
      summary = await requestJson(`/api/studio/summary?channelId=${channelSelect.value}`);
      renderStudio(summary);
      status.textContent = 'Loaded channel controls.';
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const body = {
      channelId: formData.get('channelId'),
      title: formData.get('title'),
      category: formData.get('category'),
      isLive: formData.get('isLive') === 'on'
    };

    try {
      status.textContent = 'Saving studio settings...';
      summary = await requestJson('/api/studio/go-live', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      renderStudio(summary);
      status.textContent = 'Studio updated successfully.';
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

async function boot() {
  try {
    const page = document.body.dataset.page;

    if (page === 'home') {
      await loadHomePage();
    }

    if (page === 'channel') {
      await loadChannelPage();
    }

    if (page === 'studio') {
      await loadStudioPage();
    }
  } catch (error) {
    const status = document.querySelector('#donationStatus') || document.querySelector('#studioStatus');
    if (status) {
      status.textContent = error.message;
    }
  }
}

document.addEventListener('DOMContentLoaded', boot);
