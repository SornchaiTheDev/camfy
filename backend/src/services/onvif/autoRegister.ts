import { nanoid } from "nanoid";
import db from "../../db/client";
import type { Camera } from "../../types/db";
import { discoverOnvif } from "./discovery";
import { getDeviceInfo, getProfiles } from "./client";
import { ffmpegManager } from "../ffmpeg/manager";
import { broadcast } from "../ws-broadcaster";

export type DeduplicateResult = {
  merged: { kept: Camera; removed: Camera[] }[];
};

export async function deduplicateCameras(): Promise<DeduplicateResult> {
  const result: DeduplicateResult = { merged: [] };

  // Find duplicate groups by serial, then by EPR UUID
  const dedupByColumn = async (col: "onvif_serial" | "onvif_epr_uuid") => {
    const dupes = db
      .query<{ val: string }, []>(
        `SELECT ${col} as val FROM cameras WHERE ${col} IS NOT NULL AND ${col} != ''
         GROUP BY ${col} HAVING COUNT(*) > 1`
      )
      .all();

    for (const { val } of dupes) {
      const group = db
        .query<Camera, [string]>(
          `SELECT * FROM cameras WHERE ${col} = ? ORDER BY updated_at DESC`
        )
        .all(val);

      if (group.length < 2) continue;

      const [keep, ...remove] = group;
      for (const cam of remove) {
        await ffmpegManager.stopCamera(cam.id);
        db.run("DELETE FROM cameras WHERE id = ?", [cam.id]);
      }
      result.merged.push({ kept: keep, removed: remove });
    }
  };

  await dedupByColumn("onvif_serial");
  await dedupByColumn("onvif_epr_uuid");

  if (result.merged.length > 0) broadcast({ type: "cameras_updated" });

  return result;
}

export type AutoRegisterResult = {
  registered: Camera[];
  updated: Camera[];   // IP changed, existing camera updated
  skipped: string[];
  failed: { host: string; error: string }[];
};

export async function autoRegisterCameras(
  username: string,
  password: string
): Promise<AutoRegisterResult> {
  const result: AutoRegisterResult = { registered: [], updated: [], skipped: [], failed: [] };

  const discovered = await discoverOnvif(5000);
  if (discovered.length === 0) return result;

  const maxOrder = db
    .query<{ max: number | null }, []>("SELECT MAX(grid_order) as max FROM cameras")
    .get();
  let gridOrder = (maxOrder?.max ?? -1) + 1;

  for (const device of discovered) {
    const creds = { host: device.host, port: device.port, username, password };

    let deviceInfo: Awaited<ReturnType<typeof getDeviceInfo>> | null = null;
    let profiles: Awaited<ReturnType<typeof getProfiles>> = [];

    try {
      [deviceInfo, profiles] = await Promise.all([
        getDeviceInfo(creds).catch(() => null),
        getProfiles(creds),
      ]);
    } catch (err) {
      result.failed.push({ host: device.host, error: (err as Error).message });
      continue;
    }

    if (profiles.length === 0) {
      result.failed.push({ host: device.host, error: "No profiles returned" });
      continue;
    }

    const serial = deviceInfo?.serial || null;
    const eprUuid = device.eprUuid || null;
    const ptz = profiles.some((p) => p.ptz) ? 1 : 0;

    // 1. Try match by EPR UUID (most stable — survives IP changes)
    const byEpr = eprUuid
      ? db.query<Camera, [string]>("SELECT * FROM cameras WHERE onvif_epr_uuid = ?").get(eprUuid)
      : null;

    // 2. Try match by serial (fallback for cameras without EPR, e.g. VStarCam)
    const bySerial = !byEpr && serial
      ? db.query<Camera, [string]>("SELECT * FROM cameras WHERE onvif_serial = ?").get(serial)
      : null;

    const existing = byEpr ?? bySerial ?? null;

    if (existing) {
      // Backfill EPR UUID if we now have it and it wasn't stored
      if (eprUuid && !existing.onvif_epr_uuid) {
        db.run("UPDATE cameras SET onvif_epr_uuid = ? WHERE id = ?", [eprUuid, existing.id]);
      }
      // Keep PTZ capability fresh
      if (existing.onvif_ptz !== ptz) {
        db.run("UPDATE cameras SET onvif_ptz = ? WHERE id = ?", [ptz, existing.id]);
      }
      if (existing.onvif_host === device.host && existing.onvif_port === device.port) {
        result.skipped.push(device.host);
        continue;
      }
      // IP changed — update host and restart
      const now = new Date().toISOString();
      db.run(
        "UPDATE cameras SET onvif_host = ?, onvif_port = ?, updated_at = ? WHERE id = ?",
        [device.host, device.port, now, existing.id]
      );
      const updated = db.query<Camera, [string]>("SELECT * FROM cameras WHERE id = ?").get(existing.id)!;
      await ffmpegManager.restartCamera(updated);
      result.updated.push(updated);
      continue;
    }

    // 3. Fall back to IP match (no EPR, no serial)
    const byIp = db
      .query<Camera, [string]>("SELECT * FROM cameras WHERE onvif_host = ?")
      .get(device.host);

    if (byIp) {
      // Backfill identifiers if now available
      const updates: string[] = [];
      const params: (string | number | null)[] = [];
      if (eprUuid && !byIp.onvif_epr_uuid) { updates.push("onvif_epr_uuid = ?"); params.push(eprUuid); }
      if (serial && !byIp.onvif_serial) { updates.push("onvif_serial = ?"); params.push(serial); }
      if (byIp.onvif_ptz !== ptz) { updates.push("onvif_ptz = ?"); params.push(ptz); }
      if (updates.length) {
        params.push(byIp.id);
        db.run(`UPDATE cameras SET ${updates.join(", ")} WHERE id = ?`, params);
      }
      result.skipped.push(device.host);
      continue;
    }

    // 4. New device — register
    const profile = profiles[0];
    const name =
      deviceInfo?.manufacturer && deviceInfo?.model
        ? `${deviceInfo.manufacturer} ${deviceInfo.model}`
        : `Camera ${device.host}`;

    const id = `cam_${nanoid(8)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO cameras
         (id, name, rtsp_url, enabled, grid_order, grid_size, chunk_secs,
          onvif_host, onvif_port, onvif_username, onvif_password, onvif_profile_token,
          onvif_serial, onvif_epr_uuid, onvif_ptz, created_at, updated_at)
       VALUES (?, ?, NULL, 1, ?, 'medium', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, gridOrder, device.host, device.port, username, password, profile.token, serial, eprUuid, ptz, now, now]
    );

    const camera = db.query<Camera, [string]>("SELECT * FROM cameras WHERE id = ?").get(id)!;
    await ffmpegManager.startCamera(camera);
    result.registered.push(camera);
    gridOrder++;
  }

  if (result.registered.length > 0 || result.updated.length > 0)
    broadcast({ type: "cameras_updated" });

  return result;
}
