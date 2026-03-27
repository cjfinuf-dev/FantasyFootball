const fs = require('fs');
const path = require('path');
const { getDb, saveDb } = require('./connection');

async function initDatabase() {
  const db = await getDb();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.run(schema);
  saveDb();
  console.log('[DB] Schema initialized successfully');
}

module.exports = { initDatabase };
