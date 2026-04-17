const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let db = null;
let dbPath = null;

async function getDb() {
  if (db) return db;

  dbPath = path.resolve(process.env.DB_PATH || './data/fantasy.db');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  // sql.js runs entirely in-memory and persists via writeFileSync. WAL mode
  // is a no-op for the actual on-disk journal (there is no separate journal
  // file), but setting it keeps behavior aligned with any future migration
  // to native better-sqlite3 where WAL materially improves concurrency.
  try {
    db.run('PRAGMA journal_mode = WAL');
  } catch (err) {
    console.warn('[db] journal_mode=WAL not supported by this driver:', err?.message);
  }

  return db;
}

// WARNING: sql.js holds the database entirely in memory and persists via writeFileSync.
// Concurrent writes from multiple processes or rapid sequential calls can cause data loss
// or a torn write (partial file). This architecture is intentional for single-process dev
// use; do NOT run multiple server instances against the same DB file.
let _saving = Promise.resolve();

function saveDb() {
  _saving = _saving.then(() => {
    if (db && dbPath) {
      const data = db.export();
      const buffer = Buffer.from(data);
      const tmpPath = dbPath + '.tmp';
      fs.writeFileSync(tmpPath, buffer);
      fs.renameSync(tmpPath, dbPath);
    }
  }).catch(err => {
    console.error('[db] Save failed:', err);
  });
}

// Graceful shutdown — persist in-memory DB to disk before exit
// Shutdown persistence is handled by server/src/index.js's graceful shutdown.
// Do NOT register SIGTERM/SIGINT here — it races with the server's handler
// and calls process.exit() before the HTTP server finishes draining.

module.exports = { getDb, saveDb };
