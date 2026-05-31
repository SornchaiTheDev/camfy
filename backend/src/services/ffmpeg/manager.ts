import type { Camera } from "../../types/db";
import { CameraProcess } from "./process";
import db from "../../db/client";
import { getStreamUri } from "../onvif/client";

function getGlobalChunkSecs(): number {
  const row = db.query<{ value: string }, []>("SELECT value FROM settings WHERE key = 'chunk_secs'").get();
  return row ? parseInt(JSON.parse(row.value), 10) : 300;
}

function getStoragePath(): string {
  const row = db.query<{ value: string }, []>("SELECT value FROM settings WHERE key = 'storage_path'").get();
  return row ? JSON.parse(row.value) : "./recordings";
}

// If camera is ONVIF-configured, fetch fresh stream URI and update DB
async function resolveRtspUrl(camera: Camera): Promise<Camera> {
  if (!camera.onvif_host || !camera.onvif_profile_token) return camera;

  try {
    const uri = await getStreamUri(
      {
        host: camera.onvif_host,
        port: camera.onvif_port ?? 80,
        username: camera.onvif_username ?? "",
        password: camera.onvif_password ?? "",
      },
      camera.onvif_profile_token
    );
    db.run("UPDATE cameras SET rtsp_url = ?, updated_at = ? WHERE id = ?", [
      uri,
      new Date().toISOString(),
      camera.id,
    ]);
    return { ...camera, rtsp_url: uri };
  } catch (err) {
    console.warn(`[ONVIF] Failed to resolve stream URI for ${camera.name}:`, (err as Error).message);
    return camera;
  }
}

class FFmpegManager {
  private processes = new Map<string, CameraProcess>();

  async startCamera(camera: Camera) {
    if (this.processes.has(camera.id)) return;
    if (!camera.enabled) return;

    const resolved = await resolveRtspUrl(camera);

    if (!resolved.rtsp_url) {
      console.warn(`[FFmpeg] No RTSP URL for camera "${camera.name}" — skipping`);
      return;
    }

    const chunkSecs = resolved.chunk_secs ?? getGlobalChunkSecs();
    const storagePath = getStoragePath();

    const proc = new CameraProcess(resolved, chunkSecs, storagePath, (_evt) => {});
    this.processes.set(camera.id, proc);
    proc.start();
  }

  async stopCamera(cameraId: string) {
    const proc = this.processes.get(cameraId);
    if (!proc) return;
    await proc.stop();
    this.processes.delete(cameraId);
  }

  async restartCamera(camera: Camera) {
    await this.stopCamera(camera.id);
    await this.startCamera(camera);
  }

  async stopAll() {
    await Promise.allSettled(
      [...this.processes.keys()].map((id) => this.stopCamera(id))
    );
  }

  async startAll() {
    const cameras = db
      .query<Camera, []>("SELECT * FROM cameras WHERE enabled = 1")
      .all();
    await Promise.allSettled(cameras.map((cam) => this.startCamera(cam)));
  }

  getStatus(cameraId: string): "recording" | "idle" | "error" {
    const proc = this.processes.get(cameraId);
    if (!proc) return "idle";
    return proc.isRunning ? "recording" : "idle";
  }

  isRunning(cameraId: string) {
    return this.processes.get(cameraId)?.isRunning ?? false;
  }
}

export const ffmpegManager = new FFmpegManager();
