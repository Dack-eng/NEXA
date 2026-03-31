const crypto = require('crypto');

function randomId(prefix) {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return {
    passwordHash,
    passwordSalt: salt
  };
}

function verifyPassword(password, passwordHash, passwordSalt) {
  const candidate = crypto.scryptSync(password, passwordSalt, 64);
  const target = Buffer.from(passwordHash, 'hex');

  if (candidate.length !== target.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidate, target);
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce((accumulator, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) {
      return accumulator;
    }

    accumulator[rawKey] = decodeURIComponent(rest.join('='));
    return accumulator;
  }, {});
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function signJwt(payload, secret, header = { alg: 'HS256', typ: 'JWT' }) {
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64');
  const encodedSignature = signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

  return `${unsigned}.${encodedSignature}`;
}

function secureEqualStrings(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = {
  randomId,
  normalizeEmail,
  hashPassword,
  verifyPassword,
  parseCookies,
  signJwt,
  secureEqualStrings
};
