import { Elysia, t } from "elysia";
import db from "../db/client";
import type { Setting } from "../types/db";

function getAllSettings(): Record<string, unknown> {
  const rows = db.query<Setting, []>("SELECT * FROM settings").all();
  return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
}

export const settingsRoute = new Elysia({ prefix: "/api/settings" })
  .get("/", () => getAllSettings())

  .patch(
    "/",
    ({ body }) => {
      const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
      for (const [key, val] of Object.entries(body)) {
        if (val !== undefined) stmt.run(key, JSON.stringify(val));
      }
      return getAllSettings();
    },
    {
      body: t.Object({
        chunk_secs: t.Optional(t.Number()),
        retain_days: t.Optional(t.Number()),
        max_disk_gb: t.Optional(t.Number()),
        storage_path: t.Optional(t.String()),
        deletion_mode: t.Optional(t.Union([t.Literal("days"), t.Literal("disk")])),
      }),
    }
  );
