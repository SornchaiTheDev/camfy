import dgram from "node:dgram";
import { randomUUID } from "crypto";

const MULTICAST_ADDR = "239.255.255.250";
const MULTICAST_PORT = 3702;

function buildProbeMessage(): string {
  const msgId = `uuid:${randomUUID()}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
            xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <s:Header>
    <a:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action>
    <a:MessageID>${msgId}</a:MessageID>
    <a:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</a:To>
  </s:Header>
  <s:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter</d:Types>
    </d:Probe>
  </s:Body>
</s:Envelope>`;
}

export type DiscoveredDevice = {
  xaddrs: string[];
  host: string;
  port: number;
};

function parseXAddrs(xmlText: string): string[] {
  const match = xmlText.match(/<[^>]*XAddrs[^>]*>([^<]+)<\/[^>]*XAddrs>/);
  if (!match) return [];
  return match[1]
    .trim()
    .split(/\s+/)
    .filter((u) => u.startsWith("http://"));
}

function xaddrToDevice(xaddr: string): DiscoveredDevice | null {
  try {
    const url = new URL(xaddr);
    return {
      xaddrs: [xaddr],
      host: url.hostname,
      port: parseInt(url.port || "80", 10),
    };
  } catch {
    return null;
  }
}

export async function discoverOnvif(timeoutMs = 3000): Promise<DiscoveredDevice[]> {
  const devices = new Map<string, DiscoveredDevice>();

  return new Promise((resolve) => {
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    const probe = Buffer.from(buildProbeMessage(), "utf8");

    const cleanup = () => {
      try { socket.close(); } catch { /* ignore if already closed */ }
      resolve([...devices.values()]);
    };

    const timer = setTimeout(cleanup, timeoutMs);

    socket.on("message", (msg) => {
      const text = msg.toString("utf8");
      const xaddrs = parseXAddrs(text);
      for (const xaddr of xaddrs) {
        const dev = xaddrToDevice(xaddr);
        if (dev && !devices.has(dev.host)) {
          devices.set(dev.host, dev);
        }
      }
    });

    socket.on("error", (err) => {
      console.warn("WS-Discovery socket error:", err.message);
      clearTimeout(timer);
      cleanup();
    });

    socket.bind(0, () => {
      try {
        socket.setBroadcast(true);
        socket.setMulticastTTL(4);
        socket.send(probe, 0, probe.length, MULTICAST_PORT, MULTICAST_ADDR);
      } catch (err) {
        console.warn("WS-Discovery send failed:", (err as Error).message);
        clearTimeout(timer);
        cleanup();
      }
    });
  });
}
