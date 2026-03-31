const { PrismaClient } = require('@prisma/client');
const { buildDefaultStore } = require('../src/store');

async function main() {
  const prisma = new PrismaClient();
  const store = buildDefaultStore();

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

  await prisma.user.createMany({
    data: store.users.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt)
    }))
  });

  await prisma.channel.createMany({
    data: store.channels.map((item) => ({
      ...item,
      startedAt: item.startedAt ? new Date(item.startedAt) : null,
      stream: item.stream,
      moderation: item.moderation
    }))
  });

  await prisma.session.createMany({
    data: store.sessions.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      expiresAt: new Date(item.expiresAt),
      lastSeenAt: new Date(item.lastSeenAt)
    }))
  });

  await prisma.donation.createMany({
    data: store.donations.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      paidAt: item.paidAt ? new Date(item.paidAt) : null,
      checkoutUrl: item.checkoutUrl || '',
      providerReceipt: item.providerReceipt || null
    }))
  });

  await prisma.report.createMany({
    data: store.reports.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      resolvedAt: item.resolvedAt ? new Date(item.resolvedAt) : null
    }))
  });

  await prisma.ban.createMany({
    data: store.bans.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      expiresAt: item.expiresAt ? new Date(item.expiresAt) : null
    }))
  });

  await prisma.auditLog.createMany({
    data: store.auditLogs.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt)
    }))
  });

  await prisma.chatMessage.createMany({
    data: store.chats.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
      metadata: item.metadata || {}
    }))
  });

  await prisma.$disconnect();
  console.log('Prisma seed completed for NEXA.');
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
