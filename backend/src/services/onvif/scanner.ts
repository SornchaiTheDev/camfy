import db from "../../db/client";
import { autoRegisterCameras } from "./autoRegister";
import { broadcast } from "../ws-broadcaster";

function getSetting<T>(key: string, fallback: T): T {
  const row = db.query<{ value: string }, [string]>("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? (JSON.parse(row.value) as T) : fallback;
}

let scanTimer: ReturnType<typeof setInterval> | null = null;
let running = false;

async function runScan() {
  if (running) return;
  running = true;
  try {
    const username = getSetting<string>("onvif_default_username", "admin");
    const password = getSetting<string>("onvif_default_password", "");
    const result = await autoRegisterCameras(username, password);
    broadcast({
      type: "scan_result",
      registered: result.registered.length,
      updated: result.updated.length,
      failed: result.failed.length,
      scanned_at: new Date().toISOString(),
    });
    if (result.registered.length > 0)
      console.log(`[scanner] Registered ${result.registered.length} new camera(s):`, result.registered.map((c) => c.name).join(", "));
    if (result.updated.length > 0)
      console.log(`[scanner] Updated IP for ${result.updated.length} camera(s):`, result.updated.map((c) => c.name).join(", "));
  } catch (err) {
    console.warn("[scanner] Scan error:", (err as Error).message);
    broadcast({ type: "scan_result", registered: 0, updated: 0, failed: 1, scanned_at: new Date().toISOString() });
  } finally {
    running = false;
  }
}

export function startOnvifScanner() {
  restartOnvifScanner();
}

export function restartOnvifScanner() {
  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = null;
  }
  const intervalMins = getSetting<number>("onvif_scan_interval_mins", 0);
  if (intervalMins <= 0) return;
  const ms = intervalMins * 60 * 1000;
  scanTimer = setInterval(runScan, ms);
  console.log(`[scanner] Auto-scan every ${intervalMins} min`);
}
