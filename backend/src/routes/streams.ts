import { Elysia } from "elysia";

function httpError(status: number, msg: string) {
  return new Response(msg, { status });
}
import { join } from "path";
import db from "../db/client";
import { ffmpegManager } from "../services/ffmpeg/manager";
import type { Camera } from "../types/db";
import { getDiskUsageBytes, getDiskTotalBytes } from "../services/disk";

function getStoragePath(): string {
  const row = db.query<{ value: string }, []>("SELECT value FROM settings WHERE key = 'storage_path'").get();
  return row ? JSON.parse(row.value) : "./recordings";
}

export const streamsRoute = new Elysia()
  .get("/api/streams", () => {
    const cameras = db.query<Camera, []>("SELECT * FROM cameras").all();
    const storagePath = getStoragePath();
    const usedBytes = getDiskUsageBytes(storagePath);
    const { total } = getDiskTotalBytes(storagePath);

    return {
      cameras: cameras.map((cam) => ({
        id: cam.id,
        name: cam.name,
        status: ffmpegManager.getStatus(cam.id),
      })),
      disk: {
        used_gb: Math.round((usedBytes / 1024 ** 3) * 100) / 100,
        total_gb: Math.round((total / 1024 ** 3) * 100) / 100,
        percent: total > 0 ? Math.round((usedBytes / total) * 100) : 0,
      },
    };
  })

  // Live HLS playlist
  .get("/live/:cameraId/live.m3u8", async ({ params, set }) => {
    const cam = db.query<Camera, [string]>("SELECT * FROM cameras WHERE id = ?").get(params.cameraId);
    if (!cam) return httpError(404, "Not found");

    const path = join(getStoragePath(), params.cameraId, "live.m3u8");
    const file = Bun.file(path);
    if (!(await file.exists())) return httpError(404, "Playlist not ready");

    set.headers["Content-Type"] = "application/vnd.apple.mpegurl";
    set.headers["Cache-Control"] = "no-cache, no-store";
    set.headers["Access-Control-Allow-Origin"] = "*";
    return file;
  })

  // Live HLS segments
  .get("/live/:cameraId/:segment", async ({ params, set }) => {
    if (!params.segment.endsWith(".ts")) return httpError(400, "Bad request");
    const path = join(getStoragePath(), params.cameraId, params.segment);
    const file = Bun.file(path);
    if (!(await file.exists())) return httpError(404, "Segment not found");

    set.headers["Content-Type"] = "video/mp2t";
    set.headers["Cache-Control"] = "public, max-age=3600";
    set.headers["Access-Control-Allow-Origin"] = "*";
    return file;
  })

  // VOD playlist
  .get("/vod/:cameraId/:date/archive.m3u8", async ({ params, set }) => {
    const cam = db.query<Camera, [string]>("SELECT * FROM cameras WHERE id = ?").get(params.cameraId);
    if (!cam) return httpError(404, "Not found");

    const path = join(getStoragePath(), params.cameraId, params.date, "archive.m3u8");
    const file = Bun.file(path);
    if (!(await file.exists())) return httpError(404, "Playlist not found");

    set.headers["Content-Type"] = "application/vnd.apple.mpegurl";
    set.headers["Cache-Control"] = "public, max-age=60";
    set.headers["Access-Control-Allow-Origin"] = "*";
    return file;
  })

  // VOD segments
  .get("/vod/:cameraId/:date/:segment", async ({ params, set }) => {
    if (!params.segment.endsWith(".ts")) return httpError(400, "Bad request");
    const path = join(getStoragePath(), params.cameraId, params.date, params.segment);
    const file = Bun.file(path);
    if (!(await file.exists())) return httpError(404, "Segment not found");

    set.headers["Content-Type"] = "video/mp2t";
    set.headers["Cache-Control"] = "public, max-age=3600";
    set.headers["Access-Control-Allow-Origin"] = "*";
    return file;
  });
