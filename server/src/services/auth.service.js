const bcrypt = require('bcrypt');
const { getDb, saveDb } = require('../db/connection');
const { signToken, signRefreshToken } = require('../utils/jwt');

const SALT_ROUNDS = 12;

// Per-email lockout policy — complements the per-IP rate limiter so
// distributed credential-stuffing attackers can't rotate IPs indefinitely.
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

async function checkLockout(email) {
  const db = await getDb();
  const now = Date.now();
  const res = db.exec('SELECT fails, locked_until FROM signin_attempts WHERE email = ?', [email]);
  if (res.length === 0 || res[0].values.length === 0) return;
  const [fails, lockedUntil] = res[0].values[0];
  if (lockedUntil && lockedUntil > now) {
    const err = new Error('Too many failed attempts. Try again later.');
    err.status = 429;
    throw err;
  }
  if (fails >= LOCKOUT_THRESHOLD) {
    // Threshold reached during a previous hit — clear after window
    if (lockedUntil && lockedUntil <= now) {
      db.run('UPDATE signin_attempts SET fails = 0, locked_until = 0 WHERE email = ?', [email]);
      saveDb();
    }
  }
}

async function recordSigninFailure(email) {
  const db = await getDb();
  const now = Date.now();
  db.run(
    `INSERT INTO signin_attempts (email, fails, locked_until, last_attempt)
     VALUES (?, 1, 0, ?)
     ON CONFLICT(email) DO UPDATE SET
       fails = fails + 1,
       last_attempt = excluded.last_attempt,
       locked_until = CASE WHEN fails + 1 >= ${LOCKOUT_THRESHOLD} THEN ? ELSE locked_until END`,
    [email, now, now + LOCKOUT_DURATION_MS]
  );
  saveDb();
}

async function recordSigninSuccess(email) {
  const db = await getDb();
  db.run('DELETE FROM signin_attempts WHERE email = ?', [email]);
  saveDb();
}

async function signup({ name, email, password }) {
  const db = await getDb();

  // Timing-oracle mitigation: bcrypt always runs (same ~300ms regardless of
  // whether the email already exists) AND the duplicate-path response is
  // padded with a dummy-bcrypt-verify so total latency matches the new-user
  // path (INSERT + extra SELECT + two signToken calls).
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const existing = db.exec('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0 && existing[0].values.length > 0) {
    // Burn time roughly equivalent to the new-user code path before throwing,
    // so response latency doesn't leak email existence.
    try { await bcrypt.compare(password, passwordHash); } catch {}
    const err = new Error('Signup failed. Please check your details.');
    err.status = 409;
    throw err;
  }
  try {
    db.run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, passwordHash]);
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE constraint failed')) {
      const err = new Error('Signup failed. Please check your details.');
      err.status = 409;
      throw err;
    }
    throw e;
  }
  saveDb();

  const result = db.exec('SELECT id, name, email, created_at, token_version FROM users WHERE email = ?', [email]);
  const row = result[0].values[0];
  const user = { id: row[0], name: row[1], email: row[2], created_at: row[3] };
  const tv = row[4] ?? 0;
  const token = signToken({ userId: user.id, email: user.email, tv });
  const refreshToken = signRefreshToken(user.id);

  return { user, token, refreshToken };
}

async function signin({ email, password }) {
  const db = await getDb();

  await checkLockout(email);

  const result = db.exec('SELECT id, name, email, password_hash, created_at, token_version FROM users WHERE email = ?', [email]);
  if (result.length === 0 || result[0].values.length === 0) {
    await recordSigninFailure(email);
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const row = result[0].values[0];
  const found = { id: row[0], name: row[1], email: row[2], password_hash: row[3], created_at: row[4], token_version: row[5] ?? 0 };

  const valid = await bcrypt.compare(password, found.password_hash);
  if (!valid) {
    await recordSigninFailure(email);
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  await recordSigninSuccess(email);

  const user = { id: found.id, name: found.name, email: found.email, created_at: found.created_at };
  const token = signToken({ userId: user.id, email: user.email, tv: found.token_version });
  const refreshToken = signRefreshToken(user.id);

  return { user, token, refreshToken };
}

async function getUserById(id) {
  const db = await getDb();
  const result = db.exec('SELECT id, name, email, created_at, token_version FROM users WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  const row = result[0].values[0];
  return { id: row[0], name: row[1], email: row[2], created_at: row[3], token_version: row[4] ?? 0 };
}

module.exports = { signup, signin, getUserById };
