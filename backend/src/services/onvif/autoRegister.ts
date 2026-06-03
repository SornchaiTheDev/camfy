import { nanoid } from "nanoid";
import db from "../../db/client";
import type { Camera } from "../../types/db";
import { discoverOnvif } from "./discovery";
import { getDeviceInfo, getProfiles } from "./client";
import { ffmpegManager } from "../ffmpeg/manager";
import { broadcast } from "../ws-broadcaster";

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

    // 1. Try match by serial (stable across IP changes)
    const bySerial = serial
      ? db.query<Camera, [string]>("SELECT * FROM cameras WHERE onvif_serial = ?").get(serial)
      : null;

    if (bySerial) {
      if (bySerial.onvif_host === device.host && bySerial.onvif_port === device.port) {
        result.skipped.push(device.host);
        continue;
      }
      // IP changed — update host and restart
      const now = new Date().toISOString();
      db.run(
        "UPDATE cameras SET onvif_host = ?, onvif_port = ?, updated_at = ? WHERE id = ?",
        [device.host, device.port, now, bySerial.id]
      );
      const updated = db.query<Camera, [string]>("SELECT * FROM cameras WHERE id = ?").get(bySerial.id)!;
      await ffmpegManager.restartCamera(updated);
      result.updated.push(updated);
      continue;
    }

    // 2. Fall back to IP match (serial unavailable)
    const byIp = db
      .query<Camera, [string]>("SELECT * FROM cameras WHERE onvif_host = ?")
      .get(device.host);

    if (byIp) {
      result.skipped.push(device.host);
      continue;
    }

    // 3. New device — register
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
          onvif_serial, created_at, updated_at)
       VALUES (?, ?, NULL, 1, ?, 'medium', NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, gridOrder, device.host, device.port, username, password, profile.token, serial, now, now]
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
