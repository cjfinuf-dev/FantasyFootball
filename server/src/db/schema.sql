CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

CREATE TABLE IF NOT EXISTS leagues (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'redraft',
  scoring_preset  TEXT NOT NULL DEFAULT 'standard',
  scoring_json    TEXT,
  roster_json     TEXT,
  league_size     INTEGER NOT NULL DEFAULT 12,
  season          TEXT NOT NULL,
  commissioner_id INTEGER NOT NULL REFERENCES users(id),
  settings_json   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS league_members (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('commissioner','member')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(league_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_lm_user ON league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_lm_league ON league_members(league_id);

CREATE TABLE IF NOT EXISTS news_articles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,
  source_url    TEXT NOT NULL,
  source_name   TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'news',
  player_name   TEXT,
  team_name     TEXT,
  source_count  INTEGER NOT NULL DEFAULT 1,
  published_at  TEXT NOT NULL,
  scraped_at    TEXT NOT NULL DEFAULT (datetime('now')),
  sweep_id      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_news_scraped ON news_articles(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_sweep ON news_articles(sweep_id);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_articles(category);
