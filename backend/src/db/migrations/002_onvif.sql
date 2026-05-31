ALTER TABLE cameras ADD COLUMN onvif_host TEXT;
ALTER TABLE cameras ADD COLUMN onvif_port INTEGER DEFAULT 80;
ALTER TABLE cameras ADD COLUMN onvif_username TEXT;
ALTER TABLE cameras ADD COLUMN onvif_password TEXT;
ALTER TABLE cameras ADD COLUMN onvif_profile_token TEXT;
