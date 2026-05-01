CREATE TABLE IF NOT EXISTS users (
  user_id           TEXT PRIMARY KEY,
  device_identifier TEXT NOT NULL UNIQUE,
  device_type       TEXT NOT NULL DEFAULT 'android',
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  sync_version      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS analysis_sessions (
  session_id         TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(user_id),
  body_area          TEXT NOT NULL,
  session_date       TEXT NOT NULL,
  lighting_condition TEXT,
  notes              TEXT
);

CREATE TABLE IF NOT EXISTS images (
  image_id      TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES analysis_sessions(session_id),
  user_id       TEXT NOT NULL REFERENCES users(user_id),
  image_path    TEXT NOT NULL,
  image_hash    TEXT,
  width         INTEGER NOT NULL,
  height        INTEGER NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feature_analyses (
  analysis_id         TEXT PRIMARY KEY,
  image_id            TEXT NOT NULL REFERENCES images(image_id),
  session_id          TEXT NOT NULL REFERENCES analysis_sessions(session_id),
  user_id             TEXT NOT NULL REFERENCES users(user_id),
  spot_count          INTEGER NOT NULL,
  texture_score       REAL NOT NULL,
  average_pigmentation REAL NOT NULL,
  analysis_timestamp  TEXT NOT NULL,
  processing_time_ms  INTEGER,
  algorithm_version   TEXT NOT NULL DEFAULT 'v1.0',
  confidence_score    REAL NOT NULL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS baseline_references (
  baseline_id           TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(user_id),
  body_area             TEXT NOT NULL,
  analysis_id           TEXT NOT NULL REFERENCES feature_analyses(analysis_id),
  session_id            TEXT NOT NULL REFERENCES analysis_sessions(session_id),
  baseline_spot_count   INTEGER NOT NULL,
  baseline_texture_score REAL NOT NULL,
  baseline_pigmentation REAL NOT NULL,
  established_date      TEXT NOT NULL,
  is_active             INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS recommendations (
  recommendation_id TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(user_id),
  analysis_id       TEXT NOT NULL REFERENCES feature_analyses(analysis_id),
  session_id        TEXT NOT NULL REFERENCES analysis_sessions(session_id),
  status            TEXT NOT NULL,
  advice            TEXT NOT NULL,
  severity          REAL,
  generated_at      TEXT NOT NULL,
  viewed_at         TEXT,
  acted_upon        INTEGER NOT NULL DEFAULT 0
);
