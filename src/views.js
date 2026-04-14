const { escapeHtml } = require('./http');

/* ─── Shared helpers ────────────────────────────────────────── */

function renderLayout({ title, description, body, page, pageProps = {}, withSidebar = true }) {
  return `<!DOCTYPE html>
<html lang="mn">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="/static/site.css" />
  </head>
  <body data-page="${escapeHtml(page)}">
    <div class="site-shell">
      ${body}
    </div>
    <script>window.__NEXA__ = ${JSON.stringify(pageProps)};</script>
    <script src="/static/client.js" defer></script>
  </body>
</html>`;
}

function renderTopbar(activePath, viewer) {
  const accountMarkup = viewer
    ? `<div class="account-pill">
        <span>${escapeHtml(viewer.name)}</span>
        <small>${escapeHtml(viewer.role)}</small>
       </div>
       <button class="button button-ghost button-sm" id="logoutButton" type="button">Гарах</button>`
    : `<a class="button button-ghost button-sm" href="/auth">Нэвтрэх</a>
       <a class="button button-sm" href="/auth">Бүртгүүлэх</a>`;

  return `<header class="topbar">
    <a class="brand" href="/">
      <span class="brand-mark">N</span>
      <span class="brand-copy">
        <strong>NEXA</strong>
        <small>шууд дамжуулалт</small>
      </span>
    </a>
    <div class="topbar-search">
      <span class="topbar-search-icon">🔍</span>
      <input type="text" placeholder="Суваг, бүтээгч, ангилал хайх..." id="topbarSearch" />
    </div>
    <nav class="nav">
      <a href="/" class="${activePath === '/' ? 'is-active' : ''}">🏠 Нүүр</a>
      <a href="/browse" class="${activePath === '/browse' ? 'is-active' : ''}">🎯 Үзэх</a>
      <a href="/studio" class="${activePath === '/studio' ? 'is-active' : ''}">🎬 Студи</a>
      <a href="/admin" class="${activePath === '/admin' ? 'is-active' : ''}">🛡️ Удирдах</a>
    </nav>
    <div class="account-actions">${accountMarkup}</div>
  </header>`;
}

function renderSidebar(viewer) {
  const liveChannels = [
    { name: 'NEXA Arena', slug: 'nexa-arena', accent: '#53FC18', cat: 'Gaming', viewers: '1.4K' },
    { name: 'NEXA Pulse',  slug: 'nexa-music', accent: '#ff7b6b', cat: 'Music',  viewers: '734' },
    { name: 'NEXA Sessions', slug: 'nexa-talk', accent: '#FFD166', cat: 'Talk', viewers: '—' }
  ];

  const liveItems = liveChannels.map(ch => `
    <a class="sidebar-channel" href="/channel/${escapeHtml(ch.slug)}" style="--card-accent:${escapeHtml(ch.accent)}">
      <div class="sidebar-avatar">
        <div class="sidebar-avatar-char" style="background:${escapeHtml(ch.accent)}22;color:${escapeHtml(ch.accent)}">${escapeHtml(ch.name[0])}</div>
        ${ch.viewers !== '—' ? '<div class="live-dot"></div>' : ''}
      </div>
      <div class="sidebar-channel-info">
        <strong>${escapeHtml(ch.name)}</strong>
        <small>${escapeHtml(ch.cat)} · ${escapeHtml(ch.viewers)}</small>
      </div>
    </a>`).join('');

  return `<aside class="sidebar">
    <div class="sidebar-section">
      <span class="sidebar-label">Цэс</span>
      <a class="sidebar-link" href="/"><span class="icon">🏠</span> Нүүр</a>
      <a class="sidebar-link" href="/browse"><span class="icon">🔥</span> Үзэх</a>
      <a class="sidebar-link" href="/browse?category=Gaming"><span class="icon">🎮</span> Тоглоом</a>
      <a class="sidebar-link" href="/browse?category=IRL"><span class="icon">📡</span> IRL</a>
      <a class="sidebar-link" href="/browse?category=Music"><span class="icon">🎵</span> Хөгжим</a>
      <a class="sidebar-link" href="/browse?category=Sports"><span class="icon">⚽</span> Спорт</a>
      <a class="sidebar-link" href="/browse?category=Just+Chatting"><span class="icon">💬</span> Чатлах</a>
    </div>
    <div class="sidebar-section">
      <span class="sidebar-label">Шууд сувгууд</span>
      <div id="sidebarLiveChannels">${liveItems}</div>
    </div>
    ${viewer ? `<div class="sidebar-section">
      <span class="sidebar-label">Миний суваг</span>
      <a class="sidebar-link" href="/studio"><span class="icon">🎬</span> Бүтээгчийн студи</a>
      <a class="sidebar-link" href="/studio"><span class="icon">📊</span> Статистик</a>
    </div>` : ''}
  </aside>`;
}

function renderFooter() {
  return `<footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="brand-mark" style="width:28px;height:28px;font-size:14px">N</span>
        <span class="footer-brand-name">NEXA</span>
      </div>
      <nav class="footer-nav">
        <a href="/">Нүүр</a>
        <a href="/browse">Үзэх</a>
        <a href="/studio">Студи</a>
        <a href="/auth">Нэвтрэх</a>
      </nav>
      <div class="footer-meta">
        <span>© ${new Date().getFullYear()} NEXA. Бүтээгчдэд зориулсан.</span>
        <div class="footer-badges">
          <span class="footer-badge">Шууд дамжуулалт</span>
          <span class="footer-badge">Чат</span>
          <span class="footer-badge">Хандив</span>
        </div>
      </div>
    </div>
  </footer>`;
}

function renderLayout_withSidebar({ title, description, content, page, pageProps = {}, viewer, activePath = '' }) {
  const topbar = renderTopbar(activePath, viewer);
  const sidebar = renderSidebar(viewer);
  return renderLayout({
    title, description, page, pageProps,
    body: `${topbar}
      <div class="layout-body">
        ${sidebar}
        <div class="main-content">${content}${renderFooter()}</div>
      </div>`
  });
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

/* ─── HOME PAGE ─────────────────────────────────────────────── */

function renderHomePage({ viewer, providerStatus }) {
  const paymentMode = providerStatus.payments.mode === 'stripe' ? 'Stripe Идэвхтэй' : 'Туршилтын горим';
  const liveMode    = providerStatus.live.mode === 'livekit' ? 'LiveKit' : 'Гараар RTMP';

  const content = `<div class="page page-home">

    <!-- Hero Banner -->
    <div class="hero-banner reveal">
      <div class="hero-banner-bg"></div>
      <div class="hero-banner-content">
        <div class="hero-eyebrow">
          <span class="hero-eyebrow-dot"></span>
          Монголын streaming платформ
        </div>
        <h1 class="hero-banner-title">Бүтээгчдэд зориулсан<br/>платформ.</h1>
        <p class="hero-banner-sub">
          Шууд өрөө, бодит цагийн чат, хандив, модерацийн хэрэгслүүд —
          таны анхны стримд бэлэн байна.
        </p>
        <div class="hero-live-stats">
          <div class="hero-live-stat"><span class="stat-dot"></span> <strong id="homeViewers">0</strong>&nbsp;үзэгч онлайн</div>
          <div class="hero-live-stat">🟢 <strong id="homeLiveChannels">0</strong>&nbsp;суваг шууд</div>
          <div class="hero-live-stat">💰 <strong id="homeRevenue">$0</strong>&nbsp;өнөөдөр</div>
        </div>
        <div class="hero-actions">
          <a class="button" href="/channel/nexa-arena">▶ Шууд үзэх</a>
          <a class="button button-ghost" href="/studio">🎬 Студи нээх</a>
        </div>
      </div>
      <div class="hero-panel-cards">
        <div class="hero-metric">
          <div class="label">Төлбөр</div>
          <strong>${escapeHtml(paymentMode)}</strong>
        </div>
        <div class="hero-metric">
          <div class="label">Дамжуулалт</div>
          <strong>${escapeHtml(liveMode)}</strong>
        </div>
        <div class="hero-metric">
          <div class="label">Эрх</div>
          <strong>4 түвшин</strong>
        </div>
      </div>
    </div>

    <!-- Demo Accounts -->
    <div class="section">
      <div class="section-head">
        <span class="section-title">🔑 Туршилтын бүртгэлүүд</span>
        <a class="section-link" href="/auth">Нэвтрэх →</a>
      </div>
      <div class="seed-grid">
        <div class="detail-card reveal">
          <strong>Админ</strong>
          <p><code>admin@nexa.local</code><br/><code>Admin123!</code></p>
        </div>
        <div class="detail-card reveal delay-1">
          <strong>Бүтээгч</strong>
          <p><code>creator@nexa.local</code><br/><code>Creator123!</code></p>
        </div>
        <div class="detail-card reveal delay-2">
          <strong>Модератор</strong>
          <p><code>moderator@nexa.local</code><br/><code>Moderator123!</code></p>
        </div>
        <div class="detail-card reveal delay-3">
          <strong>Үзэгч</strong>
          <p><code>viewer@nexa.local</code><br/><code>Viewer123!</code></p>
        </div>
      </div>
    </div>

    <!-- Live Channels -->
    <div class="section" id="discover">
      <div class="section-head">
        <span class="section-title">🔴 Шууд сувгууд</span>
        <a class="section-link" href="/browse">Бүгдийг үзэх →</a>
      </div>
      <div class="cat-filter-row" id="catFilterRow">
        <button class="cat-filter-btn is-active" data-cat="">Бүгд</button>
        <button class="cat-filter-btn" data-cat="Gaming">🎮 Тоглоом</button>
        <button class="cat-filter-btn" data-cat="IRL">📡 IRL</button>
        <button class="cat-filter-btn" data-cat="Music">🎵 Хөгжим</button>
        <button class="cat-filter-btn" data-cat="Sports">⚽ Спорт</button>
        <button class="cat-filter-btn" data-cat="Talk">💬 Яриа</button>
        <button class="cat-filter-btn" data-cat="Software & Technology">💻 Технологи</button>
        <button class="cat-filter-btn" data-cat="Art">🎨 Урлаг</button>
        <button class="cat-filter-btn" data-cat="ASMR">🎧 ASMR</button>
      </div>
      <div id="featuredGrid" class="channel-grid"></div>
    </div>

  </div>`;

  return renderLayout_withSidebar({
    title: 'NEXA | Шууд Дамжуулалт',
    description: 'NEXA — Монголын шууд дамжуулалтын платформ. Чат, хандив, бүтээгчийн студи.',
    content,
    page: 'home',
    activePath: '/',
    viewer,
    pageProps: { providerStatus, viewer }
  });
}

/* ─── BROWSE PAGE ───────────────────────────────────────────── */

function renderBrowsePage({ viewer }) {
  const CATEGORIES = [
    { name: 'Gaming',                label: 'Тоглоом',         emoji: '🎮', color: '#3ce0d1' },
    { name: 'IRL',                   label: 'IRL',             emoji: '📡', color: '#a78bfa' },
    { name: 'Music',                 label: 'Хөгжим',          emoji: '🎵', color: '#ff7b6b' },
    { name: 'Talk',                  label: 'Яриа',            emoji: '💬', color: '#ffd166' },
    { name: 'Sports',                label: 'Спорт',           emoji: '⚽', color: '#f97316' },
    { name: 'Software & Technology', label: 'Технологи',       emoji: '💻', color: '#38bdf8' },
    { name: 'Art',                   label: 'Урлаг',           emoji: '🎨', color: '#f472b6' },
    { name: 'ASMR',                  label: 'ASMR',            emoji: '🎧', color: '#67e8f9' },
    { name: 'Fitness & Health',      label: 'Фитнесс',         emoji: '💪', color: '#4ade80' },
    { name: 'Gambling',              label: 'Мөрийтэй тоглоом',emoji: '🃏', color: '#facc15' },
    { name: 'Food & Drink',          label: 'Хоол & Ундаа',    emoji: '🍜', color: '#fb923c' },
    { name: 'Just Chatting',         label: 'Чатлах',          emoji: '😊', color: '#53FC18' },
  ];

  const categoryCards = CATEGORIES.map(cat => `
    <a class="cat-card" href="/?category=${encodeURIComponent(cat.name)}" style="--cat-color:${escapeHtml(cat.color)}">
      <div class="cat-card-icon">${cat.emoji}</div>
      <div class="cat-card-name">${escapeHtml(cat.label)}</div>
    </a>`).join('');

  const content = `<div class="page">

    <div class="browse-hero">
      <span class="eyebrow">Судлах</span>
      <h1>Ангилалаар үзэх</h1>
      <p>Стрим олоорой. Ангилал сонгоод шууд дамжуулалт үзээрэй.</p>
    </div>

    <div class="section">
      <div class="section-head">
        <span class="section-title">Бүх ангилалууд</span>
      </div>
      <div class="cat-grid">${categoryCards}</div>
    </div>

    <div class="section" id="browseChannels">
      <div class="section-head">
        <span class="section-title">🔴 Бүх шууд сувгууд</span>
        <a class="section-link" href="/">Нүүр →</a>
      </div>
      <div id="browseGrid" class="channel-grid">
        <p class="form-note">Сувгуудыг уншиж байна…</p>
      </div>
    </div>

  </div>`;

  return renderLayout_withSidebar({
    title: 'NEXA | Ангилалаар үзэх',
    description: 'NEXA-ийн шууд ангилалууд болон сувгуудыг үзэх.',
    content,
    page: 'browse',
    activePath: '/browse',
    viewer,
    pageProps: { viewer }
  });
}

/* ─── AUTH PAGE ─────────────────────────────────────────────── */

function renderAuthPage({ viewer, next }) {
  const content = `<div class="page page-auth">
    <div class="auth-shell">
      <article class="auth-card reveal">
        <span class="eyebrow">Нэвтрэх</span>
        <h1>NEXA-д тавтай морил</h1>
        <form id="loginForm" class="stack-form">
          <label>
            <span>Имэйл</span>
            <input type="email" name="email" placeholder="та@nexa.mn" required />
          </label>
          <label>
            <span>Нууц үг</span>
            <input type="password" name="password" placeholder="Нууц үг" required />
          </label>
          <button class="button" type="submit">Нэвтрэх</button>
          <p id="loginStatus" class="form-note">Туршилтын бүртгэл ашиглаарай эсвэл шинэ бүртгэл үүсгэ.</p>
        </form>
      </article>
      <article class="auth-card reveal delay-1">
        <span class="eyebrow">Бүртгэл үүсгэх</span>
        <h1>Үзэгч эсвэл бүтээгчээр нэгдэх</h1>
        <form id="registerForm" class="stack-form">
          <label>
            <span>Нэр</span>
            <input type="text" name="name" maxlength="40" placeholder="Таны нэр" required />
          </label>
          <label>
            <span>Имэйл</span>
            <input type="email" name="email" placeholder="та@nexa.mn" required />
          </label>
          <label>
            <span>Нууц үг</span>
            <input type="password" name="password" minlength="8" placeholder="8-аас дээш тэмдэгт" required />
          </label>
          <label>
            <span>Эрх</span>
            <select name="role">
              <option value="viewer">👀 Үзэгч</option>
              <option value="creator">🎬 Бүтээгч</option>
            </select>
          </label>
          <button class="button" type="submit">Бүртгэл үүсгэх</button>
          <p id="registerStatus" class="form-note">Бүтээгчид нэвтэрсний дараа Студид хандах боломжтой.</p>
        </form>
      </article>
    </div>
  </div>`;

  return renderLayout_withSidebar({
    title: 'NEXA | Нэвтрэх',
    description: 'NEXA бүртгэлд нэвтрэх эсвэл шинэ бүртгэл үүсгэх.',
    content,
    page: 'auth',
    activePath: '/auth',
    viewer,
    pageProps: { viewer, next }
  });
}

/* ─── CHANNEL (WATCH) PAGE ───────────────────────────────────── */

function renderChannelPage({ viewer, slug }) {
  const content = `<div class="page-channel">
    <div class="channel-layout">

      <!-- Left: Player + info -->
      <div class="player-panel">

        <!-- Video stage -->
        <div class="player-stage" id="channelPlayer">
          <div class="player-art" id="playerArt">
            <div class="player-placeholder">
              <div class="player-placeholder-icon">📡</div>
              <h3>Шууд дамжуулалт уншиж байна…</h3>
              <p>Сувагт холбогдож байна. Түр хүлээнэ үү.</p>
            </div>
          </div>
        </div>

        <!-- Below player: channel info -->
        <div class="player-bottom">
          <div class="player-channel-avatar" id="playerAvatar">N</div>
          <div class="player-meta">
            <div class="player-title" id="playerTitle">Уншиж байна…</div>
            <div class="player-channel-name" id="playerChannelName">@nexa</div>
          </div>
          <div class="player-actions">
            <button class="button button-ghost button-sm" id="followBtn">+ Дагах</button>
            <button class="button button-sm" id="subscribeBtn">💚 Бүртгэл</button>
          </div>
        </div>

        <!-- Stats row -->
        <div class="player-stats-row" id="playerStatsRow">
          <div class="player-stat-item">
            <span class="label">Үзэгч</span>
            <strong id="statViewers">—</strong>
          </div>
          <div class="player-stat-item">
            <span class="label">Дагагч</span>
            <strong id="statFollowers">—</strong>
          </div>
          <div class="player-stat-item">
            <span class="label">Ангилал</span>
            <strong id="statCategory">—</strong>
          </div>
          <div class="player-stat-item">
            <span class="label">Байдал</span>
            <strong id="statStatus">—</strong>
          </div>
        </div>

        <!-- Tags -->
        <div class="tag-row" id="playerTags"></div>

        <!-- About + Donations -->
        <div style="display:grid;gap:16px;margin-top:20px">
          <div class="detail-card reveal" id="channelAbout"></div>
          <div class="detail-card reveal delay-1">
            <div class="section-head compact">
              <div>
                <span class="eyebrow">Дэмжигчид</span>
                <h2>Сүүлийн хандивууд</h2>
              </div>
            </div>
            <div id="donationFeed" class="donation-feed">
              <p class="form-note">Хандив байхгүй байна. Анхны дэмжигч болоорой!</p>
            </div>
          </div>

          <!-- Donation form -->
          <div class="detail-card reveal delay-2">
            <div class="section-head compact">
              <div>
                <span class="eyebrow">Дэмжих</span>
                <h2>Хандив илгээх</h2>
              </div>
            </div>
            <form id="donationForm" class="stack-form">
              <label>
                <span>Дүн ($)</span>
                <input type="number" name="amount" min="1" max="5000" value="5" required />
              </label>
              <label>
                <span>Мессеж</span>
                <textarea name="message" maxlength="120" rows="3" placeholder="Хандивтайгаа мессеж илгээх"></textarea>
              </label>
              <button class="button" type="submit">💚 Төлбөр хийх</button>
              <p id="donationStatus" class="form-note">Нэвтрэн орж хандив хийнэ үү.</p>
            </form>
          </div>

          <!-- Report form -->
          <div class="detail-card reveal delay-3">
            <div class="section-head compact">
              <div>
                <span class="eyebrow">Аюулгүй байдал</span>
                <h2>Суваг мэдүүлэх</h2>
              </div>
            </div>
            <form id="reportForm" class="stack-form">
              <label>
                <span>Шалтгаан</span>
                <select name="reason">
                  <option value="harassment">Дарамт</option>
                  <option value="hate">Үзэн ядалт</option>
                  <option value="spam">Spam</option>
                  <option value="copyright">Зохиогчийн эрх</option>
                </select>
              </label>
              <label>
                <span>Дэлгэрэнгүй</span>
                <textarea name="detail" maxlength="180" rows="3" placeholder="Болсон зүйлийг тайлбарла (6+ тэмдэгт)"></textarea>
              </label>
              <button class="button button-ghost button-sm" type="submit">📋 Мэдүүлэг илгээх</button>
              <p id="reportStatus" class="form-note">Мэдүүлэг шууд модерацийн дараалалд ордог.</p>
            </form>
          </div>
        </div>
      </div>

      <!-- Right: Live Chat -->
      <div class="chat-sidebar">
        <div class="chat-header">
          <h3>💬 Шууд чат</h3>
          <span class="chat-user-count"><span class="stat-dot"></span> <span id="chatOnlineCount">—</span> онлайн</span>
        </div>
        <div id="chatFeed" class="chat-feed">
          <p style="padding:10px;color:var(--muted);font-size:12px">Чатад холбогдож байна…</p>
        </div>
        <div class="chat-form-wrap">
          <form id="chatForm" class="stack-form">
            <div class="chat-input-row">
              <textarea name="body" maxlength="240" rows="1" placeholder="Мессеж бичих…"></textarea>
              <button class="button button-sm" type="submit">Илгээх</button>
            </div>
            <p id="chatStatus" class="form-note">Чатад нэвтрэх шаардлагатай.</p>
          </form>
        </div>
      </div>

    </div>
  </div>`;

  return renderLayout_withSidebar({
    title: 'NEXA | Суваг',
    description: 'NEXA шууд сувгийг үзэх, хандив илгээх, чатлах.',
    content,
    page: 'channel',
    activePath: '',
    viewer,
    pageProps: { viewer, slug }
  });
}

/* ─── STUDIO PAGE ───────────────────────────────────────────── */

function renderStudioPage({ viewer }) {
  const isAllowed = viewer && (viewer.role === 'creator' || viewer.role === 'moderator' || viewer.role === 'admin');

  if (!isAllowed) {
    const content = `<div class="page">${renderAccessBlock({
      eyebrow: 'Бүтээгчийн эрх',
      title: 'Студид бүтээгчийн бүртгэл шаардлагатай.',
      copy: 'Сувгаа удирдахын тулд бүтээгч, модератор эсвэл админ бүртгэлээр нэвтрэнэ үү.',
      primaryHref: '/auth?next=/studio',
      primaryLabel: 'Нэвтрэх',
      secondaryHref: '/',
      secondaryLabel: 'Нүүр хуудас'
    })}</div>`;
    return renderLayout_withSidebar({ title: 'NEXA | Студи', description: 'Бүтээгчийн студи.', content, page: 'studio', activePath: '/studio', viewer, pageProps: { viewer } });
  }

  const content = `<div class="page">

    <!-- Studio hero -->
    <div class="studio-hero reveal">
      <div class="hero-copy">
        <span class="eyebrow">Бүтээгчийн студи</span>
        <h1>Дамжуулалтаа удирдаарай,<br/>шууд эхлэж, өсөөрэй.</h1>
        <p>Stream гарчиг, ангилал, RTMP тохируулга, төлбөрийн байдал, токенуудыг нэг газраас удирдаарай.</p>
        <div class="hero-actions">
          <a class="button" href="/channel/nexa-arena">▶ Сувгаа харах</a>
        </div>
      </div>
      <div class="studio-metrics reveal delay-1" id="studioMetrics">
        <div class="metric-card">
          <div class="label">Миний сувгууд</div>
          <strong id="metAccessible">—</strong>
          <small>хандах боломжтой</small>
        </div>
        <div class="metric-card">
          <div class="label">Шууд байна</div>
          <strong id="metLive">—</strong>
          <small>дамжуулалтын өрөө</small>
        </div>
        <div class="metric-card">
          <div class="label">Орлого</div>
          <strong id="metRevenue">$—</strong>
          <small>нийт хандив</small>
        </div>
        <div class="metric-card">
          <div class="label">Мэдүүлэг</div>
          <strong id="metReports">—</strong>
          <small>хүлээгдэж байна</small>
        </div>
      </div>
    </div>

    <!-- Studio layout -->
    <div class="studio-layout">

      <!-- Left: stream settings -->
      <div class="detail-card reveal">
        <div class="section-head compact">
          <div>
            <span class="eyebrow">Дамжуулалтын тохируулга</span>
            <h2>Stream тохируулга</h2>
          </div>
        </div>
        <form id="studioForm" class="stack-form">
          <label>
            <span>Суваг</span>
            <select id="studioChannel" name="channelId"></select>
          </label>
          <label>
            <span>Stream гарчиг</span>
            <input type="text" id="studioTitle" name="title" maxlength="120" required />
          </label>
          <label>
            <span>Ангилал</span>
            <input type="text" id="studioCategory" name="category" maxlength="40" required />
          </label>
          <label>
            <span>Тоглуулах URL (HLS)</span>
            <input type="text" id="studioPlaybackUrl" name="playbackUrl" placeholder="https://…/stream.m3u8" />
          </label>
          <label>
            <span>Үзэгчийн холболтын URL</span>
            <input type="text" id="studioViewerJoinUrl" name="viewerJoinUrl" placeholder="https://…" />
          </label>
          <label>
            <span>RTMP дамжуулах URL</span>
            <input type="text" id="studioIngressUrl" name="ingressUrl" placeholder="rtmp://live.nexa.local/live" />
          </label>
          <label>
            <span>Stream түлхүүр</span>
            <input type="text" id="studioStreamKey" name="streamKey" placeholder="таны-stream-түлхүүр" />
          </label>
          <label class="toggle-row">
            <span>🔴 Шууд эхлэх</span>
            <input type="checkbox" id="studioLive" name="isLive" />
          </label>
          <button class="button" type="submit">💾 Хадгалах</button>
          <p class="form-note" id="studioStatus">Өөрчлөлтүүд шууд сувагт тусгагдана.</p>
        </form>
      </div>

      <!-- Right: credentials + tokens -->
      <div class="stack-column">
        <div class="detail-card reveal delay-1">
          <div class="section-head compact">
            <div>
              <span class="eyebrow">Шууд итгэмжлэл</span>
              <h2>Тохиргооны загвар</h2>
            </div>
          </div>
          <div id="liveBlueprint" class="blueprint-grid">
            <p class="form-note">Сувгаа сонгоод итгэмжлэлийг харна уу.</p>
          </div>
        </div>
        <div class="detail-card reveal delay-2">
          <div class="section-head compact">
            <div>
              <span class="eyebrow">Хандалтын токен</span>
              <h2>Нэвтрүүлэгч &amp; Үзэгч</h2>
            </div>
          </div>
          <div id="tokenPanel" class="token-panel">
            <p class="form-note">Суваг сонгосны дараа токен гарч ирнэ.</p>
          </div>
        </div>
        <div class="detail-card reveal delay-3">
          <div class="section-head compact">
            <div>
              <span class="eyebrow">Хийх ажлын жагсаалт</span>
              <h2>Дараагийн алхамууд</h2>
            </div>
          </div>
          <ul class="checklist">
            <li>Бодит RTMP холбох (Livepeer, LiveKit, Mux)</li>
            <li>Stripe түлхүүр нэмж хандив авах</li>
            <li>PostgreSQL холбож тогтвортой өгөгдөл хадгалах</li>
            <li>Модерацийн эрх болон auto-mod идэвхжүүлэх</li>
            <li>Cloudflare CDN тохируулж глобал хүргэлт хийх</li>
          </ul>
        </div>
      </div>

    </div>
  </div>`;

  return renderLayout_withSidebar({
    title: 'NEXA | Студи',
    description: 'Бүтээгчийн студи — stream тохируулга удирдах.',
    content,
    page: 'studio',
    activePath: '/studio',
    viewer,
    pageProps: { viewer }
  });
}

/* ─── ADMIN PAGE ────────────────────────────────────────────── */

function renderAdminPage({ viewer }) {
  const isAllowed = viewer && (viewer.role === 'moderator' || viewer.role === 'admin');

  if (!isAllowed) {
    const content = `<div class="page">${renderAccessBlock({
      eyebrow: 'Модераторын эрх',
      title: 'Удирдах хэрэгслэд модераторын эрх шаардлагатай.',
      copy: 'Мэдүүлэг, хориг, чатын модерацид хандахын тулд модератор эсвэл админаар нэвтрэнэ үү.',
      primaryHref: '/auth?next=/admin',
      primaryLabel: 'Нэвтрэх',
      secondaryHref: '/',
      secondaryLabel: 'Нүүр хуудас'
    })}</div>`;
    return renderLayout_withSidebar({ title: 'NEXA | Удирдах', description: 'Модерацийн самбар.', content, page: 'admin', activePath: '/admin', viewer, pageProps: { viewer } });
  }

  const content = `<div class="page">

    <!-- Admin hero -->
    <div class="studio-hero reveal">
      <div class="hero-copy">
        <span class="eyebrow">Модерацийн хяналт</span>
        <h1>Мэдүүлэг шалгах, хориглох,<br/>сувгийг унтраах.</h1>
        <p>Хэрэглэгчийн эрсдэл, нээлттэй мэдүүлэг, шууд аюулгүй байдлын арга хэмжээ, аудит — нэг самбараас.</p>
      </div>
      <div class="studio-metrics reveal delay-1" id="adminMetrics">
        <div class="metric-card">
          <div class="label">Нээлттэй мэдүүлэг</div>
          <strong id="metOpenReports">—</strong>
          <small>хүлээгдэж байна</small>
        </div>
        <div class="metric-card">
          <div class="label">Идэвхтэй хориг</div>
          <strong id="metActiveBans">—</strong>
          <small>түдгэлзүүлсэн</small>
        </div>
        <div class="metric-card">
          <div class="label">Шууд сувгууд</div>
          <strong id="metLiveChannels">—</strong>
          <small>одоо дамжуулж байна</small>
        </div>
        <div class="metric-card">
          <div class="label">Орлого</div>
          <strong id="metPaidRevenue">$—</strong>
          <small>нийт хандив</small>
        </div>
      </div>
    </div>

    <!-- Main admin layout -->
    <div class="admin-layout">
      <div class="detail-card reveal">
        <div class="section-head compact">
          <div>
            <span class="eyebrow">Мэдүүлгийн дараалал</span>
            <h2>Нээлттэй тохиолдлууд</h2>
          </div>
        </div>
        <div id="reportQueue" class="report-queue">
          <p class="form-note">Мэдүүлгүүдийг уншиж байна…</p>
        </div>
      </div>
      <div class="detail-card reveal delay-1">
        <div class="section-head compact">
          <div>
            <span class="eyebrow">Хэрэглэгч удирдах</span>
            <h2>Бүртгэл &amp; хориг</h2>
          </div>
        </div>
        <div id="userModeration" class="report-queue">
          <p class="form-note">Хэрэглэгчдийг уншиж байна…</p>
        </div>
      </div>
    </div>

    <div class="section" style="margin-top:20px">
      <div class="detail-card reveal">
        <div class="section-head compact">
          <div>
            <span class="eyebrow">Чатын модерация</span>
            <h2>Сүүлийн чат мессежүүд</h2>
          </div>
        </div>
        <div id="recentChats" class="report-queue">
          <p class="form-note">Чат мессежүүдийг уншиж байна…</p>
        </div>
      </div>
    </div>

  </div>`;

  return renderLayout_withSidebar({
    title: 'NEXA | Удирдах',
    description: 'Мэдүүлэг, хориг, сувгийн хяналтын модерацийн самбар.',
    content,
    page: 'admin',
    activePath: '/admin',
    viewer,
    pageProps: { viewer }
  });
}

/* ─── SANDBOX CHECKOUT ──────────────────────────────────────── */

function renderSandboxCheckoutPage({ viewer, donationId }) {
  const content = `<div class="page">
    <div class="access-panel">
      <span class="eyebrow">Туршилтын Төлбөр</span>
      <h1>Хандивыг дуусгах</h1>
      <p>Энэ бол туршилтын checkout. Stripe түлхүүр тохируулаагүй үед хандивын дамжилтыг шалгахад ашиглана.</p>
      <div class="checkout-card">
        <div id="checkoutSummary" class="stack-form"></div>
        <button class="button" id="sandboxConfirmButton" type="button" style="margin-top:14px;width:100%">✅ Хандивыг төлсөнд тэмдэглэх</button>
        <p id="checkoutStatus" class="form-note" style="margin-top:10px">Баталгаажуулсны дараа дэмжигчдийн жагсаалтад харагдана.</p>
      </div>
    </div>
  </div>`;

  return renderLayout_withSidebar({
    title: 'NEXA | Туршилтын Checkout',
    description: 'Туршилтын горимд хандивыг дуусгах.',
    content,
    page: 'sandbox-checkout',
    activePath: '',
    viewer,
    pageProps: { viewer, donationId }
  });
}

/* ─── 404 PAGE ──────────────────────────────────────────────── */

function renderNotFoundPage({ viewer }) {
  const content = `<div class="page">${renderAccessBlock({
    eyebrow: '404',
    title: 'Хуудас олдсонгүй.',
    copy: 'Нүүр хуудас руу буцах, суваг нээх, эсвэл бүтээгчийн студи руу орох.',
    primaryHref: '/',
    primaryLabel: '🏠 Нүүр хуудас',
    secondaryHref: '/studio',
    secondaryLabel: '🎬 Студи нээх'
  })}</div>`;

  return renderLayout_withSidebar({
    title: 'NEXA | Хуудас олдсонгүй',
    description: 'Энэ хуудас олдсонгүй.',
    content,
    page: 'not-found',
    activePath: '',
    viewer,
    pageProps: { viewer }
  });
}

module.exports = {
  renderHomePage,
  renderBrowsePage,
  renderAuthPage,
  renderChannelPage,
  renderStudioPage,
  renderAdminPage,
  renderSandboxCheckoutPage,
  renderNotFoundPage
};
