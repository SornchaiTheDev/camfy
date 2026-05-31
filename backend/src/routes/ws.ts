import type { ServerWebSocket } from "bun";
import { addClient, removeClient } from "../services/ws-broadcaster";

export const wsHandler = {
  open(ws: ServerWebSocket<unknown>) {
    addClient(ws);
  },
  message(_ws: ServerWebSocket<unknown>, _message: string | Buffer) {
    // clients are read-only — no inbound messages handled
  },
  close(ws: ServerWebSocket<unknown>) {
    removeClient(ws);
  },
};
