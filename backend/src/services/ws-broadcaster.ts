import type { ServerWebSocket } from "bun";
import type { WSMessage } from "../types/api";

const clients = new Set<ServerWebSocket<unknown>>();

export function addClient(ws: ServerWebSocket<unknown>) {
  clients.add(ws);
}

export function removeClient(ws: ServerWebSocket<unknown>) {
  clients.delete(ws);
}

export function broadcast(msg: WSMessage) {
  const payload = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === 1) {
      ws.send(payload);
    } else {
      clients.delete(ws);
    }
  }
}

export function clientCount() {
  return clients.size;
}
