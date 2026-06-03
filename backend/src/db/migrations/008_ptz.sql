-- PTZ capability flag (1 = camera exposes an ONVIF PTZConfiguration)
ALTER TABLE cameras ADD COLUMN onvif_ptz INTEGER NOT NULL DEFAULT 0;
