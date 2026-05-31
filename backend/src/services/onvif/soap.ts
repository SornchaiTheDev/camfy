import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (name) => ["Profile", "VideoSource", "AudioSource"].includes(name),
});

async function buildDigest(nonce: Uint8Array, timestamp: string, password: string): Promise<string> {
  const ts = new TextEncoder().encode(timestamp);
  const pass = new TextEncoder().encode(password);
  const combined = new Uint8Array(nonce.length + ts.length + pass.length);
  combined.set(nonce, 0);
  combined.set(ts, nonce.length);
  combined.set(pass, nonce.length + ts.length);
  const hash = await crypto.subtle.digest("SHA-1", combined);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export async function buildSoapEnvelope(body: string, creds?: { user: string; pass: string }): Promise<string> {
  let securityHeader = "";

  if (creds) {
    const nonce = crypto.getRandomValues(new Uint8Array(16));
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const digest = await buildDigest(nonce, timestamp, creds.pass);
    const nonceB64 = btoa(String.fromCharCode(...nonce));

    securityHeader = `
    <s:Header>
      <Security xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
                xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
        <UsernameToken>
          <Username>${creds.user}</Username>
          <Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${digest}</Password>
          <Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonceB64}</Nonce>
          <wsu:Created>${timestamp}</wsu:Created>
        </UsernameToken>
      </Security>
    </s:Header>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:tds="http://www.onvif.org/ver10/device/wsdl"
            xmlns:trt="http://www.onvif.org/ver10/media/wsdl"
            xmlns:tt="http://www.onvif.org/ver10/schema">
  ${securityHeader}
  <s:Body>${body}</s:Body>
</s:Envelope>`;
}

export async function soapRequest(
  url: string,
  action: string,
  bodyXml: string,
  creds?: { user: string; pass: string },
  timeoutMs = 5000
): Promise<Record<string, unknown>> {
  const envelope = await buildSoapEnvelope(bodyXml, creds);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        SOAPAction: `"${action}"`,
      },
      body: envelope,
      signal: controller.signal,
    });

    const text = await res.text();
    const parsed = parser.parse(text) as Record<string, unknown>;
    // Unwrap Envelope → Body
    const envelope2 = (parsed["Envelope"] ?? parsed) as Record<string, unknown>;
    const body = (envelope2["Body"] ?? envelope2) as Record<string, unknown>;
    return body;
  } finally {
    clearTimeout(timer);
  }
}
