import type { CameraGridSize, StreamStatus } from "./db";

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

export type UpdateCameraBody = Partial<CreateCameraBody> & {
  grid_order?: number;
  grid_size?: CameraGridSize;
};

export type ReorderItem = { id: string; grid_order: number };

export type UpdateSettingsBody = {
  chunk_secs?: number;
  retain_days?: number;
  max_disk_gb?: number;
  storage_path?: string;
  deletion_mode?: "days" | "disk";
};

export type WSMessage =
  | { type: "camera_status"; camera_id: string; status: StreamStatus; detail?: string }
  | { type: "disk_usage"; used_gb: number; total_gb: number; percent: number }
  | { type: "new_segment"; camera_id: string; segment_path: string; recorded_at: string }
  | { type: "cameras_updated" };
