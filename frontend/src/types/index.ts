export type CameraGridSize = "small" | "medium" | "large";
export type StreamStatus = "recording" | "idle" | "error";
export type DeletionMode = "days" | "disk";

export type Camera = {
  id: string;
  name: string;
  rtsp_url: string | null;
  enabled: boolean;
  grid_order: number;
  grid_size: CameraGridSize;
  chunk_secs: number | null;
  onvif_host: string | null;
  onvif_port: number | null;
  onvif_username: string | null;
  onvif_password: string | null;
  onvif_profile_token: string | null;
  ptz_capable: boolean;
  created_at: string;
  updated_at: string;
};

export type CameraWithStatus = Camera & { status: StreamStatus };

export type Recording = {
  id: string;
  camera_id: string;
  segment_path: string;
  duration_sec: number;
  size_bytes: number;
  recorded_at: string;
  created_at: string;
};

export type RecordingsPage = {
  data: Recording[];
  page: number;
  limit: number;
  total: number;
};

export type Settings = {
  chunk_secs: number;
  retain_days: number;
  max_disk_gb: number;
  storage_path: string;
  deletion_mode: DeletionMode;
  onvif_scan_interval_mins: number;
  onvif_default_username: string;
  onvif_default_password: string;
};

export type UpdateSettingsBody = Partial<Settings>;

export type CreateCameraBody = {
  name: string;
  rtsp_url?: string | null;
  enabled?: boolean;
  chunk_secs?: number | null;
  grid_size?: CameraGridSize;
  onvif_host?: string | null;
  onvif_port?: number | null;
  onvif_username?: string | null;
  onvif_password?: string | null;
  onvif_profile_token?: string | null;
};

export type OnvifDiscoveredDevice = {
  xaddrs: string[];
  host: string;
  port: number;
};

export type OnvifProfile = {
  token: string;
  name: string;
  resolution?: { width: number; height: number };
};

export type UpdateCameraBody = Partial<CreateCameraBody> & {
  grid_order?: number;
  grid_size?: CameraGridSize;
};

export type ReorderItem = { id: string; grid_order: number };

export type WSMessage =
  | { type: "camera_status"; camera_id: string; status: StreamStatus; detail?: string }
  | { type: "disk_usage"; used_gb: number; total_gb: number; percent: number }
  | { type: "new_segment"; camera_id: string; segment_path: string; recorded_at: string }
  | { type: "cameras_updated" }
  | { type: "scan_result"; registered: number; updated: number; failed: number; scanned_at: string };
