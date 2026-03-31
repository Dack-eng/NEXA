const { escapeHtml } = require('./http');

function renderLayout({ title, description, body, page, pageProps = {} }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="stylesheet" href="/static/site.css" />
  </head>
  <body data-page="${escapeHtml(page)}">
    <div class="site-shell">${body}</div>
    <script>window.__NEXA__ = ${JSON.stringify(pageProps)};</script>
    <script src="/static/client.js" defer></script>
  </body>
</html>`;
}

function renderHeader(activePath, viewer) {
  const accountMarkup = viewer
    ? `<div class="account-pill">
        <span>${escapeHtml(viewer.name)}</span>
        <small>${escapeHtml(viewer.role)}</small>
      </div>
      <button class="button button-ghost" id="logoutButton" type="button">Log out</button>`
    : `<a class="button button-ghost" href="/auth">Log in</a>`;

  return `<header class="topbar">
    <a class="brand" href="/">
      <span class="brand-mark">N</span>
      <span class="brand-copy">
        <strong>NEXA</strong>
        <small>production streaming stack</small>
      </span>
    </a>
    <nav class="nav">
      <a href="/" class="${activePath === '/' ? 'is-active' : ''}">Home</a>
      <a href="/auth" class="${activePath === '/auth' ? 'is-active' : ''}">Auth</a>
      <a href="/studio" class="${activePath === '/studio' ? 'is-active' : ''}">Studio</a>
      <a href="/admin" class="${activePath === '/admin' ? 'is-active' : ''}">Admin</a>
    </nav>
    <div class="account-actions">${accountMarkup}</div>
  </header>`;
}

function renderAccessBlock({ eyebrow, title, copy, primaryHref, primaryLabel, secondaryHref, secondaryLabel }) {
  return `<section class="access-panel">
    <span class="eyebrow">${escapeHtml(eyebrow)}</span>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(copy)}</p>
    <div class="hero-actions">
      <a class="button" href="${escapeHtml(primaryHref)}">${escapeHtml(primaryLabel)}</a>
      <a class="button button-ghost" href="${escapeHtml(secondaryHref)}">${escapeHtml(secondaryLabel)}</a>
    </div>
  </section>`;
}

function renderHomePage({ viewer, providerStatus }) {
  const paymentMode = providerStatus.payments.mode === 'stripe' ? 'Stripe live checkout' : 'Sandbox checkout';
  const liveMode = providerStatus.live.mode === 'livekit' ? 'LiveKit connected' : 'Manual RTMP/HLS setup';

  return renderLayout({
    title: 'NEXA | Production Streaming Platform',
    description: 'NEXA production build with auth, payments, live streaming setup, and moderation tooling.',
    page: 'home',
    pageProps: { providerStatus, viewer },
    body: `${renderHeader('/', viewer)}
      <main class="page page-home">
        <section class="hero hero-wide">
          <div class="hero-copy reveal">
            <span class="eyebrow">Production build</span>
            <h1>Auth, payments, live rooms, and moderation now live inside NEXA.</h1>
            <p>
              This version upgrades the MVP into a role-aware platform with account sessions,
              Stripe-ready donation checkout, live provider setup, and admin enforcement tools.
            </p>
            <div class="hero-actions">
              <a class="button" href="/channel/nexa-arena">Open live channel</a>
              <a class="button button-ghost" href="/studio">Open creator studio</a>
            </div>
          </div>
          <div class="hero-panel reveal delay-1">
            <div class="hero-card primary">
              <span class="label">Payments</span>
              <strong>${escapeHtml(paymentMode)}</strong>
              <small>Real Stripe checkout when env keys exist</small>
            </div>
            <div class="hero-card secondary">
              <span class="label">Streaming</span>
              <strong>${escapeHtml(liveMode)}</strong>
              <small>LiveKit tokens or manual RTMP/HLS credentials</small>
            </div>
            <div class="hero-card tertiary">
              <span class="label">Roles</span>
              <strong>Viewer / Creator / Moderator / Admin</strong>
              <small>Protected studio and moderation routes</small>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <div>
              <span class="eyebrow">Seeded accounts</span>
              <h2>Use these demo users to test the full workflow</h2>
            </div>
          </div>
          <div class="seed-grid">
            <article class="detail-card">
              <strong>Admin</strong>
              <p><code>admin@nexa.local</code> / <code>Admin123!</code></p>
            </article>
            <article class="detail-card">
              <strong>Creator</strong>
              <p><code>creator@nexa.local</code> / <code>Creator123!</code></p>
            </article>
            <article class="detail-card">
              <strong>Moderator</strong>
              <p><code>moderator@nexa.local</code> / <code>Moderator123!</code></p>
            </article>
            <article class="detail-card">
              <strong>Viewer</strong>
              <p><code>viewer@nexa.local</code> / <code>Viewer123!</code></p>
            </article>
          </div>
        </section>

        <section class="section" id="discover">
          <div class="section-head">
            <div>
              <span class="eyebrow">Network channels</span>
              <h2>Creator rooms with monetization and moderation hooks</h2>
            </div>
          </div>
          <div id="featuredGrid" class="channel-grid"></div>
        </section>
      </main>`
  });
}

function renderAuthPage({ viewer, next }) {
  return renderLayout({
    title: 'NEXA | Login and Register',
    description: 'Create an account or sign in to NEXA.',
    page: 'auth',
    pageProps: { viewer, next },
    body: `${renderHeader('/auth', viewer)}
      <main class="page page-auth">
        <section class="auth-shell">
          <article class="detail-card auth-card reveal">
            <span class="eyebrow">Sign in</span>
            <h1>Return to your NEXA workspace</h1>
            <form id="loginForm" class="stack-form">
              <label>
                <span>Email</span>
                <input type="email" name="email" placeholder="you@nexa.com" required />
              </label>
              <label>
                <span>Password</span>
                <input type="password" name="password" placeholder="Password" required />
              </label>
              <button class="button" type="submit">Log in</button>
              <p id="loginStatus" class="form-note">Use a seeded account or create your own.</p>
            </form>
          </article>
          <article class="detail-card auth-card reveal delay-1">
            <span class="eyebrow">Create account</span>
            <h1>Join as a viewer or creator</h1>
            <form id="registerForm" class="stack-form">
              <label>
                <span>Name</span>
                <input type="text" name="name" maxlength="40" placeholder="Your display name" required />
              </label>
              <label>
                <span>Email</span>
                <input type="email" name="email" placeholder="you@nexa.com" required />
              </label>
              <label>
                <span>Password</span>
                <input type="password" name="password" minlength="8" placeholder="At least 8 characters" required />
              </label>
              <label>
                <span>Role</span>
                <select name="role">
                  <option value="viewer">Viewer</option>
                  <option value="creator">Creator</option>
                </select>
              </label>
              <button class="button" type="submit">Create account</button>
              <p id="registerStatus" class="form-note">Creators gain access to Studio after sign-up.</p>
            </form>
          </article>
        </section>
      </main>`
  });
}

function renderChannelPage({ viewer, slug }) {
  return renderLayout({
    title: 'NEXA | Channel',
    description: 'Watch a NEXA channel, support the creator, and report issues.',
    page: 'channel',
    pageProps: { viewer, slug },
    body: `${renderHeader('', viewer)}
      <main class="page page-channel">
        <section class="channel-hero">
          <div class="player-panel reveal" id="channelPlayer"></div>
          <aside class="stack-column reveal delay-1">
            <div class="detail-card">
              <div class="section-head compact">
                <div>
                  <span class="eyebrow">Donation checkout</span>
                  <h2>Support this creator</h2>
                </div>
              </div>
              <form id="donationForm" class="stack-form">
                <label>
                  <span>Amount (USD)</span>
                  <input type="number" name="amount" min="1" max="5000" value="10" required />
                </label>
                <label>
                  <span>Message</span>
                  <textarea name="message" maxlength="120" rows="4" placeholder="Send a message with your donation"></textarea>
                </label>
                <button class="button" type="submit">Continue to checkout</button>
                <p id="donationStatus" class="form-note">Log in first to connect donations to a real NEXA user account.</p>
              </form>
            </div>
            <div class="detail-card">
              <div class="section-head compact">
                <div>
                  <span class="eyebrow">Safety report</span>
                  <h2>Flag channel concerns</h2>
                </div>
              </div>
              <form id="reportForm" class="stack-form">
                <label>
                  <span>Reason</span>
                  <select name="reason">
                    <option value="harassment">Harassment</option>
                    <option value="hate">Hate or abuse</option>
                    <option value="spam">Spam</option>
                    <option value="copyright">Copyright</option>
                  </select>
                </label>
                <label>
                  <span>Details</span>
                  <textarea name="detail" maxlength="180" rows="4" placeholder="Describe what should be reviewed"></textarea>
                </label>
                <button class="button button-ghost" type="submit">Submit report</button>
                <p id="reportStatus" class="form-note">Reports route directly into the moderation queue.</p>
              </form>
            </div>
          </aside>
        </section>

        <section class="section channel-details">
          <div class="detail-card reveal" id="channelAbout"></div>
          <div class="detail-card reveal delay-1">
            <div class="section-head compact">
              <div>
                <span class="eyebrow">Payments</span>
                <h2>Recent paid donations</h2>
              </div>
            </div>
            <div id="donationFeed" class="donation-feed"></div>
          </div>
        </section>
        <section class="section">
          <div class="detail-card reveal">
            <div class="section-head compact">
              <div>
                <span class="eyebrow">Live chat</span>
                <h2>Real-time audience room</h2>
              </div>
            </div>
            <div id="chatFeed" class="chat-feed"></div>
            <form id="chatForm" class="stack-form chat-form">
              <label>
                <span>Message</span>
                <textarea name="body" maxlength="240" rows="3" placeholder="Type into the live room"></textarea>
              </label>
              <button class="button button-ghost" type="submit">Send chat</button>
              <p id="chatStatus" class="form-note">Log in to join the live chat room.</p>
            </form>
          </div>
        </section>
      </main>`
  });
}

function renderStudioPage({ viewer }) {
  const isAllowed = viewer && (viewer.role === 'creator' || viewer.role === 'moderator' || viewer.role === 'admin');
  const body = isAllowed
    ? `<main class="page page-studio">
        <section class="studio-hero">
          <div class="hero-copy reveal">
            <span class="eyebrow">Creator studio</span>
            <h1>Manage broadcast metadata, ingest credentials, and room access.</h1>
            <p>
              Studio combines your stream title, payment readiness, provider status,
              RTMP setup, playback links, and generated viewer/publisher tokens.
            </p>
          </div>
          <div class="studio-metrics reveal delay-1" id="studioMetrics"></div>
        </section>
        <section class="section studio-layout">
          <div class="detail-card reveal">
            <div class="section-head compact">
              <div>
                <span class="eyebrow">Broadcast controls</span>
                <h2>Stream settings</h2>
              </div>
            </div>
            <form id="studioForm" class="stack-form">
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
              <label>
                <span>Playback URL</span>
                <input type="text" id="studioPlaybackUrl" name="playbackUrl" placeholder="https://...m3u8" />
              </label>
              <label>
                <span>Viewer join URL</span>
                <input type="text" id="studioViewerJoinUrl" name="viewerJoinUrl" placeholder="https://..." />
              </label>
              <label>
                <span>RTMP ingress URL</span>
                <input type="text" id="studioIngressUrl" name="ingressUrl" placeholder="rtmp://..." />
              </label>
              <label>
                <span>Stream key</span>
                <input type="text" id="studioStreamKey" name="streamKey" placeholder="stream key" />
              </label>
              <label class="toggle-row">
                <span>Live status</span>
                <input type="checkbox" id="studioLive" name="isLive" />
              </label>
              <button class="button" type="submit">Save studio changes</button>
              <p class="form-note" id="studioStatus">Creator-only settings sync to the live channel immediately.</p>
            </form>
          </div>
          <div class="stack-column reveal delay-1">
            <div class="detail-card">
              <div class="section-head compact">
                <div>
                  <span class="eyebrow">Provider blueprint</span>
                  <h2>Live credentials</h2>
                </div>
              </div>
              <div id="liveBlueprint" class="blueprint-grid"></div>
            </div>
            <div class="detail-card">
              <div class="section-head compact">
                <div>
                  <span class="eyebrow">Join tokens</span>
                  <h2>Publisher and viewer access</h2>
                </div>
              </div>
              <div id="tokenPanel" class="token-panel"></div>
            </div>
          </div>
        </section>
      </main>`
    : `<main class="page page-locked">${renderAccessBlock({
        eyebrow: 'Creator access',
        title: 'Studio requires a creator, moderator, or admin account.',
        copy: 'Log in with a creator-capable account to manage channels, stream keys, and live settings.',
        primaryHref: '/auth?next=/studio',
        primaryLabel: 'Go to login',
        secondaryHref: '/',
        secondaryLabel: 'Back home'
      })}</main>`;

  return renderLayout({
    title: 'NEXA | Studio',
    description: 'Creator studio for managing stream settings and live provider access.',
    page: 'studio',
    pageProps: { viewer },
    body: `${renderHeader('/studio', viewer)}${body}`
  });
}

function renderAdminPage({ viewer }) {
  const isAllowed = viewer && (viewer.role === 'moderator' || viewer.role === 'admin');
  const body = isAllowed
    ? `<main class="page page-admin">
        <section class="studio-hero">
          <div class="hero-copy reveal">
            <span class="eyebrow">Moderation desk</span>
            <h1>Review reports, ban bad actors, and take channels offline fast.</h1>
            <p>
              This dashboard centralizes user risk, open reports, live safety actions,
              and audit visibility for the NEXA ops team.
            </p>
          </div>
          <div class="studio-metrics reveal delay-1" id="adminMetrics"></div>
        </section>
        <section class="section admin-layout">
          <div class="detail-card reveal">
            <div class="section-head compact">
              <div>
                <span class="eyebrow">Report queue</span>
                <h2>Open incidents</h2>
              </div>
            </div>
            <div id="reportQueue" class="report-queue"></div>
          </div>
          <div class="detail-card reveal delay-1">
            <div class="section-head compact">
              <div>
                <span class="eyebrow">User controls</span>
                <h2>Accounts and bans</h2>
              </div>
            </div>
            <div id="userModeration" class="report-queue"></div>
          </div>
        </section>
        <section class="section">
          <div class="detail-card reveal">
            <div class="section-head compact">
              <div>
                <span class="eyebrow">Chat moderation</span>
                <h2>Recent live messages</h2>
              </div>
            </div>
            <div id="recentChats" class="report-queue"></div>
          </div>
        </section>
      </main>`
    : `<main class="page page-locked">${renderAccessBlock({
        eyebrow: 'Moderator access',
        title: 'Admin tools are limited to moderators and admins.',
        copy: 'Use a moderation role to resolve reports, suspend users, and control live safety actions.',
        primaryHref: '/auth?next=/admin',
        primaryLabel: 'Go to login',
        secondaryHref: '/',
        secondaryLabel: 'Back home'
      })}</main>`;

  return renderLayout({
    title: 'NEXA | Admin',
    description: 'Moderation dashboard for handling reports, bans, and channel enforcement.',
    page: 'admin',
    pageProps: { viewer },
    body: `${renderHeader('/admin', viewer)}${body}`
  });
}

function renderSandboxCheckoutPage({ viewer, donationId }) {
  return renderLayout({
    title: 'NEXA | Sandbox Checkout',
    description: 'Local sandbox checkout for NEXA donation testing.',
    page: 'sandbox-checkout',
    pageProps: { viewer, donationId },
    body: `${renderHeader('', viewer)}
      <main class="page page-checkout">
        <section class="access-panel">
          <span class="eyebrow">Sandbox payment</span>
          <h1>Complete the local donation checkout</h1>
          <p>
            This page acts as the fallback when Stripe keys are not configured.
            Use it to verify the donation lifecycle and paid-state transitions.
          </p>
          <div class="detail-card checkout-card">
            <div id="checkoutSummary" class="stack-form"></div>
            <button class="button" id="sandboxConfirmButton" type="button">Mark donation as paid</button>
            <p id="checkoutStatus" class="form-note">The donation will move into the paid supporter wall after confirmation.</p>
          </div>
        </section>
      </main>`
  });
}

function renderNotFoundPage({ viewer }) {
  return renderLayout({
    title: 'NEXA | Not found',
    description: 'This page could not be found.',
    page: 'not-found',
    pageProps: { viewer },
    body: `${renderHeader('', viewer)}
      <main class="page page-locked">${renderAccessBlock({
        eyebrow: '404',
        title: 'That page is not available.',
        copy: 'Return home, open a channel, or head back into the creator studio.',
        primaryHref: '/',
        primaryLabel: 'Back home',
        secondaryHref: '/studio',
        secondaryLabel: 'Open studio'
      })}</main>`
  });
}

module.exports = {
  renderHomePage,
  renderAuthPage,
  renderChannelPage,
  renderStudioPage,
  renderAdminPage,
  renderSandboxCheckoutPage,
  renderNotFoundPage
};
