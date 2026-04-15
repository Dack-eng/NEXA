const { execSync } = require('child_process');

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

// Prisma client үргэлж үүсгэнэ (database холболтгүйгээр ажилладаг)
run('prisma generate');

// DATABASE_URL болон DATABASE_PROVIDER=prisma тохируулсан үед л db push + seed хийнэ
const hasDb =
  process.env.DATABASE_URL &&
  process.env.DATABASE_PROVIDER === 'prisma';

if (hasDb) {
  console.log('DATABASE_URL олдлоо — schema push болон seed хийж байна...');
  run('prisma db push --skip-generate');
  run('node prisma/seed.js');
  console.log('Database амжилттай тохируулагдлаа.');
} else {
  console.log('DATABASE_URL тохируулагдаагүй — db push алгасав. JSON store ашиглана.');
}
