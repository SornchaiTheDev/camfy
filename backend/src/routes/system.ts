import { Elysia, t } from "elysia";
import { ffmpegManager } from "../services/ffmpeg/manager";
import db from "../db/client";
import type { Camera } from "../types/db";

async function readFile(path: string): Promise<string> {
  return Bun.file(path).text();
}

async function getCpuPercent(): Promise<number> {
  const parse = (raw: string) => {
    const line = raw.split("\n").find((l) => l.startsWith("cpu "))!;
    const parts = line.trim().split(/\s+/).slice(1).map(Number);
    const idle = parts[3] + (parts[4] ?? 0); // idle + iowait
    const total = parts.reduce((a, b) => a + b, 0);
    return { idle, total };
  };

  const raw1 = await readFile("/proc/stat");
  const s1 = parse(raw1);
  await Bun.sleep(250);
  const raw2 = await readFile("/proc/stat");
  const s2 = parse(raw2);

  const dTotal = s2.total - s1.total;
  const dIdle = s2.idle - s1.idle;
  if (dTotal === 0) return 0;
  return Math.round(((dTotal - dIdle) / dTotal) * 1000) / 10;
}

async function getMemory() {
  const raw = await readFile("/proc/meminfo");
  const get = (key: string) => {
    const m = raw.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"));
    return m ? parseInt(m[1], 10) * 1024 : 0; // kB → bytes
  };
  const total = get("MemTotal");
  const available = get("MemAvailable");
  const used = total - available;
  return {
    total_bytes: total,
    used_bytes: used,
    available_bytes: available,
    percent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
  };
}

async function getUptime(): Promise<number> {
  const raw = await readFile("/proc/uptime");
  return parseFloat(raw.split(" ")[0]);
}

export const systemRoute = new Elysia({ prefix: "/api/system" })
  .get("/", async () => {
    const [cpu, memory, uptime_secs] = await Promise.all([
      getCpuPercent(),
      getMemory(),
      getUptime(),
    ]);
    return { cpu_percent: cpu, memory, uptime_secs };
  })
  .get("/logs/:cameraId", ({ params: { cameraId } }) => {
    const cam = db.query<Camera, [string]>("SELECT * FROM cameras WHERE id = ?").get(cameraId);
    if (!cam) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    return { camera_id: cameraId, lines: ffmpegManager.getLogs(cameraId) };
  }, {
    params: t.Object({ cameraId: t.String() }),
  });
