import { Database } from "bun:sqlite";

const HOST = process.argv[2]!;
const PORT = parseInt(process.argv[3] ?? "10080", 10);

const db = new Database("./backend/data/camfy.db", { readonly: true });
const uRow = db.query<{ value: string }, []>("SELECT value FROM settings WHERE key='onvif_default_username'").get();
const pRow = db.query<{ value: string }, []>("SELECT value FROM settings WHERE key='onvif_default_password'").get();
const USERNAME = process.env.U ?? (uRow ? JSON.parse(uRow.value) : "admin");
const PASSWORD = process.env.P ?? (pRow ? JSON.parse(pRow.value) : "");
db.close();

async function buildDigest(nonce: Uint8Array, ts: string, password: string) {
  const t = new TextEncoder().encode(ts), p = new TextEncoder().encode(password);
  const c = new Uint8Array(nonce.length + t.length + p.length);
  c.set(nonce, 0); c.set(t, nonce.length); c.set(p, nonce.length + t.length);
  return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest("SHA-1", c))));
}

async function soap(action: string, body: string) {
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const digest = await buildDigest(nonce, ts, PASSWORD);
  const nonceB64 = btoa(String.fromCharCode(...nonce));
  const env = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
<s:Header><Security xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
 xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
 <UsernameToken><Username>${USERNAME}</Username>
 <Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${digest}</Password>
 <Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonceB64}</Nonce>
 <wsu:Created>${ts}</wsu:Created></UsernameToken></Security></s:Header>
<s:Body>${body}</s:Body></s:Envelope>`;
  const res = await fetch(`http://${HOST}:${PORT}/onvif/device_service`, {
    method: "POST",
    headers: { "Content-Type": "application/soap+xml; charset=utf-8", SOAPAction: `"${action}"` },
    body: env, signal: AbortSignal.timeout(5000),
  });
  return res.text();
}

const xml = await soap("http://www.onvif.org/ver10/device/wsdl/GetScopes", "<tds:GetScopes/>");
const scopes = [...xml.matchAll(/<[^>]*ScopeItem[^>]*>([^<]+)<\/[^>]*ScopeItem>/g)].map((m) => m[1].trim());
console.log(`${HOST}:`);
for (const s of scopes) console.log("  " + decodeURIComponent(s));
