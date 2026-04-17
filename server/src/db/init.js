const fs = require('fs');
const path = require('path');
const { getDb, saveDb } = require('./connection');

async function initDatabase() {
  const db = await getDb();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.run(schema);

  // Migrate: add image_url column if missing
  try {
    const cols = db.exec("PRAGMA table_info(news_articles)");
    const hasImageUrl = cols.length > 0 && cols[0].values.some(row => row[1] === 'image_url');
    if (!hasImageUrl) {
      db.run("ALTER TABLE news_articles ADD COLUMN image_url TEXT");
    }
  } catch {}

  // Migrate: add invite_code column to leagues if missing
  try {
    const cols = db.exec("PRAGMA table_info(leagues)");
    const hasInviteCode = cols.length > 0 && cols[0].values.some(row => row[1] === 'invite_code');
    if (!hasInviteCode) {
      db.run("ALTER TABLE leagues ADD COLUMN invite_code TEXT UNIQUE");
    }
  } catch {}

  // Refresh-token revocation list — persisted so signouts survive a restart.
  db.run(`
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_revoked_tokens_exp ON revoked_tokens(expires_at)');

  // Per-user token version — lets us invalidate all issued access tokens by
  // bumping the counter (e.g. on signout-all / password change).
  try {
    const cols = db.exec("PRAGMA table_info(users)");
    const hasTokenVersion = cols.length > 0 && cols[0].values.some(row => row[1] === 'token_version');
    if (!hasTokenVersion) {
      db.run("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0");
    }
  } catch {}

  // Failed-signin counter for per-email lockout beyond per-IP rate limits.
  db.run(`
    CREATE TABLE IF NOT EXISTS signin_attempts (
      email TEXT PRIMARY KEY,
      fails INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0,
      last_attempt INTEGER NOT NULL DEFAULT 0
    )
  `);

  saveDb();
  console.log('[DB] Schema initialized successfully');
}

module.exports = { initDatabase };
