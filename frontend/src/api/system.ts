import { apiFetch } from "./client";

export type SystemStatus = {
  cpu_percent: number;
  memory: {
    total_bytes: number;
    used_bytes: number;
    available_bytes: number;
    percent: number;
  };
  uptime_secs: number;
};

export type CameraLogs = {
  camera_id: string;
  lines: string[];
};

export type DiskUsage = { used_gb: number; total_gb: number; percent: number };

export type StreamsResponse = {
  cameras: { id: string; name: string; status: string }[];
  disk: DiskUsage;
};

export const getSystemStatus = () => apiFetch<SystemStatus>("/api/system");
export const getCameraLogs = (cameraId: string) => apiFetch<CameraLogs>(`/api/system/logs/${cameraId}`);
export const getStreams = () => apiFetch<StreamsResponse>("/api/streams");
