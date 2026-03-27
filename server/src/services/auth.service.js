const bcrypt = require('bcrypt');
const { getDb, saveDb } = require('../db/connection');
const { signToken } = require('../utils/jwt');

const SALT_ROUNDS = 12;

async function signup({ name, email, password }) {
  const db = await getDb();

  const existing = db.exec('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0 && existing[0].values.length > 0) {
    const err = new Error('An account with this email already exists.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  db.run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, passwordHash]);
  saveDb();

  const result = db.exec('SELECT id, name, email, created_at FROM users WHERE email = ?', [email]);
  const row = result[0].values[0];
  const user = { id: row[0], name: row[1], email: row[2], created_at: row[3] };
  const token = signToken({ userId: user.id, email: user.email });

  return { user, token };
}

async function signin({ email, password }) {
  const db = await getDb();

  const result = db.exec('SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?', [email]);
  if (result.length === 0 || result[0].values.length === 0) {
    const err = new Error('No account found with this email.');
    err.status = 401;
    throw err;
  }

  const row = result[0].values[0];
  const found = { id: row[0], name: row[1], email: row[2], password_hash: row[3], created_at: row[4] };

  const valid = await bcrypt.compare(password, found.password_hash);
  if (!valid) {
    const err = new Error('Incorrect password.');
    err.status = 401;
    throw err;
  }

  const user = { id: found.id, name: found.name, email: found.email, created_at: found.created_at };
  const token = signToken({ userId: user.id, email: user.email });

  return { user, token };
}

async function getUserById(id) {
  const db = await getDb();
  const result = db.exec('SELECT id, name, email, created_at FROM users WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  const row = result[0].values[0];
  return { id: row[0], name: row[1], email: row[2], created_at: row[3] };
}

module.exports = { signup, signin, getUserById };
