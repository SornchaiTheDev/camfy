import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import db from "../db/client";
import type { Camera } from "../types/db";
import { ffmpegManager } from "../services/ffmpeg/manager";
import { broadcast } from "../services/ws-broadcaster";

function notFound(msg = "Not found") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

const ONVIF_FIELDS = ["onvif_host", "onvif_port", "onvif_username", "onvif_password", "onvif_profile_token"] as const;

function serializeCamera(cam: Camera) {
  return {
    ...cam,
    enabled: cam.enabled === 1,
    status: ffmpegManager.getStatus(cam.id),
  };
}

export const camerasRoute = new Elysia({ prefix: "/api/cameras" })
  .get("/", () => {
    const cameras = db.query<Camera, []>("SELECT * FROM cameras ORDER BY grid_order ASC").all();
    return cameras.map(serializeCamera);
  })

  .post(
    "/",
    async ({ body }) => {
      const id = `cam_${nanoid(8)}`;
      const now = new Date().toISOString();
      const maxOrder = db
        .query<{ max: number | null }, []>("SELECT MAX(grid_order) as max FROM cameras")
        .get();
      const gridOrder = (maxOrder?.max ?? -1) + 1;

      db.run(
        `INSERT INTO cameras
           (id, name, rtsp_url, enabled, grid_order, grid_size, chunk_secs,
            onvif_host, onvif_port, onvif_username, onvif_password, onvif_profile_token,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          body.name,
          body.rtsp_url ?? null,
          body.enabled !== false ? 1 : 0,
          gridOrder,
          body.grid_size ?? "medium",
          body.chunk_secs ?? null,
          body.onvif_host ?? null,
          body.onvif_port ?? null,
          body.onvif_username ?? null,
          body.onvif_password ?? null,
          body.onvif_profile_token ?? null,
          now,
          now,
        ]
      );

      const camera = db.query<Camera, [string]>("SELECT * FROM cameras WHERE id = ?").get(id)!;
      if (camera.enabled) await ffmpegManager.startCamera(camera);
      broadcast({ type: "cameras_updated" });

      return serializeCamera(camera);
    },
    {
      body: t.Object({
        name: t.String(),
        rtsp_url: t.Optional(t.Nullable(t.String())),
        enabled: t.Optional(t.Boolean()),
        chunk_secs: t.Optional(t.Nullable(t.Number())),
        grid_size: t.Optional(t.Union([t.Literal("small"), t.Literal("medium"), t.Literal("large")])),
        onvif_host: t.Optional(t.Nullable(t.String())),
        onvif_port: t.Optional(t.Nullable(t.Number())),
        onvif_username: t.Optional(t.Nullable(t.String())),
        onvif_password: t.Optional(t.Nullable(t.String())),
        onvif_profile_token: t.Optional(t.Nullable(t.String())),
      }),
    }
  )

  .get("/:id", ({ params }) => {
    const cam = db.query<Camera, [string]>("SELECT * FROM cameras WHERE id = ?").get(params.id);
    if (!cam) return notFound("Camera not found");
    return serializeCamera(cam);
  })

  .patch(
    "/:id",
    async ({ params, body }) => {
      const cam = db.query<Camera, [string]>("SELECT * FROM cameras WHERE id = ?").get(params.id);
      if (!cam) return notFound("Camera not found");

      const fields: string[] = [];
      const values: (string | number | null)[] = [];

      const add = (col: string, val: string | number | null | undefined) => {
        if (val !== undefined) { fields.push(`${col} = ?`); values.push(val ?? null); }
      };

      add("name", body.name);
      add("rtsp_url", body.rtsp_url);
      if (body.enabled !== undefined) { fields.push("enabled = ?"); values.push(body.enabled ? 1 : 0); }
      add("grid_order", body.grid_order);
      add("grid_size", body.grid_size);
      add("chunk_secs", body.chunk_secs);
      add("onvif_host", body.onvif_host);
      add("onvif_port", body.onvif_port);
      add("onvif_username", body.onvif_username);
      add("onvif_password", body.onvif_password);
      add("onvif_profile_token", body.onvif_profile_token);

      if (fields.length > 0) {
        fields.push("updated_at = ?");
        values.push(new Date().toISOString());
        values.push(params.id);
        db.run(`UPDATE cameras SET ${fields.join(", ")} WHERE id = ?`, values);
      }

      const updated = db.query<Camera, [string]>("SELECT * FROM cameras WHERE id = ?").get(params.id)!;

      const restartTriggers = ["rtsp_url", "enabled", "chunk_secs", ...ONVIF_FIELDS];
      const needsRestart = restartTriggers.some((f) => f in body);
      if (needsRestart) await ffmpegManager.restartCamera(updated);

      broadcast({ type: "cameras_updated" });
      return serializeCamera(updated);
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        rtsp_url: t.Optional(t.Nullable(t.String())),
        enabled: t.Optional(t.Boolean()),
        chunk_secs: t.Optional(t.Nullable(t.Number())),
        grid_order: t.Optional(t.Number()),
        grid_size: t.Optional(t.Union([t.Literal("small"), t.Literal("medium"), t.Literal("large")])),
        onvif_host: t.Optional(t.Nullable(t.String())),
        onvif_port: t.Optional(t.Nullable(t.Number())),
        onvif_username: t.Optional(t.Nullable(t.String())),
        onvif_password: t.Optional(t.Nullable(t.String())),
        onvif_profile_token: t.Optional(t.Nullable(t.String())),
      }),
    }
  )

  .delete("/:id", async ({ params }) => {
    const cam = db.query<Camera, [string]>("SELECT * FROM cameras WHERE id = ?").get(params.id);
    if (!cam) return notFound("Camera not found");

    await ffmpegManager.stopCamera(params.id);
    db.run("DELETE FROM cameras WHERE id = ?", [params.id]);
    broadcast({ type: "cameras_updated" });

    return { success: true };
  })

  .post("/:id/start", async ({ params }) => {
    const cam = db.query<Camera, [string]>("SELECT * FROM cameras WHERE id = ?").get(params.id);
    if (!cam) return notFound("Camera not found");
    await ffmpegManager.startCamera(cam);
    return { status: ffmpegManager.getStatus(params.id) };
  })

  .post("/:id/stop", async ({ params }) => {
    const cam = db.query<Camera, [string]>("SELECT * FROM cameras WHERE id = ?").get(params.id);
    if (!cam) return notFound("Camera not found");
    await ffmpegManager.stopCamera(params.id);
    return { status: "idle" };
  })

  .patch(
    "/reorder",
    ({ body }) => {
      const stmt = db.prepare("UPDATE cameras SET grid_order = ? WHERE id = ?");
      for (const item of body) {
        stmt.run(item.grid_order, item.id);
      }
      broadcast({ type: "cameras_updated" });
      return { success: true };
    },
    {
      body: t.Array(t.Object({ id: t.String(), grid_order: t.Number() })),
    }
  );
