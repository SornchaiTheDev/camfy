PRAGMA foreign_keys = OFF;

CREATE TABLE cameras_new (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  rtsp_url            TEXT,
  enabled             INTEGER NOT NULL DEFAULT 1,
  grid_order          INTEGER NOT NULL DEFAULT 0,
  grid_size           TEXT NOT NULL DEFAULT 'medium',
  chunk_secs          INTEGER,
  onvif_host          TEXT,
  onvif_port          INTEGER DEFAULT 80,
  onvif_username      TEXT,
  onvif_password      TEXT,
  onvif_profile_token TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO cameras_new
  SELECT id, name, rtsp_url, enabled, grid_order, grid_size, chunk_secs,
         onvif_host, onvif_port, onvif_username, onvif_password, onvif_profile_token,
         created_at, updated_at
  FROM cameras;

DROP TABLE cameras;
ALTER TABLE cameras_new RENAME TO cameras;

PRAGMA foreign_keys = ON;
