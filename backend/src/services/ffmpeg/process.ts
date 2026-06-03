import { join, relative } from "path";
import { mkdirSync, watch } from "fs";
import type { Camera } from "../../types/db";
import { buildFFmpegArgs } from "./args";
import { broadcast } from "../ws-broadcaster";
import db from "../../db/client";
import { nanoid } from "nanoid";

async function probeDuration(absPath: string): Promise<number> {
  try {
    const proc = Bun.spawn([
      "ffprobe", "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      absPath,
    ], { stdout: "pipe", stderr: "ignore" });
    const text = await new Response(proc.stdout).text();
    const val = parseFloat(text.trim());
    return isNaN(val) ? 0 : Math.round(val);
  } catch {
    return 0;
  }
}

type StreamEventPayload = {
  camera_id: string;
  event: "started" | "stopped" | "error" | "respawn";
  detail?: string;
};

const MAX_RESPAWNS = 10;
const RESPAWN_BASE_MS = 5_000;
const STABLE_THRESHOLD_MS = 60_000;

const LOG_BUFFER_SIZE = 200;

export class CameraProcess {
  private child: ReturnType<typeof Bun.spawn> | null = null;
  private respawnTimer: ReturnType<typeof setTimeout> | null = null;
  private respawnCount = 0;
  private startedAt = 0;
  private stopped = false;
  private watcher: ReturnType<typeof watch> | null = null;
  private logLines: string[] = [];

  getLogs(): string[] {
    return [...this.logLines];
  }

  constructor(
    readonly camera: Camera,
    readonly chunkSecs: number,
    readonly storagePath: string,
    private onEvent: (payload: StreamEventPayload) => void
  ) {}

  start() {
    this.stopped = false;
    this._spawn();
  }

  async stop() {
    this.stopped = true;
    if (this.respawnTimer) {
      clearTimeout(this.respawnTimer);
      this.respawnTimer = null;
    }
    this.watcher?.close();
    this.watcher = null;

    if (!this.child) return;
    this.child.kill(15); // SIGTERM
    await Promise.race([
      this.child.exited,
      new Promise<void>((r) => setTimeout(r, 3000)),
    ]);
    if (!this.child.killed) {
      this.child.kill(9); // SIGKILL
    }
    this.child = null;
  }

  get isRunning() {
    return this.child !== null && !this.child.killed;
  }

  private _spawn() {
    const camDir = join(this.storagePath, this.camera.id);
    const dateStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const archiveDir = join(camDir, dateStr);
    mkdirSync(archiveDir, { recursive: true }); // creates camDir + dateDir

    const args = buildFFmpegArgs(this.camera, this.chunkSecs, this.storagePath, dateStr);
    this.child = Bun.spawn(["ffmpeg", ...args], {
      stdout: "ignore",
      stderr: "pipe",
    });

    this.startedAt = Date.now();
    this.onEvent({ camera_id: this.camera.id, event: "started" });
    broadcast({ type: "camera_status", camera_id: this.camera.id, status: "recording" });

    this._pipeStderr(this.child.stderr!);

    this._watchSegments(archiveDir);

    this.child.exited.then((code) => {
      this._onExit(code);
    });
  }

  private async _pipeStderr(stderr: ReadableStream<Uint8Array>) {
    const decoder = new TextDecoder();
    let partial = "";
    const reader = stderr.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = partial + decoder.decode(value, { stream: true });
        const lines = text.split("\n");
        partial = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ts = new Date().toISOString();
          this.logLines.push(`[${ts}] ${line}`);
          if (this.logLines.length > LOG_BUFFER_SIZE) this.logLines.shift();
        }
      }
    } catch {
      // stream closed — normal on stop
    }
  }

  private _onExit(code: number | null) {
    this.watcher?.close();
    this.watcher = null;
    this.child = null;

    if (this.stopped) return;

    const uptime = Date.now() - this.startedAt;
    if (uptime >= STABLE_THRESHOLD_MS) {
      this.respawnCount = 0;
    }

    if (this.respawnCount >= MAX_RESPAWNS) {
      this.onEvent({ camera_id: this.camera.id, event: "error", detail: "max respawns reached" });
      broadcast({ type: "camera_status", camera_id: this.camera.id, status: "error", detail: "max respawns reached" });
      return;
    }

    const delay = Math.min(RESPAWN_BASE_MS * Math.pow(2, this.respawnCount), 300_000);
    this.respawnCount++;
    this.onEvent({ camera_id: this.camera.id, event: "respawn", detail: `in ${delay}ms (attempt ${this.respawnCount})` });
    broadcast({ type: "camera_status", camera_id: this.camera.id, status: "idle", detail: `respawning in ${Math.round(delay / 1000)}s` });

    this.respawnTimer = setTimeout(() => {
      if (!this.stopped) this._spawn();
    }, delay);
  }

  private _watchSegments(archiveDir: string) {
    const debounceMap = new Map<string, ReturnType<typeof setTimeout>>();

    try {
      // Watch archiveDir directly — recursive on Linux (inotify) doesn't work for subdirs
      this.watcher = watch(archiveDir, (_event, filename) => {
        if (!filename || !filename.endsWith(".ts")) return;

        if (debounceMap.has(filename)) clearTimeout(debounceMap.get(filename)!);
        debounceMap.set(
          filename,
          setTimeout(() => {
            debounceMap.delete(filename);
            this._onSegmentReady(join(archiveDir, filename));
          }, 500)
        );
      });
    } catch (e) {
      console.warn(`[watch] Failed to watch ${archiveDir}:`, (e as Error).message);
    }
  }

  private async _onSegmentReady(absPath: string) {
    try {
      const stat = Bun.file(absPath).size;
      if (stat === 0) return;

      const relPath = relative(this.storagePath, absPath);
      const now = new Date().toISOString();
      const id = nanoid();

      const duration = await probeDuration(absPath);

      const stmt = db.prepare(
        `INSERT OR IGNORE INTO recordings (id, camera_id, segment_path, duration_sec, size_bytes, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      stmt.run(id, this.camera.id, relPath, duration, stat, now);

      broadcast({ type: "new_segment", camera_id: this.camera.id, segment_path: relPath, recorded_at: now });
    } catch {
      // file may have been deleted already — silently ignore
    }
  }
}
