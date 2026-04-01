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
  invite_code     TEXT UNIQUE,
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
  image_url     TEXT,
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

CREATE TABLE IF NOT EXISTS situation_events (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id         TEXT,
  player_name       TEXT NOT NULL,
  team              TEXT,
  event_type        TEXT NOT NULL,
  impact            REAL NOT NULL,
  confidence        REAL NOT NULL DEFAULT 0.5,
  source            TEXT NOT NULL DEFAULT 'rss',
  source_article_id INTEGER REFERENCES news_articles(id),
  description       TEXT,
  detected_at       TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at        TEXT,
  active            INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_sit_player ON situation_events(player_id);
CREATE INDEX IF NOT EXISTS idx_sit_team ON situation_events(team);
CREATE INDEX IF NOT EXISTS idx_sit_active ON situation_events(active, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_sit_type ON situation_events(event_type);

CREATE TABLE IF NOT EXISTS historical_stats (
  player_id    TEXT NOT NULL,
  season       INTEGER NOT NULL,
  games_played INTEGER NOT NULL,
  total_pts    REAL NOT NULL,
  avg_pts      REAL NOT NULL,
  PRIMARY KEY (player_id, season)
);

CREATE TABLE IF NOT EXISTS draft_results (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id        INTEGER NOT NULL UNIQUE REFERENCES leagues(id) ON DELETE CASCADE,
  picks_json       TEXT NOT NULL,
  draft_order_json TEXT NOT NULL,
  phase            TEXT NOT NULL DEFAULT 'complete',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_draft_league ON draft_results(league_id);
