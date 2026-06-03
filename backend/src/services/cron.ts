import { join } from "path";
import { rmSync } from "fs";
import db from "../db/client";
import type { Recording } from "../types/db";
import { broadcast } from "./ws-broadcaster";
import { getDiskUsageBytes, getDiskStats } from "./disk";

function getSetting<T>(key: string, fallback: T): T {
  const row = db.query<{ value: string }, [string]>("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? (JSON.parse(row.value) as T) : fallback;
}

function deleteRecording(rec: Recording, storagePath: string) {
  try {
    rmSync(join(storagePath, rec.segment_path));
  } catch {
    // file may already be gone
  }
  db.run("DELETE FROM recordings WHERE id = ?", [rec.id]);
}

export function runDeletionPolicy() {
  const mode = getSetting<string>("deletion_mode", "days");
  const storagePath = getSetting<string>("storage_path", "./recordings");

  if (mode === "days") {
    const retainDays = getSetting<number>("retain_days", 30);
    const cutoff = new Date(Date.now() - retainDays * 86400_000).toISOString();
    const stale = db
      .query<Recording, [string]>("SELECT * FROM recordings WHERE recorded_at < ?")
      .all(cutoff);
    for (const rec of stale) deleteRecording(rec, storagePath);
  } else if (mode === "disk") {
    const maxBytes = getSetting<number>("max_disk_gb", 100) * 1024 ** 3;
    let used = getDiskUsageBytes(storagePath);
    if (used <= maxBytes) return;

    const oldest = db
      .query<Recording, []>("SELECT * FROM recordings ORDER BY recorded_at ASC")
      .all();
    for (const rec of oldest) {
      if (used <= maxBytes) break;
      const approxSize = rec.size_bytes;
      deleteRecording(rec, storagePath);
      used -= approxSize;
    }
  }

  // broadcast updated disk usage (actual filesystem fill)
  const storagePath2 = getSetting<string>("storage_path", "./recordings");
  const { used_bytes, total_bytes, percent } = getDiskStats(storagePath2);
  broadcast({
    type: "disk_usage",
    used_gb: Math.round((used_bytes / 1024 ** 3) * 100) / 100,
    total_gb: Math.round((total_bytes / 1024 ** 3) * 100) / 100,
    percent,
  });
}

export function startCron() {
  const INTERVAL_MS = 60 * 60 * 1000; // hourly
  setInterval(runDeletionPolicy, INTERVAL_MS);
  // run once on boot after a short delay
  setTimeout(runDeletionPolicy, 10_000);
}
