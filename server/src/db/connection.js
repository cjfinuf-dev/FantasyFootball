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

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

// WARNING: sql.js holds the database entirely in memory and persists via writeFileSync.
// Concurrent writes from multiple processes or rapid sequential calls can cause data loss
// or a torn write (partial file). This architecture is intentional for single-process dev
// use; do NOT run multiple server instances against the same DB file.
function saveDb() {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    const tmpPath = dbPath + '.tmp';
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, dbPath);
  }
}

// Graceful shutdown — persist in-memory DB to disk before exit
function registerShutdownHandlers() {
  const shutdown = (signal) => {
    console.log(`[db] Received ${signal}, saving database...`);
    saveDb();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Register after module load so db ref is available when signals fire
registerShutdownHandlers();

module.exports = { getDb, saveDb };
