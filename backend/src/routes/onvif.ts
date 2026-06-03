import { Elysia, t } from "elysia";
import { discoverOnvif } from "../services/onvif/discovery";
import { getDeviceInfo, getProfiles } from "../services/onvif/client";
import { autoRegisterCameras } from "../services/onvif/autoRegister";
import db from "../db/client";

export const onvifRoute = new Elysia({ prefix: "/api/onvif" })
  .get("/discover", async () => {
    const devices = await discoverOnvif(3000);
    return { devices };
  })

  .post(
    "/probe",
    async ({ body }) => {
      try {
        const c = {
          host: body.host,
          port: body.port ?? 80,
          username: body.username ?? "",
          password: body.password ?? "",
        };
        const [deviceInfo, profiles] = await Promise.all([
          getDeviceInfo(c).catch(() => null),
          getProfiles(c),
        ]);
        return { device_info: deviceInfo, profiles };
      } catch (err) {
        return new Response(
          JSON.stringify({ error: (err as Error).message }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
    },
    {
      body: t.Object({
        host: t.String(),
        port: t.Optional(t.Number()),
        username: t.Optional(t.String()),
        password: t.Optional(t.String()),
      }),
    }
  )

  .post(
    "/auto-register",
    async ({ body }) => {
      const username = body.username ?? "";
      const password = body.password ?? "";

      if (body.username !== undefined) {
        db.run("INSERT OR REPLACE INTO settings VALUES ('onvif_default_username', ?)", [JSON.stringify(username)]);
        db.run("INSERT OR REPLACE INTO settings VALUES ('onvif_default_password', ?)", [JSON.stringify(password)]);
      }

      const result = await autoRegisterCameras(username, password);
      return result;
    },
    {
      body: t.Object({
        username: t.Optional(t.String()),
        password: t.Optional(t.String()),
      }),
    }
  );
