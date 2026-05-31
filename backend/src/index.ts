import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

import { runMigrations } from "./db/client";
import { camerasRoute } from "./routes/cameras";
import { recordingsRoute } from "./routes/recordings";
import { settingsRoute } from "./routes/settings";
import { streamsRoute } from "./routes/streams";
import { onvifRoute } from "./routes/onvif";
import { wsHandler } from "./routes/ws";
import { ffmpegManager } from "./services/ffmpeg/manager";
import { startCron } from "./services/cron";

// 1. Run DB migrations
runMigrations();

// 2. Start cron
startCron();

// 3. Start all enabled cameras (async — resolves ONVIF URIs)
ffmpegManager.startAll();

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

// Serve frontend build in production
const frontendDist = join(import.meta.dir, "../../frontend/dist");
if (existsSync(frontendDist)) {
  const indexHtml = readFileSync(join(frontendDist, "index.html"), "utf8");
  app
    .use(staticPlugin({ assets: frontendDist, prefix: "/" }))
    .get("*", ({ request }) => {
      const { pathname } = new URL(request.url);
      if (pathname.includes(".")) return new Response("Not found", { status: 404 });
      return new Response(indexHtml, { headers: { "Content-Type": "text/html" } });
    });
} else {
  console.warn("frontend/dist not found — run: cd frontend && bun run build");
}

const port = parseInt(process.env.PORT ?? "3001", 10);

// 6. Bun.serve with WebSocket support
Bun.serve({
  port,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, { data: null });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return app.fetch(req);
  },
  websocket: wsHandler,
});

console.log(`Camfy backend running on http://localhost:${port}`);
