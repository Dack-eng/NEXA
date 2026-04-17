const { execSync } = require('child_process');

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

// prisma generate нь бодит database холболт шаардахгүй ч
// schema-д env() байвал Prisma шалгадаг тул placeholder тавина
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/nexa';
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

// Prisma client үүсгэнэ
run('prisma generate');

// DATABASE_URL болон DATABASE_PROVIDER=prisma тохируулсан үед л db push + seed хийнэ
const hasDb =
  process.env.DATABASE_URL &&
  process.env.DATABASE_PROVIDER === 'prisma';

if (hasDb) {
  console.log('DATABASE_URL олдлоо — Prisma client бэлэн.');
} else {
  console.log('DATABASE_URL тохируулагдаагүй — JSON store ашиглана.');
}
