const { config } = require('./config');
const { normalizeEmail, parseCookies, randomId, verifyPassword, hashPassword } = require('./security');

const SESSION_COOKIE = 'nexa_session';
const ROLE_RANK = {
  viewer: 1,
  creator: 2,
  moderator: 3,
  admin: 4
};

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    bio: user.bio,
    createdAt: user.createdAt
  };
}

function buildSessionCookie(sessionId, expiresAt) {
  const isSecure = config.forceSecureCookies || config.nodeEnv === 'production';
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Expires=${new Date(expiresAt).toUTCString()}`
  ];

  if (isSecure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function buildClearedSessionCookie() {
  const isSecure = config.forceSecureCookies || config.nodeEnv === 'production';
  const parts = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ];

  if (isSecure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function pruneSessions(store) {
  const now = Date.now();
  store.sessions = store.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
}

function isUserBanned(store, userId) {
  const now = Date.now();
  return store.bans.some((ban) => {
    if (ban.userId !== userId || ban.active === false) {
      return false;
    }

    if (!ban.expiresAt) {
      return true;
    }

    return new Date(ban.expiresAt).getTime() > now;
  });
}

function getCurrentSession(store, req) {
  pruneSessions(store);
  const cookies = parseCookies(req.headers.cookie || '');
  const sessionId = cookies[SESSION_COOKIE];

  if (!sessionId) {
    return null;
  }

  return store.sessions.find((session) => session.id === sessionId) || null;
}

function getCurrentUser(store, req) {
  const session = getCurrentSession(store, req);

  if (!session) {
    return null;
  }

  const user = store.users.find((candidate) => candidate.id === session.userId) || null;
  if (!user || user.status !== 'active' || isUserBanned(store, user.id)) {
    return null;
  }

  session.lastSeenAt = new Date().toISOString();
  return user;
}

function hasRole(user, minimumRole) {
  if (!user) {
    return false;
  }

  return (ROLE_RANK[user.role] || 0) >= (ROLE_RANK[minimumRole] || 0);
}

function createSession(store, userId) {
  pruneSessions(store);

  const now = Date.now();
  const session = {
    id: randomId('sess'),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + config.sessionTtlMs).toISOString(),
    lastSeenAt: new Date(now).toISOString()
  };

  store.sessions.push(session);
  return session;
}

function destroySession(store, req) {
  const session = getCurrentSession(store, req);
  if (!session) {
    return null;
  }

  store.sessions = store.sessions.filter((candidate) => candidate.id !== session.id);
  return session;
}

function validateRegistrationInput(payload) {
  const name = String(payload.name || '').trim();
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || '');

  if (name.length < 2 || name.length > 40) {
    return 'Name must be between 2 and 40 characters.';
  }

  if (!email || !email.includes('@')) {
    return 'A valid email is required.';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  return null;
}

function registerUser(store, payload) {
  const validationError = validateRegistrationInput(payload);
  if (validationError) {
    throw new Error(validationError);
  }

  const email = normalizeEmail(payload.email);
  if (store.users.some((user) => normalizeEmail(user.email) === email)) {
    throw new Error('That email is already registered.');
  }

  const credentials = hashPassword(payload.password);
  const user = {
    id: randomId('usr'),
    name: String(payload.name).trim(),
    email,
    role: payload.role === 'creator' ? 'creator' : 'viewer',
    status: 'active',
    bio: '',
    passwordHash: credentials.passwordHash,
    passwordSalt: credentials.passwordSalt,
    createdAt: new Date().toISOString()
  };

  store.users.push(user);
  return user;
}

function authenticateUser(store, payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || '');
  const user = store.users.find((candidate) => normalizeEmail(candidate.email) === email);

  if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    throw new Error('Email or password is incorrect.');
  }

  if (user.status !== 'active' || isUserBanned(store, user.id)) {
    throw new Error('This account cannot sign in right now.');
  }

  return user;
}

module.exports = {
  SESSION_COOKIE,
  sanitizeUser,
  buildSessionCookie,
  buildClearedSessionCookie,
  getCurrentSession,
  getCurrentUser,
  hasRole,
  createSession,
  destroySession,
  registerUser,
  authenticateUser,
  isUserBanned
};
