const fs = require('fs');
const { config } = require('./config');
const { hashPassword } = require('./security');

const STORE_VERSION = 2;
let prismaSingleton = null;

const SEED_USER_IDS = {
  admin: 'usr-admin',
  creator: 'usr-creator',
  moderator: 'usr-moderator',
  viewer: 'usr-viewer'
};

function buildSeedUser({ id, name, email, password, role, bio }) {
  const credentials = hashPassword(password);

  return {
    id,
    name,
    email,
    role,
    status: 'active',
    bio,
    passwordHash: credentials.passwordHash,
    passwordSalt: credentials.passwordSalt,
    createdAt: new Date('2026-03-31T00:00:00.000Z').toISOString()
  };
}

function buildSeedUsers() {
  return [
    buildSeedUser({
      id: SEED_USER_IDS.admin,
      name: 'NEXA Admin',
      email: 'admin@nexa.local',
      password: 'Admin123!',
      role: 'admin',
      bio: 'Платформын үйл ажиллагаа болон бодлогын хяналт.'
    }),
    buildSeedUser({
      id: SEED_USER_IDS.creator,
      name: 'NEXA Creator',
      email: 'creator@nexa.local',
      password: 'Creator123!',
      role: 'creator',
      bio: 'Туршилтын сувгуудын гол бүтээгчийн бүртгэл.'
    }),
    buildSeedUser({
      id: SEED_USER_IDS.moderator,
      name: 'NEXA Moderator',
      email: 'moderator@nexa.local',
      password: 'Moderator123!',
      role: 'moderator',
      bio: 'Мэдүүлэг шалгах туршилтын модерацийн бүртгэл.'
    }),
    buildSeedUser({
      id: SEED_USER_IDS.viewer,
      name: 'NEXA Viewer',
      email: 'viewer@nexa.local',
      password: 'Viewer123!',
      role: 'viewer',
      bio: 'Checkout болон мэдүүлгийн туршилтын үзэгчийн бүртгэл.'
    })
  ];
}

function buildChannel({
  id,
  slug,
  name,
  handle,
  title,
  category,
  description,
  accent,
  surface,
  isLive,
  viewers,
  followers,
  tags
}) {
  return {
    id,
    slug,
    name,
    handle,
    ownerUserId: SEED_USER_IDS.creator,
    title,
    category,
    description,
    accent,
    surface,
    isLive,
    viewers,
    followers,
    tags,
    startedAt: isLive ? '2026-03-31T11:15:00.000Z' : null,
    stream: {
      provider: 'manual',
      roomName: `nexa-${slug}`,
      ingressUrl: 'rtmp://live.nexa.local/live',
      streamKey: `${slug}-stream-key-demo`,
      playbackUrl: '',
      viewerJoinUrl: '',
      latency: 'low-latency',
      region: 'global'
    },
    moderation: {
      state: 'approved',
      automodLevel: 'standard',
      matureContent: false,
      lastReviewedAt: '2026-03-31T10:00:00.000Z'
    }
  };
}

function buildDefaultStore() {
  return {
    version: STORE_VERSION,
    users: buildSeedUsers(),
    sessions: [],
    channels: [
      buildChannel({
        id: 'nexa-arena',
        slug: 'nexa-arena',
        name: 'NEXA Arena',
        handle: '@nexaarena',
        title: 'NEXA багтайгаа дээд зэрэглэл рүү!',
        category: 'Gaming',
        description:
          'Өрсөлдөөнт тоглоом, нийгэмлэгийн scrims, шууд шинжилгээ — үргэлж идэвхтэй үзэгчдэд зориулсан.',
        accent: '#3ce0d1',
        surface: '#14203a',
        isLive: true,
        viewers: 1482,
        followers: 18600,
        tags: ['FPS', 'Ranked', 'Community']
      }),
      buildChannel({
        id: 'nexa-music',
        slug: 'nexa-music',
        name: 'NEXA Pulse',
        handle: '@nexapulse',
        title: 'Шөнийн шууд тоглолт болон shoutout хүсэлтүүд',
        category: 'Music',
        description:
          'Шууд тоглолт, фэны хүсэлт, хандивын shoutout — бүтээгчдэд зориулсан хөгжмийн өрөө.',
        accent: '#ff7b6b',
        surface: '#301d2d',
        isLive: true,
        viewers: 734,
        followers: 9200,
        tags: ['Live set', 'Requests', 'VIP']
      }),
      buildChannel({
        id: 'nexa-talk',
        slug: 'nexa-talk',
        name: 'NEXA Sessions',
        handle: '@nexasessions',
        title: 'Үүсгэн байгуулагчийн түүх, үзэгчдийн дуудлага, Q&A',
        category: 'Talk',
        description:
          'Ярилцлага, нийгэмлэгийн асуулт, premium гишүүнчлэл — яриа голлосон формат.',
        accent: '#ffd166',
        surface: '#322c12',
        isLive: false,
        viewers: 0,
        followers: 6400,
        tags: ['Podcast', 'Q&A', 'Business']
      }),
      buildChannel({
        id: 'nexa-irl',
        slug: 'nexa-irl',
        name: 'Temujin Live',
        handle: '@temujinlive',
        title: 'Хотоор явж байна — нэгдээрэй!',
        category: 'IRL',
        description: 'Гадаа болон аялалын бодит амьдрал. Аяллыг дагаж, бодол санаагаа шууд хуваалцаарай.',
        accent: '#a78bfa',
        surface: '#1a1030',
        isLive: true,
        viewers: 2891,
        followers: 31200,
        tags: ['IRL', 'Travel', 'Outdoors']
      }),
      buildChannel({
        id: 'nexa-code',
        slug: 'nexa-code',
        name: 'CodeWithSaraa',
        handle: '@codewithsaraa',
        title: 'Full-stack апп эхнээс нь шууд бүтээж байна',
        category: 'Software & Technology',
        description: 'Шууд кодинг — веб хөгжүүлэлт, системийн дизайн, нээлттэй эх кодын хувь нэмэр.',
        accent: '#38bdf8',
        surface: '#0d1f2d',
        isLive: true,
        viewers: 943,
        followers: 14700,
        tags: ['Coding', 'Web Dev', 'Open Source']
      }),
      buildChannel({
        id: 'nexa-sports',
        slug: 'nexa-sports',
        name: 'StrikerFC',
        handle: '@strikerfc',
        title: 'Чемпионуудын лигийн watchalong + шууд сэтгэгдэл',
        category: 'Sports',
        description: 'Шилдэг спортын watchalong, fantasy шинжилгээ, бодит фэнд зориулсан шууд тоглолтын хариу үйлдэл.',
        accent: '#f97316',
        surface: '#1f1208',
        isLive: true,
        viewers: 5120,
        followers: 47800,
        tags: ['Football', 'Watchalong', 'Fantasy']
      }),
      buildChannel({
        id: 'nexa-art',
        slug: 'nexa-art',
        name: 'InkByMunko',
        handle: '@inkbymunko',
        title: 'Дижитал зураг — дүрийн дизайн #44 дугаар хичээл',
        category: 'Art',
        description: 'Бүтээлч процессийг эхнээс нь эцэс хүртэл харааарай. Чатлаж, санал өгч, захиалга хийгээрэй.',
        accent: '#f472b6',
        surface: '#210d1c',
        isLive: false,
        viewers: 0,
        followers: 8350,
        tags: ['Digital Art', 'Character Design', 'Commission']
      }),
      buildChannel({
        id: 'nexa-asmr',
        slug: 'nexa-asmr',
        name: 'Serene ASMR',
        handle: '@sereneaSmr',
        title: 'Бороо + зөөлөн дарц — шөнийн тайвшрал',
        category: 'ASMR',
        description: 'Платформын хамгийн тайван өнцөг. Дарц, шивнэлт, ambient дуу — гүн анхаарал, унтах зориулалттай.',
        accent: '#67e8f9',
        surface: '#071e24',
        isLive: true,
        viewers: 421,
        followers: 5900,
        tags: ['ASMR', 'Relaxing', 'Sleep']
      }),
      buildChannel({
        id: 'nexa-fitness',
        slug: 'nexa-fitness',
        name: 'FitWithBold',
        handle: '@fitwithbold',
        title: 'Өглөөний HIIT — 45 мин тоног хэрэгслийгүй дасгал',
        category: 'Fitness & Health',
        description: 'Өдөр бүрийн шууд дасгал. Тоног хэрэгсэл шаардахгүй. Давталтаа чатаар хуваалцаж, зөвлөгөө ав.',
        accent: '#4ade80',
        surface: '#0a1f0d',
        isLive: false,
        viewers: 0,
        followers: 12400,
        tags: ['Fitness', 'HIIT', 'Workout']
      }),
      buildChannel({
        id: 'nexa-poker',
        slug: 'nexa-poker',
        name: 'AllIn_Batzul',
        handle: '@allinbatzul',
        title: 'Том мөнгөний cash game — $5/$10 NL Holdem',
        category: 'Gambling',
        description: 'Шууд покерийн сэтгэгдэл, гарын шинжилгээ, нийгэмлэгийн хэлэлцүүлэг — туршлагатай тоглогчоос.',
        accent: '#facc15',
        surface: '#1a1500',
        isLive: true,
        viewers: 1837,
        followers: 22100,
        tags: ['Poker', 'Cash Game', 'Strategy']
      }),
      buildChannel({
        id: 'nexa-cooking',
        slug: 'nexa-cooking',
        name: 'NomadChef',
        handle: '@nomadchef',
        title: 'Уламжлалт монгол буузаа шууд хийж байна — суралцаарай!',
        category: 'Food & Drink',
        description: 'Уламжлалт болон fusion жор шууд хоол хийж харуулна. Асуулт тавьж, зөвлөгөө аваарай.',
        accent: '#fb923c',
        surface: '#1f0e05',
        isLive: false,
        viewers: 0,
        followers: 9600,
        tags: ['Cooking', 'Mongolian', 'Food']
      })
    ],
    donations: [
      {
        id: 'don-1001',
        channelId: 'nexa-arena',
        userId: SEED_USER_IDS.viewer,
        supporterName: 'Batz',
        amount: 25,
        currency: 'usd',
        message: 'NEXA аль хэдийн сайхан харагдаж байна. Үргэлжлүүл!',
        status: 'paid',
        paymentProvider: 'legacy',
        paymentSessionId: '',
        createdAt: '2026-03-31T12:21:00.000Z',
        paidAt: '2026-03-31T12:21:00.000Z'
      },
      {
        id: 'don-1002',
        channelId: 'nexa-arena',
        userId: SEED_USER_IDS.viewer,
        supporterName: 'Munkh',
        amount: 15,
        currency: 'usd',
        message: 'Цааш нь ranked тоглоом тоглоорой!',
        status: 'paid',
        paymentProvider: 'legacy',
        paymentSessionId: '',
        createdAt: '2026-03-31T12:34:00.000Z',
        paidAt: '2026-03-31T12:34:00.000Z'
      },
      {
        id: 'don-1003',
        channelId: 'nexa-music',
        userId: SEED_USER_IDS.viewer,
        supporterName: 'Saraa',
        amount: 40,
        currency: 'usd',
        message: 'Шөнийн стримд нэг л тайван дуу тоглоосой!',
        status: 'paid',
        paymentProvider: 'legacy',
        paymentSessionId: '',
        createdAt: '2026-03-31T12:47:00.000Z',
        paidAt: '2026-03-31T12:47:00.000Z'
      }
    ],
    reports: [
      {
        id: 'rep-1001',
        channelId: 'nexa-talk',
        reporterUserId: SEED_USER_IDS.viewer,
        reason: 'harassment',
        detail: 'Нээлтийн өмнө дуудлагын дарааллын бодлого болон мессежийн модерацийг шалгана уу.',
        status: 'open',
        createdAt: '2026-03-31T13:02:00.000Z',
        resolvedAt: null,
        resolvedBy: null,
        actionNotes: ''
      }
    ],
    bans: [],
    auditLogs: [
      {
        id: 'audit-setup',
        actorUserId: SEED_USER_IDS.admin,
        action: 'platform.seeded',
        targetType: 'system',
        targetId: 'nexa',
        detail: 'Анхны үйлдвэрлэлийн түвшний туршилтын өгөгдөл үүсгэгдлээ.',
        createdAt: '2026-03-31T13:00:00.000Z'
      }
    ],
    chats: [
      {
        id: 'msg-1001',
        channelId: 'nexa-arena',
        userId: SEED_USER_IDS.viewer,
        body: 'NEXA чат шууд ажиллаж байна. Энэ бол анхны мессеж.',
        status: 'visible',
        createdAt: '2026-03-31T13:05:00.000Z',
        deletedAt: null,
        metadata: {
          role: 'viewer'
        }
      },
      {
        id: 'msg-1002',
        channelId: 'nexa-arena',
        userId: SEED_USER_IDS.creator,
        body: 'Бүтээгч онлайн байна. Шууд үзэгчдийн чатыг энэ өрөөнд туршаарай.',
        status: 'visible',
        createdAt: '2026-03-31T13:06:00.000Z',
        deletedAt: null,
        metadata: {
          role: 'creator'
        }
      }
    ]
  };
}

// Serverless орчин шалгана (Netlify, AWS Lambda, гэх мэт)
function isServerless() {
  return !!(
    process.env.NETLIFY ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  );
}

// Serverless дээр /tmp ашиглана (зөвхөн /tmp бичигдэх боломжтой)
function getWritableStorePath() {
  if (isServerless()) {
    return '/tmp/nexa-store.json';
  }
  return config.storePath;
}

function ensureDataDir() {
  if (isServerless()) {
    return; // Serverless дээр /var/task read-only тул алгасна
  }
  try {
    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }
  } catch (_) {
    // Read-only filesystem бол алгасна
  }
}

function applyChannelDefaults(channel) {
  return {
    ownerUserId: SEED_USER_IDS.creator,
    startedAt: null,
    tags: [],
    stream: {
      provider: 'manual',
      roomName: `nexa-${channel.slug || channel.id || 'room'}`,
      ingressUrl: 'rtmp://live.nexa.local/live',
      streamKey: `${channel.slug || channel.id || 'channel'}-stream-key-demo`,
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
    },
    ...channel,
    stream: {
      provider: 'manual',
      roomName: `nexa-${channel.slug || channel.id || 'room'}`,
      ingressUrl: 'rtmp://live.nexa.local/live',
      streamKey: `${channel.slug || channel.id || 'channel'}-stream-key-demo`,
      playbackUrl: '',
      viewerJoinUrl: '',
      latency: 'low-latency',
      region: 'global',
      ...(channel.stream || {})
    },
    moderation: {
      state: 'approved',
      automodLevel: 'standard',
      matureContent: false,
      lastReviewedAt: null,
      ...(channel.moderation || {})
    }
  };
}

function normalizeStore(store) {
  const seeded = buildDefaultStore();
  const migrated = {
    version: STORE_VERSION,
    users: Array.isArray(store.users) && store.users.length ? store.users : seeded.users,
    sessions: Array.isArray(store.sessions) ? store.sessions : [],
    channels: Array.isArray(store.channels) && store.channels.length ? store.channels : seeded.channels,
    donations: Array.isArray(store.donations) ? store.donations : seeded.donations,
    reports: Array.isArray(store.reports) ? store.reports : seeded.reports,
    bans: Array.isArray(store.bans) ? store.bans : [],
    auditLogs: Array.isArray(store.auditLogs) ? store.auditLogs : seeded.auditLogs,
    chats: Array.isArray(store.chats) ? store.chats : seeded.chats
  };

  migrated.channels = migrated.channels.map(applyChannelDefaults);
  migrated.donations = migrated.donations.map((donation) => ({
    currency: 'usd',
    status: 'paid',
    paymentProvider: 'legacy',
    paymentSessionId: '',
    paidAt: donation.createdAt || new Date().toISOString(),
    userId: donation.userId || null,
    ...donation
  }));

  migrated.users = migrated.users.map((user) => ({
    status: 'active',
    bio: '',
    ...user
  }));

  migrated.chats = migrated.chats.map((chat) => ({
    status: 'visible',
    deletedAt: null,
    metadata: {},
    ...chat
  }));

  const existingIds = new Set(migrated.users.map((user) => user.id));
  seeded.users.forEach((seedUser) => {
    if (!existingIds.has(seedUser.id)) {
      migrated.users.push(seedUser);
    }
  });

  return migrated;
}

function isPrismaMode() {
  return config.databaseProvider === 'prisma';
}

function getPrismaClient() {
  if (!isPrismaMode()) {
    return null;
  }

  if (!prismaSingleton) {
    const { PrismaClient } = require('@prisma/client');
    prismaSingleton = new PrismaClient();
  }

  return prismaSingleton;
}

function toIso(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDate(value) {
  return value ? new Date(value) : null;
}

async function ensureStore() {
  if (isPrismaMode()) {
    const prisma = getPrismaClient();
    const userCount = await prisma.user.count();

    if (userCount === 0) {
      await persistPrismaStore(buildDefaultStore());
    }

    return;
  }

  ensureDataDir();

  const writablePath = getWritableStorePath();
  const hasWritable = fs.existsSync(writablePath);
  const hasBundled = fs.existsSync(config.storePath);

  if (!hasWritable && !hasBundled) {
    try {
      fs.writeFileSync(writablePath, JSON.stringify(buildDefaultStore(), null, 2));
    } catch (_) {
      // Бичиж чадахгүй бол default store санах ойд байна
    }
  }
}

async function readPrismaStore() {
  const prisma = getPrismaClient();
  const [users, sessions, channels, donations, reports, bans, auditLogs, chats] = await Promise.all([
    prisma.user.findMany(),
    prisma.session.findMany(),
    prisma.channel.findMany(),
    prisma.donation.findMany(),
    prisma.report.findMany(),
    prisma.ban.findMany(),
    prisma.auditLog.findMany(),
    prisma.chatMessage.findMany()
  ]);

  return normalizeStore({
    version: STORE_VERSION,
    users: users.map((item) => ({
      ...item,
      createdAt: toIso(item.createdAt)
    })),
    sessions: sessions.map((item) => ({
      ...item,
      createdAt: toIso(item.createdAt),
      expiresAt: toIso(item.expiresAt),
      lastSeenAt: toIso(item.lastSeenAt)
    })),
    channels: channels.map((item) => ({
      ...item,
      startedAt: toIso(item.startedAt),
      stream: item.stream || {},
      moderation: item.moderation || {}
    })),
    donations: donations.map((item) => ({
      ...item,
      createdAt: toIso(item.createdAt),
      paidAt: toIso(item.paidAt),
      providerReceipt: item.providerReceipt || null
    })),
    reports: reports.map((item) => ({
      ...item,
      createdAt: toIso(item.createdAt),
      resolvedAt: toIso(item.resolvedAt)
    })),
    bans: bans.map((item) => ({
      ...item,
      createdAt: toIso(item.createdAt),
      expiresAt: toIso(item.expiresAt)
    })),
    auditLogs: auditLogs.map((item) => ({
      ...item,
      createdAt: toIso(item.createdAt)
    })),
    chats: chats.map((item) => ({
      ...item,
      createdAt: toIso(item.createdAt),
      deletedAt: toIso(item.deletedAt),
      metadata: item.metadata || {}
    }))
  });
}

async function readStore() {
  await ensureStore();

  if (isPrismaMode()) {
    return readPrismaStore();
  }

  // Serverless дээр /tmp-г эхлээд уншина, дараа нь bundled файлыг
  const writablePath = getWritableStorePath();
  const readPath = fs.existsSync(writablePath) ? writablePath : config.storePath;

  try {
    const raw = fs.readFileSync(readPath, 'utf8');
    const parsed = JSON.parse(raw);
    const normalized = normalizeStore(parsed);

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      try { fs.writeFileSync(writablePath, JSON.stringify(normalized, null, 2)); } catch (_) {}
    }

    return normalized;
  } catch (_) {
    // Файл байхгүй эсвэл уншиж чадахгүй — default store ашиглана
    const seeded = buildDefaultStore();
    try { fs.writeFileSync(writablePath, JSON.stringify(seeded, null, 2)); } catch (_2) {}
    return seeded;
  }
}

async function persistPrismaStore(store) {
  const prisma = getPrismaClient();
  const normalized = normalizeStore(store);

  await prisma.$transaction([
    prisma.chatMessage.deleteMany(),
    prisma.session.deleteMany(),
    prisma.donation.deleteMany(),
    prisma.report.deleteMany(),
    prisma.ban.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.channel.deleteMany(),
    prisma.user.deleteMany()
  ]);

  if (normalized.users.length) {
    await prisma.user.createMany({
      data: normalized.users.map((item) => ({
        ...item,
        createdAt: toDate(item.createdAt)
      }))
    });
  }

  if (normalized.channels.length) {
    await prisma.channel.createMany({
      data: normalized.channels.map((item) => ({
        ...item,
        startedAt: toDate(item.startedAt),
        stream: item.stream || {},
        moderation: item.moderation || {}
      }))
    });
  }

  if (normalized.sessions.length) {
    await prisma.session.createMany({
      data: normalized.sessions.map((item) => ({
        ...item,
        createdAt: toDate(item.createdAt),
        expiresAt: toDate(item.expiresAt),
        lastSeenAt: toDate(item.lastSeenAt)
      }))
    });
  }

  if (normalized.donations.length) {
    await prisma.donation.createMany({
      data: normalized.donations.map((item) => ({
        ...item,
        createdAt: toDate(item.createdAt),
        paidAt: toDate(item.paidAt),
        providerReceipt: item.providerReceipt || null
      }))
    });
  }

  if (normalized.reports.length) {
    await prisma.report.createMany({
      data: normalized.reports.map((item) => ({
        ...item,
        createdAt: toDate(item.createdAt),
        resolvedAt: toDate(item.resolvedAt)
      }))
    });
  }

  if (normalized.bans.length) {
    await prisma.ban.createMany({
      data: normalized.bans.map((item) => ({
        ...item,
        createdAt: toDate(item.createdAt),
        expiresAt: toDate(item.expiresAt)
      }))
    });
  }

  if (normalized.auditLogs.length) {
    await prisma.auditLog.createMany({
      data: normalized.auditLogs.map((item) => ({
        ...item,
        createdAt: toDate(item.createdAt)
      }))
    });
  }

  if (normalized.chats.length) {
    await prisma.chatMessage.createMany({
      data: normalized.chats.map((item) => ({
        ...item,
        createdAt: toDate(item.createdAt),
        deletedAt: toDate(item.deletedAt),
        metadata: item.metadata || {}
      }))
    });
  }
}

async function writeStore(store) {
  if (isPrismaMode()) {
    await persistPrismaStore(store);
    return;
  }

  fs.writeFileSync(getWritableStorePath(), JSON.stringify(store, null, 2));
}

async function mutateStore(mutator) {
  const store = await readStore();
  const result = mutator(store);
  await writeStore(store);
  return result;
}

module.exports = {
  STORE_VERSION,
  SEED_USER_IDS,
  buildDefaultStore,
  ensureStore,
  readStore,
  writeStore,
  mutateStore
};
