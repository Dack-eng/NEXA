require('./src/server-runtime');

if (false) {
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

const defaultStore = {
  channels: [
    {
      id: 'nexa-arena',
      slug: 'nexa-arena',
      name: 'NEXA Arena',
      handle: '@nexaarena',
      title: 'Road to top rank with the NEXA crew',
      category: 'Gaming',
      description:
        'Competitive gameplay, community scrims, and live breakdowns built for an always-on audience.',
      isLive: true,
      viewers: 1482,
      followers: 18600,
      accent: '#3ce0d1',
      surface: '#14203a',
      tags: ['FPS', 'Ranked', 'Community'],
      startedAt: '2026-03-31T11:15:00.000Z'
    },
    {
      id: 'nexa-music',
      slug: 'nexa-music',
      name: 'NEXA Pulse',
      handle: '@nexapulse',
      title: 'Late-night live set and shoutout requests',
      category: 'Music',
      description:
        'A creator-focused room for live performances, fan requests, and premium donation shoutouts.',
      isLive: true,
      viewers: 734,
      followers: 9200,
      accent: '#ff7b6b',
      surface: '#301d2d',
      tags: ['Live set', 'Requests', 'VIP'],
      startedAt: '2026-03-31T12:05:00.000Z'
    },
    {
      id: 'nexa-talk',
      slug: 'nexa-talk',
      name: 'NEXA Sessions',
      handle: '@nexasessions',
      title: 'Founder stories, audience call-ins, and creator Q&A',
      category: 'Talk',
      description:
        'A conversation-first format for interviews, community questions, and premium memberships.',
      isLive: false,
      viewers: 0,
      followers: 6400,
      accent: '#ffd166',
      surface: '#322c12',
      tags: ['Podcast', 'Q&A', 'Business'],
      startedAt: null
    }
  ],
  donations: [
    {
      id: 'don-1001',
      channelId: 'nexa-arena',
      supporterName: 'Batz',
      amount: 25,
      message: 'NEXA is looking clean already. Keep pushing.',
      createdAt: '2026-03-31T12:21:00.000Z'
    },
    {
      id: 'don-1002',
      channelId: 'nexa-arena',
      supporterName: 'Munkh',
      amount: 15,
      message: 'More ranked games please.',
      createdAt: '2026-03-31T12:34:00.000Z'
    },
    {
      id: 'don-1003',
      channelId: 'nexa-music',
      supporterName: 'Saraa',
      amount: 40,
      message: 'Play one more chill track for the night stream.',
      createdAt: '2026-03-31T12:47:00.000Z'
    }
  ]
};

function cloneDefaultStore() {
  return JSON.parse(JSON.stringify(defaultStore));
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(cloneDefaultStore(), null, 2));
  }
}

function readStore() {
  ensureStore();

  try {
    const file = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(file);

    if (!Array.isArray(parsed.channels) || !Array.isArray(parsed.donations)) {
      throw new Error('Unexpected store shape');
    }

    return parsed;
  } catch (error) {
    const fallback = cloneDefaultStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, statusCode, markup) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(markup);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(text);
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getChannelDonationTotal(store, channelId) {
  return store.donations
    .filter((donation) => donation.channelId === channelId)
    .reduce((sum, donation) => sum + Number(donation.amount || 0), 0);
}

function getRecentDonations(store, channelId, limit = 5) {
  return store.donations
    .filter((donation) => donation.channelId === channelId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

function getChannelSummary(store, channel) {
  return {
    ...channel,
    initials: getInitials(channel.name),
    donationTotal: getChannelDonationTotal(store, channel.id),
    recentDonations: getRecentDonations(store, channel.id, 3)
  };
}

function getChannelBySlug(store, slug) {
  return store.channels.find((channel) => channel.slug === slug);
}

function getStudioSummary(store, channelId) {
  const channel = store.channels.find((item) => item.id === channelId) || store.channels[0];
  const liveChannels = store.channels.filter((item) => item.isLive).length;
  const totalViewers = store.channels.reduce((sum, item) => sum + Number(item.viewers || 0), 0);
  const totalRevenue = store.donations.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    selectedChannel: getChannelSummary(store, channel),
    metrics: {
      liveChannels,
      totalViewers,
      totalRevenue,
      totalFollowers: store.channels.reduce((sum, item) => sum + Number(item.followers || 0), 0)
    },
    channels: store.channels.map((item) => getChannelSummary(store, item))
  };
}

function renderLayout({ title, description, body, page, pageProps = {} }) {
  const pageData = JSON.stringify(pageProps);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="stylesheet" href="/static/styles.css" />
  </head>
  <body data-page="${escapeHtml(page)}">
    <div class="site-shell">${body}</div>
    <script>window.__NEXA__ = ${pageData};</script>
    <script src="/static/app.js" defer></script>
  </body>
</html>`;
}

function renderHeader(activePath) {
  return `<header class="topbar">
    <a class="brand" href="/">
      <span class="brand-mark">N</span>
      <span class="brand-copy">
        <strong>NEXA</strong>
        <small>live + community</small>
      </span>
    </a>
    <nav class="nav">
      <a href="/" class="${activePath === '/' ? 'is-active' : ''}">Home</a>
      <a href="/#discover">Discover</a>
      <a href="/studio" class="${activePath === '/studio' ? 'is-active' : ''}">Studio</a>
    </nav>
    <a class="button button-ghost" href="/studio">Launch Studio</a>
  </header>`;
}

function renderHomePage() {
  return renderLayout({
    title: 'NEXA | Live Streaming MVP',
    description: 'A Kick-inspired streaming product MVP with donations, live rooms, and creator tools.',
    page: 'home',
    body: `${renderHeader('/')}
      <main class="page page-home">
        <section class="hero">
          <div class="hero-copy reveal">
            <span class="eyebrow">Kick-inspired platform for your brand</span>
            <h1>Build live rooms, donations, and creator communities inside NEXA.</h1>
            <p>
              This MVP is designed to help you pitch the product now and grow into a real streaming
              platform later with auth, payments, live ingest, and moderation.
            </p>
            <div class="hero-actions">
              <a class="button" href="/channel/nexa-arena">Open Demo Channel</a>
              <a class="button button-ghost" href="/studio">Manage Creator Studio</a>
            </div>
          </div>
          <div class="hero-panel reveal delay-1">
            <div class="hero-glow"></div>
            <div class="hero-card primary">
              <span class="label">Monetization</span>
              <strong id="homeRevenue">$0</strong>
              <small>Live donations across NEXA</small>
            </div>
            <div class="hero-card secondary">
              <span class="label">Channels live now</span>
              <strong id="homeLiveChannels">0</strong>
              <small>Streaming rooms in the network</small>
            </div>
            <div class="hero-card tertiary">
              <span class="label">Watchers online</span>
              <strong id="homeViewers">0</strong>
              <small>Community members inside live sessions</small>
            </div>
          </div>
        </section>
        <section class="section discover" id="discover">
          <div class="section-head">
            <div>
              <span class="eyebrow">Featured channels</span>
              <h2>Demo rooms your NEXA audience can join right away</h2>
            </div>
            <a class="button button-ghost" href="/studio">Edit lineup</a>
          </div>
          <div id="featuredGrid" class="channel-grid"></div>
        </section>
        <section class="section feature-slab">
          <div class="feature-copy reveal">
            <span class="eyebrow">What this MVP includes</span>
            <h2>Enough product surface to show the vision, test the brand, and keep building.</h2>
          </div>
          <div class="feature-grid">
            <article class="feature-card reveal">
              <h3>Live channel pages</h3>
              <p>Each channel gets a dedicated player area, creator bio, live stats, and supporter wall.</p>
            </article>
            <article class="feature-card reveal delay-1">
              <h3>Donation flow</h3>
              <p>Supporters can send custom donation amounts with messages that appear instantly on the page.</p>
            </article>
            <article class="feature-card reveal delay-2">
              <h3>Creator studio</h3>
              <p>Streamers can toggle live status, edit titles, and manage the next on-air session from one place.</p>
            </article>
          </div>
        </section>
        <section class="section roadmap">
          <div class="section-head">
            <div>
              <span class="eyebrow">Production roadmap</span>
              <h2>How to turn this MVP into a full live platform</h2>
            </div>
          </div>
          <div class="roadmap-grid">
            <article class="roadmap-card reveal">
              <strong>Phase 1</strong>
              <h3>Identity + creator onboarding</h3>
              <p>Accounts, profiles, channel ownership, streamer applications, and moderation roles.</p>
            </article>
            <article class="roadmap-card reveal delay-1">
              <strong>Phase 2</strong>
              <h3>Real payments and subscriptions</h3>
              <p>Stripe or local payment gateway integration, recurring memberships, and payout tracking.</p>
            </article>
            <article class="roadmap-card reveal delay-2">
              <strong>Phase 3</strong>
              <h3>Actual live streaming engine</h3>
              <p>RTMP ingest, HLS playback, chat sockets, recording, clips, and scalable viewer delivery.</p>
            </article>
          </div>
        </section>
      </main>`
  });
}

function renderChannelPage(channel) {
  return renderLayout({
    title: `${channel.name} | NEXA`,
    description: `${channel.title} on NEXA.`,
    page: 'channel',
    pageProps: { slug: channel.slug },
    body: `${renderHeader('')}
      <main class="page page-channel">
        <section class="channel-hero">
          <div class="player-panel reveal" id="channelPlayer"></div>
          <aside class="donation-panel reveal delay-1">
            <div class="panel-head">
              <span class="eyebrow">Support the creator</span>
              <h2>Donation panel</h2>
              <p>Use the built-in support flow to simulate real creator monetization.</p>
            </div>
            <form id="donationForm" class="donation-form">
              <label>
                <span>Your name</span>
                <input type="text" name="supporterName" maxlength="32" placeholder="Supporter name" required />
              </label>
              <label>
                <span>Amount (USD)</span>
                <input type="number" name="amount" min="1" max="5000" value="10" required />
              </label>
              <label>
                <span>Message</span>
                <textarea name="message" maxlength="120" rows="4" placeholder="Send a hype message"></textarea>
              </label>
              <button class="button" type="submit">Send donation</button>
              <p class="form-note" id="donationStatus">Support messages update the wall below immediately.</p>
            </form>
          </aside>
        </section>
        <section class="section channel-details">
          <div class="detail-card reveal" id="channelAbout"></div>
          <div class="detail-card reveal delay-1">
            <div class="section-head compact">
              <div>
                <span class="eyebrow">Supporter wall</span>
                <h2>Latest donations</h2>
              </div>
            </div>
            <div id="donationFeed" class="donation-feed"></div>
          </div>
        </section>
      </main>`
  });
}

function renderStudioPage() {
  return renderLayout({
    title: 'NEXA Studio',
    description: 'Manage stream title, status, and creator dashboard metrics.',
    page: 'studio',
    body: `${renderHeader('/studio')}
      <main class="page page-studio">
        <section class="studio-hero">
          <div class="hero-copy reveal">
            <span class="eyebrow">Creator control room</span>
            <h1>Operate your live business from one NEXA studio.</h1>
            <p>
              This screen is your operator panel for toggling stream status, updating titles,
              and tracking how donations grow across the network.
            </p>
          </div>
          <div class="studio-metrics reveal delay-1" id="studioMetrics"></div>
        </section>
        <section class="section studio-layout">
          <div class="detail-card reveal">
            <div class="section-head compact">
              <div>
                <span class="eyebrow">Live controls</span>
                <h2>Go live setup</h2>
              </div>
            </div>
            <form id="studioForm" class="studio-form">
              <label>
                <span>Channel</span>
                <select id="studioChannel" name="channelId"></select>
              </label>
              <label>
                <span>Stream title</span>
                <input type="text" id="studioTitle" name="title" maxlength="120" required />
              </label>
              <label>
                <span>Category</span>
                <input type="text" id="studioCategory" name="category" maxlength="40" required />
              </label>
              <label class="toggle-row">
                <span>Live status</span>
                <input type="checkbox" id="studioLive" name="isLive" />
              </label>
              <button class="button" type="submit">Save studio changes</button>
              <p class="form-note" id="studioStatus">Use this as the placeholder for real ingest controls later.</p>
            </form>
          </div>
          <div class="detail-card reveal delay-1">
            <div class="section-head compact">
              <div>
                <span class="eyebrow">Build next</span>
                <h2>Production checklist</h2>
              </div>
            </div>
            <ul class="checklist">
              <li>Connect sign-in and role-based creator accounts.</li>
              <li>Add RTMP ingest or LiveKit/WebRTC for real streams.</li>
              <li>Wire Stripe or a local payment gateway for real donations.</li>
              <li>Move channel and donation data into PostgreSQL.</li>
              <li>Add moderation, reporting, and anti-abuse tooling.</li>
            </ul>
          </div>
        </section>
      </main>`
  });
}

function renderNotFoundPage() {
  return renderLayout({
    title: 'Page not found | NEXA',
    description: 'This page does not exist on NEXA.',
    page: 'not-found',
    body: `${renderHeader('')}
      <main class="page page-not-found">
        <section class="empty-state">
          <span class="eyebrow">404</span>
          <h1>This channel does not exist yet.</h1>
          <p>Return home or open the creator studio to set up your next room.</p>
          <div class="hero-actions">
            <a class="button" href="/">Back to home</a>
            <a class="button button-ghost" href="/studio">Open studio</a>
          </div>
        </section>
      </main>`
  });
}

function notFound(res) {
  sendHtml(res, 404, renderNotFoundPage());
}

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const map = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml; charset=utf-8'
  };

  return map[extension] || 'application/octet-stream';
}

function serveStaticFile(res, pathname) {
  const relativePath = pathname.replace(/^\/static\//, '');
  const resolvedPath = path.normalize(path.join(PUBLIC_DIR, relativePath));

  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(resolvedPath, (error, file) => {
    if (error) {
      if (error.code === 'ENOENT') {
        notFound(res);
        return;
      }

      sendText(res, 500, 'Unable to load asset');
      return;
    }

    res.writeHead(200, {
      'Content-Type': getMimeType(resolvedPath),
      'Cache-Control': 'no-store'
    });
    res.end(file);
  });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;

      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });

    req.on('error', reject);
  });
}

function validateDonation(body) {
  const supporterName = String(body.supporterName || '').trim();
  const amount = Number(body.amount);
  const message = String(body.message || '').trim();
  const channelId = String(body.channelId || '').trim();

  if (!channelId) {
    return 'Channel is required.';
  }

  if (!supporterName || supporterName.length > 32) {
    return 'Supporter name must be between 1 and 32 characters.';
  }

  if (!Number.isFinite(amount) || amount < 1 || amount > 5000) {
    return 'Donation amount must be between 1 and 5000 USD.';
  }

  if (message.length > 120) {
    return 'Message must be 120 characters or less.';
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  try {
    if (pathname.startsWith('/static/') && req.method === 'GET') {
      serveStaticFile(res, pathname);
      return;
    }

    if (pathname === '/api/channels' && req.method === 'GET') {
      const store = readStore();
      const channels = store.channels.map((channel) => getChannelSummary(store, channel));
      sendJson(res, 200, { channels });
      return;
    }

    if (pathname.startsWith('/api/channels/') && req.method === 'GET') {
      const slug = pathname.replace('/api/channels/', '');
      const store = readStore();
      const channel = getChannelBySlug(store, slug);

      if (!channel) {
        sendJson(res, 404, { error: 'Channel not found' });
        return;
      }

      sendJson(res, 200, {
        channel: getChannelSummary(store, channel),
        donations: getRecentDonations(store, channel.id, 8)
      });
      return;
    }

    if (pathname === '/api/donations' && req.method === 'POST') {
      const body = await readRequestBody(req);
      const validationError = validateDonation(body);

      if (validationError) {
        sendJson(res, 400, { error: validationError });
        return;
      }

      const store = readStore();
      const channel = store.channels.find((item) => item.id === body.channelId);

      if (!channel) {
        sendJson(res, 404, { error: 'Channel not found' });
        return;
      }

      const donation = {
        id: `don-${Date.now()}`,
        channelId: body.channelId,
        supporterName: String(body.supporterName).trim().slice(0, 32),
        amount: Number(body.amount),
        message: String(body.message || '').trim().slice(0, 120),
        createdAt: new Date().toISOString()
      };

      store.donations.unshift(donation);
      writeStore(store);

      sendJson(res, 201, {
        donation,
        donationTotal: getChannelDonationTotal(store, channel.id),
        donations: getRecentDonations(store, channel.id, 8)
      });
      return;
    }

    if (pathname === '/api/studio/summary' && req.method === 'GET') {
      const store = readStore();
      const channelId = requestUrl.searchParams.get('channelId') || store.channels[0]?.id;
      sendJson(res, 200, getStudioSummary(store, channelId));
      return;
    }

    if (pathname === '/api/studio/go-live' && req.method === 'POST') {
      const body = await readRequestBody(req);
      const channelId = String(body.channelId || '');
      const store = readStore();
      const channel = store.channels.find((item) => item.id === channelId);

      if (!channel) {
        sendJson(res, 404, { error: 'Channel not found' });
        return;
      }

      channel.title = String(body.title || channel.title).trim().slice(0, 120) || channel.title;
      channel.category = String(body.category || channel.category).trim().slice(0, 40) || channel.category;
      channel.isLive = Boolean(body.isLive);
      channel.startedAt = channel.isLive ? channel.startedAt || new Date().toISOString() : null;
      writeStore(store);

      sendJson(res, 200, getStudioSummary(store, channel.id));
      return;
    }

    if (pathname === '/' && req.method === 'GET') {
      sendHtml(res, 200, renderHomePage());
      return;
    }

    if (pathname === '/studio' && req.method === 'GET') {
      sendHtml(res, 200, renderStudioPage());
      return;
    }

    if (pathname.startsWith('/channel/') && req.method === 'GET') {
      const slug = pathname.replace('/channel/', '');
      const store = readStore();
      const channel = getChannelBySlug(store, slug);

      if (!channel) {
        notFound(res);
        return;
      }

      sendHtml(res, 200, renderChannelPage(channel));
      return;
    }

    notFound(res);
  } catch (error) {
    sendJson(res, 500, {
      error: 'NEXA hit an internal error.',
      detail: error.message
    });
  }
});

server.listen(PORT, () => {
  ensureStore();
  console.log(`NEXA running at http://localhost:${PORT}`);
});
}
