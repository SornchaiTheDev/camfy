import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";
import { mkdirSync } from "fs";

const dbPath = process.env.DB_PATH ?? "./data/camfy.db";
mkdirSync(join(dbPath, ".."), { recursive: true });

const db = new Database(dbPath, { create: true });

export function runMigrations() {
  for (const file of ["001_initial.sql", "002_onvif.sql", "003_rtsp_nullable.sql", "004_onvif_defaults.sql", "005_onvif_serial.sql"]) {
    const sql = readFileSync(join(import.meta.dir, "migrations", file), "utf8");
    for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
      try {
        db.run(stmt);
      } catch (e: unknown) {
        const msg = (e as Error).message ?? "";
        // idempotent: skip already-applied DDL
        if (
          !msg.includes("duplicate column") &&
          !msg.includes("already exists") &&
          !msg.includes("no such table: cameras_new") // table rename already done
        ) throw e;
      }
    }
  }
}

export default db;
