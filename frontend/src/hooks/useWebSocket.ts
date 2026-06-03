import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { WSMessage } from "../types";
import { useStreamStatusStore } from "../store/stream-status";

const WS_URL = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const qc = useQueryClient();
  const { setStatus, setDiskUsage, setLastScan } = useStreamStatusStore();

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout>;
    let mounted = true;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as WSMessage;
          switch (msg.type) {
            case "camera_status":
              setStatus(msg.camera_id, msg.status);
              break;
            case "disk_usage":
              setDiskUsage({ used_gb: msg.used_gb, total_gb: msg.total_gb, percent: msg.percent });
              break;
            case "cameras_updated":
              qc.invalidateQueries({ queryKey: ["cameras"] });
              break;
            case "new_segment":
              qc.invalidateQueries({ queryKey: ["recordings"] });
              break;
            case "scan_result":
              setLastScan({
                registered: msg.registered,
                updated: msg.updated,
                failed: msg.failed,
                scanned_at: msg.scanned_at,
              });
              if (msg.registered > 0 || msg.updated > 0)
                qc.invalidateQueries({ queryKey: ["cameras"] });
              break;
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (mounted) retryTimer = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      mounted = false;
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [qc, setStatus, setDiskUsage, setLastScan]);
}
