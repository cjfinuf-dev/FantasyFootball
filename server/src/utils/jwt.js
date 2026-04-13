const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('[jwt] JWT_SECRET environment variable is not set — refusing to start without a signing secret');
}
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || SECRET;
const ACCESS_EXPIRES_IN = '30m';
const REFRESH_EXPIRES_IN = '24h';

// In-memory token blacklist (JTI -> expiry timestamp)
const _blacklist = new Map();

// Purge expired entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of _blacklist) {
    if (exp < now) _blacklist.delete(jti);
  }
}, 15 * 60 * 1000).unref();

function blacklistToken(jti, expiresAt) {
  _blacklist.set(jti, expiresAt || Date.now() + 24 * 60 * 60 * 1000);
}

function isBlacklisted(jti) {
  return _blacklist.has(jti);
}

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_EXPIRES_IN, algorithm: 'HS256' });
}

function signRefreshToken(userId) {
  const jti = crypto.randomUUID();
  return jwt.sign({ userId, type: 'refresh', jti }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN, algorithm: 'HS256' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, REFRESH_SECRET, { algorithms: ['HS256'] });
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  if (payload.jti && isBlacklisted(payload.jti)) {
    throw new Error('Token has been revoked');
  }
  return payload;
}

module.exports = { signToken, signRefreshToken, verifyToken, verifyRefreshToken, blacklistToken, isBlacklisted };
