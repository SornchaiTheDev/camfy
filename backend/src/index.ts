import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { join } from "path";
import { existsSync } from "fs";

import { runMigrations } from "./db/client";
import { camerasRoute } from "./routes/cameras";
import { recordingsRoute } from "./routes/recordings";
import { settingsRoute } from "./routes/settings";
import { streamsRoute } from "./routes/streams";
import { onvifRoute } from "./routes/onvif";
import { wsHandler } from "./routes/ws";
import { ffmpegManager } from "./services/ffmpeg/manager";
import { startCron } from "./services/cron";
import { autoRegisterCameras } from "./services/onvif/autoRegister";
import db from "./db/client";

// 1. Run DB migrations
runMigrations();

// 2. Start cron
startCron();

// 3. Start all enabled cameras (async — resolves ONVIF URIs)
ffmpegManager.startAll();

// 3b. Auto-register new ONVIF cameras found on LAN
(async () => {
  try {
    const uRow = db.query<{ value: string }, []>("SELECT value FROM settings WHERE key='onvif_default_username'").get();
    const pRow = db.query<{ value: string }, []>("SELECT value FROM settings WHERE key='onvif_default_password'").get();
    const username = uRow ? JSON.parse(uRow.value) : "admin";
    const password = pRow ? JSON.parse(pRow.value) : "";
    const result = await autoRegisterCameras(username, password);
    if (result.registered.length > 0)
      console.log(`Auto-registered ${result.registered.length} ONVIF camera(s):`, result.registered.map((c) => c.name).join(", "));
    if (result.updated.length > 0)
      console.log(`Updated IP for ${result.updated.length} ONVIF camera(s):`, result.updated.map((c) => c.name).join(", "));
    if (result.failed.length > 0)
      console.warn(`ONVIF auto-register failed for: ${result.failed.map((f) => `${f.host} (${f.error})`).join(", ")}`);
  } catch (err) {
    console.warn("ONVIF auto-register error:", (err as Error).message);
  }
})();

// 4. Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await ffmpegManager.stopAll();
  process.exit(0);
});
process.on("SIGINT", async () => {
  await ffmpegManager.stopAll();
  process.exit(0);
});

// 5. Build Elysia app
const app = new Elysia()
  .use(cors())
  .use(camerasRoute)
  .use(recordingsRoute)
  .use(settingsRoute)
  .use(streamsRoute)
  .use(onvifRoute);

const frontendDist = join(import.meta.dir, "../../frontend/dist");
const hasFrontend = existsSync(frontendDist);
if (!hasFrontend) console.warn("frontend/dist not found — run: cd frontend && bun run build");

const port = parseInt(process.env.PORT ?? "3001", 10);

const API_PREFIXES = ["/api/", "/live/", "/vod/"];

// 6. Bun.serve with WebSocket support
Bun.serve({
  port,
  async fetch(req, server) {
    const { pathname } = new URL(req.url);

    if (pathname === "/ws") {
      const upgraded = server.upgrade(req, { data: null });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // API routes → Elysia
    if (API_PREFIXES.some((p) => pathname.startsWith(p))) {
      return app.fetch(req);
    }

    // Static file serving via Bun.file (correct MIME types)
    if (hasFrontend) {
      if (pathname.includes(".")) {
        const file = Bun.file(join(frontendDist, pathname));
        if (await file.exists()) return new Response(file);
        return new Response("Not found", { status: 404 });
      }
      // SPA fallback — all extensionless paths → index.html
      return new Response(Bun.file(join(frontendDist, "index.html")));
    }

    return app.fetch(req);
  },
  websocket: wsHandler,
});

console.log(`Camfy backend running on http://localhost:${port}`);
