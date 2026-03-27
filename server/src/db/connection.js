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

function saveDb() {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

module.exports = { getDb, saveDb };
