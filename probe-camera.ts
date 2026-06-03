import { Database } from "bun:sqlite";
import { XMLParser } from "fast-xml-parser";

const HOST = process.argv[2] ?? "192.168.1.113";
const PORT = parseInt(process.argv[3] ?? "10080", 10);

// Read credentials from DB settings
const db = new Database("./backend/data/camfy.db", { readonly: true });
const uRow = db.query<{ value: string }, []>("SELECT value FROM settings WHERE key='onvif_default_username'").get();
const pRow = db.query<{ value: string }, []>("SELECT value FROM settings WHERE key='onvif_default_password'").get();
const USERNAME = uRow ? JSON.parse(uRow.value) : "admin";
const PASSWORD = pRow ? JSON.parse(pRow.value) : "";
db.close();

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (name) => ["Profile"].includes(name),
});

async function buildDigest(nonce: Uint8Array, timestamp: string, password: string) {
  const ts = new TextEncoder().encode(timestamp);
  const pass = new TextEncoder().encode(password);
  const combined = new Uint8Array(nonce.length + ts.length + pass.length);
  combined.set(nonce, 0); combined.set(ts, nonce.length); combined.set(pass, nonce.length + ts.length);
  const hash = await crypto.subtle.digest("SHA-1", combined);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function soap(path: string, action: string, body: string, auth = true) {
  let header = "";
  if (auth) {
    const nonce = crypto.getRandomValues(new Uint8Array(16));
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const digest = await buildDigest(nonce, ts, PASSWORD);
    const nonceB64 = btoa(String.fromCharCode(...nonce));
    header = `<s:Header><Security xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
      xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <UsernameToken><Username>${USERNAME}</Username>
      <Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${digest}</Password>
      <Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonceB64}</Nonce>
      <wsu:Created>${ts}</wsu:Created></UsernameToken></Security></s:Header>`;
  }

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:tds="http://www.onvif.org/ver10/device/wsdl"
            xmlns:trt="http://www.onvif.org/ver10/media/wsdl"
            xmlns:tt="http://www.onvif.org/ver10/schema">
  ${header}<s:Body>${body}</s:Body></s:Envelope>`;

  const url = `http://${HOST}:${PORT}${path}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/soap+xml; charset=utf-8", SOAPAction: `"${action}"` },
      body: envelope,
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    console.log(`\n[HTTP ${res.status}] ${url}`);
    if (!res.ok) { console.log("Response body:", text.slice(0, 500)); return null; }
    const parsed = parser.parse(text) as Record<string, unknown>;
    const env = (parsed["Envelope"] ?? parsed) as Record<string, unknown>;
    return (env["Body"] ?? env) as Record<string, unknown>;
  } catch (e) {
    console.log(`[ERROR] ${url} →`, (e as Error).message);
    return null;
  }
}

console.log(`\nProbing ${HOST}:${PORT}  (user=${USERNAME})`);
console.log("=".repeat(60));

// 1. GetDeviceInformation (no auth first, then with auth)
console.log("\n── GetDeviceInformation (no auth) ──");
let info = await soap("/onvif/device_service", "http://www.onvif.org/ver10/device/wsdl/GetDeviceInformation",
  "<tds:GetDeviceInformation/>", false);
console.log(JSON.stringify(info, null, 2));

console.log("\n── GetDeviceInformation (with auth) ──");
info = await soap("/onvif/device_service", "http://www.onvif.org/ver10/device/wsdl/GetDeviceInformation",
  "<tds:GetDeviceInformation/>");
console.log(JSON.stringify(info, null, 2));

// 2. GetProfiles
console.log("\n── GetProfiles ──");
const profiles = await soap("/onvif/media_service", "http://www.onvif.org/ver10/media/wsdl/GetProfiles",
  "<trt:GetProfiles/>");
console.log(JSON.stringify(profiles, null, 2));

// 3. GetCapabilities
console.log("\n── GetCapabilities ──");
const caps = await soap("/onvif/device_service", "http://www.onvif.org/ver10/device/wsdl/GetCapabilities",
  "<tds:GetCapabilities><tds:Category>All</tds:Category></tds:GetCapabilities>");
console.log(JSON.stringify(caps, null, 2));
