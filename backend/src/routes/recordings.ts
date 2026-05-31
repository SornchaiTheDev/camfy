import { Elysia, t } from "elysia";

function notFound(msg = "Not found") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}
import { join } from "path";
import { rmSync } from "fs";
import db from "../db/client";
import type { Recording } from "../types/db";

function getStoragePath(): string {
  const row = db.query<{ value: string }, []>("SELECT value FROM settings WHERE key = 'storage_path'").get();
  return row ? JSON.parse(row.value) : "./recordings";
}

export const recordingsRoute = new Elysia({ prefix: "/api/recordings" })
  .get(
    "/",
    ({ query }) => {
      const page = parseInt(query.page ?? "1", 10);
      const limit = parseInt(query.limit ?? "50", 10);
      const offset = (page - 1) * limit;

      let sql = "SELECT * FROM recordings WHERE 1=1";
      const params: (string | number)[] = [];

      if (query.camera_id) { sql += " AND camera_id = ?"; params.push(query.camera_id); }
      if (query.date) {
        sql += " AND date(recorded_at) = ?";
        params.push(query.date);
      }

      sql += " ORDER BY recorded_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      const rows = db.query<Recording, typeof params>(sql).all(...params);

      const countSql = sql.replace(/SELECT \*/, "SELECT COUNT(*) as n").replace(/ORDER BY.*$/, "");
      const countParams = params.slice(0, -2);
      const total = (db.query<{ n: number }, typeof countParams>(countSql).get(...countParams))?.n ?? 0;

      return { data: rows, page, limit, total };
    },
    {
      query: t.Object({
        camera_id: t.Optional(t.String()),
        date: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  .delete(
    "/:id",
    ({ params }) => {
      const rec = db.query<Recording, [string]>("SELECT * FROM recordings WHERE id = ?").get(params.id);
      if (!rec) return notFound("Recording not found");

      try { rmSync(join(getStoragePath(), rec.segment_path)); } catch { /* already gone */ }
      db.run("DELETE FROM recordings WHERE id = ?", [params.id]);

      return { success: true };
    }
  )

  .delete(
    "/",
    ({ query }) => {
      let sql = "SELECT * FROM recordings WHERE 1=1";
      const params: string[] = [];

      if (query.camera_id) { sql += " AND camera_id = ?"; params.push(query.camera_id); }
      if (query.before) { sql += " AND recorded_at < ?"; params.push(query.before); }

      const rows = db.query<Recording, typeof params>(sql).all(...params);
      const storagePath = getStoragePath();
      for (const rec of rows) {
        try { rmSync(join(storagePath, rec.segment_path)); } catch { /* ignore */ }
      }
      db.run(sql.replace("SELECT *", "DELETE"), params);

      return { deleted: rows.length };
    },
    {
      query: t.Object({
        camera_id: t.Optional(t.String()),
        before: t.Optional(t.String()),
      }),
    }
  )

  .get("/:id/download", async ({ params, query, set }) => {
    const rec = db.query<Recording, [string]>("SELECT * FROM recordings WHERE id = ?").get(params.id);
    if (!rec) return notFound("Recording not found");

    const absPath = join(getStoragePath(), rec.segment_path);
    if (!(await Bun.file(absPath).exists())) return notFound("File not found on disk");

    // ?format=ts skips remux, default is mp4
    if (query.format === "ts") {
      set.headers["Content-Type"] = "video/mp2t";
      set.headers["Content-Disposition"] = `attachment; filename="${rec.id}.ts"`;
      return Bun.file(absPath);
    }

    // Remux .ts → .mp4 on-the-fly via FFmpeg (no re-encode, just container change)
    const ffmpeg = Bun.spawn([
      "ffmpeg",
      "-loglevel", "error",
      "-i", absPath,
      "-c", "copy",
      "-movflags", "frag_keyframe+empty_moov+faststart",
      "-f", "mp4",
      "pipe:1",
    ], {
      stdout: "pipe",
      stderr: "ignore",
    });

    set.headers["Content-Type"] = "video/mp4";
    set.headers["Content-Disposition"] = `attachment; filename="${rec.id}.mp4"`;
    return new Response(ffmpeg.stdout as ReadableStream);
  }, {
    query: t.Object({
      format: t.Optional(t.String()),
    }),
  });
