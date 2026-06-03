import { Database } from "bun:sqlite";
import dgram from "node:dgram";
import { randomUUID } from "crypto";

const MULTICAST_ADDR = "239.255.255.250";
const MULTICAST_PORT = 3702;

type DiscoveredDevice = { host: string; port: number; eprUuid?: string };
type DbCamera = {
  id: string; name: string; enabled: number;
  onvif_host: string | null; onvif_port: number | null;
  onvif_serial: string | null; onvif_epr_uuid: string | null;
  onvif_profile_token: string | null; onvif_username: string | null;
  grid_order: number; updated_at: string;
};

// ── WS-Discovery ─────────────────────────────────────────────────────────────

function buildProbe(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
            xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <s:Header>
    <a:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action>
    <a:MessageID>uuid:${randomUUID()}</a:MessageID>
    <a:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</a:To>
  </s:Header>
  <s:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></s:Body>
</s:Envelope>`;
}

function parseXAddrs(xml: string): string[] {
  const m = xml.match(/<[^>]*XAddrs[^>]*>([^<]+)<\/[^>]*XAddrs>/);
  if (!m) return [];
  return m[1].trim().split(/\s+/).filter((u) => u.startsWith("http://"));
}

function parseEpr(xml: string): string | undefined {
  const m = xml.match(/<[^>]*Address[^>]*>\s*(urn:uuid:[a-f0-9-]+)\s*<\/[^>]*Address>/i);
  return m ? m[1] : undefined;
}

async function discover(timeoutMs = 5000): Promise<DiscoveredDevice[]> {
  const devices = new Map<string, DiscoveredDevice>();
  return new Promise((resolve) => {
    const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
    const probe = Buffer.from(buildProbe(), "utf8");
    const done = () => { try { sock.close(); } catch {} resolve([...devices.values()]); };
    const timer = setTimeout(done, timeoutMs);
    sock.on("message", (msg) => {
      const text = msg.toString("utf8");
      const eprUuid = parseEpr(text);
      for (const xaddr of parseXAddrs(text)) {
        try {
          const url = new URL(xaddr);
          const host = url.hostname;
          if (!devices.has(host))
            devices.set(host, { host, port: parseInt(url.port || "80", 10), eprUuid });
        } catch {}
      }
    });
    sock.on("error", () => { clearTimeout(timer); done(); });
    sock.bind(0, () => {
      try {
        sock.setBroadcast(true);
        sock.setMulticastTTL(4);
        sock.send(probe, 0, probe.length, MULTICAST_PORT, MULTICAST_ADDR);
      } catch { clearTimeout(timer); done(); }
    });
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

const dbPath = process.env.DB_PATH ?? "./backend/data/camfy.db";
const db = new Database(dbPath, { readonly: true });

const cameras = db.query<DbCamera, []>(`
  SELECT id, name, enabled, onvif_host, onvif_port,
         onvif_serial, onvif_epr_uuid, onvif_profile_token,
         onvif_username, grid_order, updated_at
  FROM cameras ORDER BY grid_order
`).all();

console.log("\nScanning network (5s)...");
const live = await discover(5000);
const liveByHost = new Map(live.map((d) => [d.host, d]));
const liveByEpr = new Map(live.filter((d) => d.eprUuid).map((d) => [d.eprUuid!, d]));

console.log(`\n${"=".repeat(80)}`);
console.log(`  DB: ${cameras.length} camera(s)   |   Network: ${live.length} device(s) found`);
console.log(`${"=".repeat(80)}\n`);

// ── DB cameras ───────────────────────────────────────────────────────────────
for (const cam of cameras) {
  const onNet = cam.onvif_host ? liveByHost.has(cam.onvif_host) : false;
  const eprMatch = cam.onvif_epr_uuid ? liveByEpr.get(cam.onvif_epr_uuid) : undefined;
  const ipMoved = !onNet && eprMatch; // EPR seen on different IP

  const status = onNet ? "ONLINE " : ipMoved ? "MOVED  " : "OFFLINE";
  const tag = { ONLINE: "✓", MOVED: "→", OFFLINE: "✗" }[status.trim()]!;

  console.log(`[${cam.grid_order}] ${tag} ${status} | ${cam.name} (${cam.id})`);
  console.log(`     db_host    : ${cam.onvif_host ?? "—"}:${cam.onvif_port ?? "—"}`);
  if (ipMoved) console.log(`     new_host   : ${eprMatch!.host}:${eprMatch!.port}  ← IP changed`);
  console.log(`     serial     : ${cam.onvif_serial ?? "—"}`);
  console.log(`     epr_uuid   : ${cam.onvif_epr_uuid ?? "—"}`);
  console.log(`     updated_at : ${cam.updated_at}`);
  console.log();
}

// ── Network devices not in DB ─────────────────────────────────────────────────
const dbHosts = new Set(cameras.map((c) => c.onvif_host).filter(Boolean));
const dbEprs = new Set(cameras.map((c) => c.onvif_epr_uuid).filter(Boolean));
const unknown = live.filter(
  (d) => !dbHosts.has(d.host) && !(d.eprUuid && dbEprs.has(d.eprUuid))
);

if (unknown.length) {
  console.log(`${"─".repeat(80)}`);
  console.log(`  ${unknown.length} network device(s) NOT in DB:`);
  for (const d of unknown) {
    console.log(`  ? ${d.host}:${d.port}  epr=${d.eprUuid ?? "—"}`);
  }
  console.log();
}

// ── Duplicate check ───────────────────────────────────────────────────────────
const bySerial = new Map<string, DbCamera[]>();
const byEpr = new Map<string, DbCamera[]>();
for (const cam of cameras) {
  if (cam.onvif_serial) {
    const g = bySerial.get(cam.onvif_serial) ?? [];
    bySerial.set(cam.onvif_serial, [...g, cam]);
  }
  if (cam.onvif_epr_uuid) {
    const g = byEpr.get(cam.onvif_epr_uuid) ?? [];
    byEpr.set(cam.onvif_epr_uuid, [...g, cam]);
  }
}
const serialDupes = [...bySerial.entries()].filter(([, g]) => g.length > 1);
const eprDupes = [...byEpr.entries()].filter(([, g]) => g.length > 1);

if (serialDupes.length || eprDupes.length) {
  console.log(`${"!".repeat(80)}`);
  console.log("  DUPLICATES IN DB");
  console.log(`${"!".repeat(80)}\n`);
  for (const [s, g] of serialDupes) {
    console.log(`  serial "${s}":`);
    for (const c of g) console.log(`    - ${c.name} (${c.id}) @ ${c.onvif_host}`);
  }
  for (const [e, g] of eprDupes) {
    console.log(`  epr "${e}":`);
    for (const c of g) console.log(`    - ${c.name} (${c.id}) @ ${c.onvif_host}`);
  }
  console.log();
} else {
  console.log("No duplicates in DB.\n");
}

db.close();
