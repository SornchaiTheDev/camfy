import { soapRequest } from "./soap";

export type OnvifCredentials = {
  host: string;
  port: number;
  username: string;
  password: string;
};

export type OnvifProfile = {
  token: string;
  name: string;
  resolution?: { width: number; height: number };
};

export type OnvifDeviceInfo = {
  manufacturer: string;
  model: string;
  firmware: string;
  serial: string;
};

function deviceUrl(host: string, port: number) {
  return `http://${host}:${port}/onvif/device_service`;
}
function mediaUrl(host: string, port: number) {
  return `http://${host}:${port}/onvif/media_service`;
}

function creds(c: OnvifCredentials) {
  return { user: c.username, pass: c.password };
}

// Deep-get a nested value by trying multiple key paths (handles NS prefix variations)
function dig(obj: unknown, ...keys: string[]): unknown {
  if (obj == null || typeof obj !== "object") return undefined;
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    if (k in o) return o[k];
    // try without namespace prefix
    const noNs = k.includes(":") ? k.split(":").pop()! : k;
    const found = Object.keys(o).find(
      (key) => key === noNs || key.endsWith(`:${noNs}`)
    );
    if (found) return o[found];
  }
  return undefined;
}

export async function getDeviceInfo(c: OnvifCredentials): Promise<OnvifDeviceInfo> {
  const body = await soapRequest(
    deviceUrl(c.host, c.port),
    "http://www.onvif.org/ver10/device/wsdl/GetDeviceInformation",
    "<tds:GetDeviceInformation/>",
    creds(c)
  );

  const resp = dig(body, "GetDeviceInformationResponse") as Record<string, unknown> ?? {};
  return {
    manufacturer: String(dig(resp, "Manufacturer") ?? ""),
    model: String(dig(resp, "Model") ?? ""),
    firmware: String(dig(resp, "FirmwareVersion") ?? ""),
    serial: String(dig(resp, "SerialNumber") ?? ""),
  };
}

export async function getProfiles(c: OnvifCredentials): Promise<OnvifProfile[]> {
  const body = await soapRequest(
    mediaUrl(c.host, c.port),
    "http://www.onvif.org/ver10/media/wsdl/GetProfiles",
    "<trt:GetProfiles/>",
    creds(c)
  );

  const resp = dig(body, "GetProfilesResponse") as Record<string, unknown> ?? {};
  const profiles = dig(resp, "Profiles") as unknown[];
  if (!Array.isArray(profiles)) return [];

  return profiles.map((p) => {
    const pr = p as Record<string, unknown>;
    const token = String((pr["@_token"] ?? pr["token"] ?? ""));
    const name = String(dig(pr, "Name") ?? token);
    const vc = dig(pr, "VideoEncoderConfiguration") as Record<string, unknown> | undefined;
    const res = vc ? dig(vc, "Resolution") as Record<string, unknown> | undefined : undefined;
    return {
      token,
      name,
      resolution: res
        ? { width: Number(res["Width"] ?? 0), height: Number(res["Height"] ?? 0) }
        : undefined,
    };
  });
}

export async function getStreamUri(c: OnvifCredentials, profileToken: string): Promise<string> {
  const body = await soapRequest(
    mediaUrl(c.host, c.port),
    "http://www.onvif.org/ver10/media/wsdl/GetStreamUri",
    `<trt:GetStreamUri>
      <trt:StreamSetup>
        <tt:Stream>RTP-Unicast</tt:Stream>
        <tt:Transport><tt:Protocol>RTSP</tt:Protocol></tt:Transport>
      </trt:StreamSetup>
      <trt:ProfileToken>${profileToken}</trt:ProfileToken>
    </trt:GetStreamUri>`,
    creds(c)
  );

  const resp = dig(body, "GetStreamUriResponse") as Record<string, unknown> ?? {};
  const mediaUri = dig(resp, "MediaUri") as Record<string, unknown> ?? {};
  const uri = String(dig(mediaUri, "Uri") ?? "");

  if (!uri.startsWith("rtsp://")) throw new Error(`Invalid stream URI: ${uri}`);

  // Embed credentials into RTSP URL if not already present
  try {
    const url = new URL(uri);
    if (!url.username && c.username) {
      url.username = encodeURIComponent(c.username);
      url.password = encodeURIComponent(c.password);
    }
    return url.toString();
  } catch {
    return uri;
  }
}
