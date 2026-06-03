import { soapRequest } from "./soap";
import type { OnvifCredentials } from "./client";

const PTZ_NS = "http://www.onvif.org/ver20/ptz/wsdl";

function ptzUrl(host: string, port: number) {
  return `http://${host}:${port}/onvif/ptz_service`;
}

function creds(c: OnvifCredentials) {
  return { user: c.username, pass: c.password };
}

const clamp = (n: number) => Math.max(-1, Math.min(1, n));

/**
 * Move the camera continuously until stopMove() (or the safety Timeout) fires.
 * x = pan, y = tilt, zoom — each a velocity in [-1, 1].
 */
export async function continuousMove(
  c: OnvifCredentials,
  profileToken: string,
  x: number,
  y: number,
  zoom: number,
  timeoutS = 1
): Promise<void> {
  const body = `<tptz:ContinuousMove xmlns:tptz="${PTZ_NS}">
    <tptz:ProfileToken>${profileToken}</tptz:ProfileToken>
    <tptz:Velocity>
      <tt:PanTilt x="${clamp(x)}" y="${clamp(y)}"/>
      <tt:Zoom x="${clamp(zoom)}"/>
    </tptz:Velocity>
    <tptz:Timeout>PT${timeoutS}S</tptz:Timeout>
  </tptz:ContinuousMove>`;

  await soapRequest(
    ptzUrl(c.host, c.port),
    `${PTZ_NS}/ContinuousMove`,
    body,
    creds(c)
  );
}

/** Stop all pan/tilt and zoom motion. */
export async function stopMove(c: OnvifCredentials, profileToken: string): Promise<void> {
  const body = `<tptz:Stop xmlns:tptz="${PTZ_NS}">
    <tptz:ProfileToken>${profileToken}</tptz:ProfileToken>
    <tptz:PanTilt>true</tptz:PanTilt>
    <tptz:Zoom>true</tptz:Zoom>
  </tptz:Stop>`;

  await soapRequest(
    ptzUrl(c.host, c.port),
    `${PTZ_NS}/Stop`,
    body,
    creds(c)
  );
}
