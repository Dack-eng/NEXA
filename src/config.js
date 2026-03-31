const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

function asBoolean(value, fallback = false) {
  if (value == null) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const config = {
  rootDir: ROOT_DIR,
  dataDir: DATA_DIR,
  publicDir: PUBLIC_DIR,
  storePath: STORE_PATH,
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appOrigin: process.env.APP_ORIGIN || '',
  databaseProvider: process.env.DATABASE_PROVIDER || 'json',
  databaseUrl: process.env.DATABASE_URL || '',
  sessionTtlMs: Number(process.env.SESSION_TTL_HOURS || 168) * 60 * 60 * 1000,
  paymentProvider: process.env.PAYMENT_PROVIDER || 'sandbox',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  liveProvider: process.env.LIVE_PROVIDER || 'manual',
  livekitUrl: process.env.LIVEKIT_URL || '',
  livekitApiKey: process.env.LIVEKIT_API_KEY || '',
  livekitApiSecret: process.env.LIVEKIT_API_SECRET || '',
  livekitRtmpUrl: process.env.LIVEKIT_RTMP_URL || '',
  forceSecureCookies: asBoolean(process.env.SECURE_COOKIES, false)
};

module.exports = {
  config
};
