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

  saveDb();
  console.log('[DB] Schema initialized successfully');
}

module.exports = { initDatabase };
