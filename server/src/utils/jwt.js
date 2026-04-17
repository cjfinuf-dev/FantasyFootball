const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDb, saveDb } = require('../db/connection');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('[jwt] JWT_SECRET environment variable is not set — refusing to start without a signing secret');
}
if (SECRET.startsWith('CHANGE_ME')) {
  throw new Error('[jwt] JWT_SECRET is still a placeholder — generate a real secret with: openssl rand -hex 64');
}
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!REFRESH_SECRET) {
  throw new Error('[jwt] JWT_REFRESH_SECRET environment variable is not set — must be a separate secret from JWT_SECRET');
}
if (REFRESH_SECRET.startsWith('CHANGE_ME')) {
  throw new Error('[jwt] JWT_REFRESH_SECRET is still a placeholder — generate a real secret with: openssl rand -hex 64');
}
const ACCESS_EXPIRES_IN = '30m';
const REFRESH_EXPIRES_IN = '24h';

// Refresh-token revocation list is persisted to SQLite so signouts survive a
// restart. An in-memory Set mirrors the DB for fast verify-time lookups; it is
// hydrated lazily on first use and kept in sync by blacklistToken.
const _blacklistCache = new Set();
let _blacklistHydrated = false;

async function hydrateBlacklist() {
  if (_blacklistHydrated) return;
  const db = await getDb();
  db.run('DELETE FROM revoked_tokens WHERE expires_at < ?', [Date.now()]);
  const res = db.exec('SELECT jti FROM revoked_tokens');
  if (res.length > 0) {
    for (const row of res[0].values) _blacklistCache.add(row[0]);
  }
  _blacklistHydrated = true;
}

// Purge expired entries every 15 minutes (both in-memory and persisted).
setInterval(async () => {
  try {
    const db = await getDb();
    const now = Date.now();
    const res = db.exec('SELECT jti FROM revoked_tokens WHERE expires_at < ?', [now]);
    if (res.length > 0) {
      for (const row of res[0].values) _blacklistCache.delete(row[0]);
    }
    db.run('DELETE FROM revoked_tokens WHERE expires_at < ?', [now]);
    saveDb();
  } catch (err) {
    console.error('[jwt] Blacklist purge failed:', err);
  }
}, 15 * 60 * 1000).unref();

async function blacklistToken(jti, expiresAt) {
  const exp = expiresAt || Date.now() + 24 * 60 * 60 * 1000;
  const db = await getDb();
  db.run(
    'INSERT OR REPLACE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)',
    [jti, exp]
  );
  saveDb();
  _blacklistCache.add(jti);
}

async function isBlacklisted(jti) {
  if (!_blacklistHydrated) await hydrateBlacklist();
  return _blacklistCache.has(jti);
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

async function verifyRefreshToken(token) {
  const payload = jwt.verify(token, REFRESH_SECRET, { algorithms: ['HS256'] });
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  if (payload.jti && await isBlacklisted(payload.jti)) {
    throw new Error('Token has been revoked');
  }
  return payload;
}

module.exports = { signToken, signRefreshToken, verifyToken, verifyRefreshToken, blacklistToken, isBlacklisted };
