PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cameras (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  rtsp_url    TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 1,
  grid_order  INTEGER NOT NULL DEFAULT 0,
  grid_size   TEXT NOT NULL DEFAULT 'medium',
  chunk_secs  INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recordings (
  id           TEXT PRIMARY KEY,
  camera_id    TEXT NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  segment_path TEXT NOT NULL UNIQUE,
  duration_sec REAL NOT NULL DEFAULT 0,
  size_bytes   INTEGER NOT NULL DEFAULT 0,
  recorded_at  TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recordings_camera ON recordings(camera_id);
CREATE INDEX IF NOT EXISTS idx_recordings_date   ON recordings(recorded_at);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings VALUES ('chunk_secs',    '300');
INSERT OR IGNORE INTO settings VALUES ('retain_days',   '30');
INSERT OR IGNORE INTO settings VALUES ('max_disk_gb',   '100');
INSERT OR IGNORE INTO settings VALUES ('storage_path',  '"./recordings"');
INSERT OR IGNORE INTO settings VALUES ('deletion_mode', '"days"');
