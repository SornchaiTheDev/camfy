export type CameraGridSize = "small" | "medium" | "large";

export type Camera = {
  id: string;
  name: string;
  rtsp_url: string | null;
  enabled: 0 | 1;
  grid_order: number;
  grid_size: CameraGridSize;
  chunk_secs: number | null;
  onvif_host: string | null;
  onvif_port: number | null;
  onvif_username: string | null;
  onvif_password: string | null;
  onvif_profile_token: string | null;
  onvif_serial: string | null;
  onvif_epr_uuid: string | null;
  onvif_ptz: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type Recording = {
  id: string;
  camera_id: string;
  segment_path: string;
  duration_sec: number;
  size_bytes: number;
  recorded_at: string;
  created_at: string;
};

export type Setting = { key: string; value: string };

export type StreamStatus = "recording" | "idle" | "error";

export type CameraWithStatus = Camera & { status: StreamStatus };
