import { HLSPlayer } from "../player/HLSPlayer";
import { Badge } from "../ui/Badge";
import { useStreamStatusStore } from "../../store/stream-status";
import type { CameraWithStatus } from "../../types";

type Props = {
  camera: CameraWithStatus;
};

export function CameraCell({ camera }: Props) {
  const wsStatus = useStreamStatusStore((s) => s.statuses.get(camera.id));
  const status = wsStatus ?? camera.status;

  const streamSrc = status === "recording" ? `/live/${camera.id}/live.m3u8` : null;

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden group">
      <HLSPlayer src={streamSrc} className="w-full h-full" />

      {/* Name + status overlay */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-white text-xs font-medium truncate drop-shadow">{camera.name}</span>
        <Badge status={status} />
      </div>

      {/* Offline overlay */}
      {status !== "recording" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 pointer-events-none gap-1">
          <span className="text-gray-400 text-xs font-medium">{camera.name}</span>
          <span className="text-gray-500 text-xs">
            {status === "error" ? "Stream error" : "Offline"}
          </span>
        </div>
      )}
    </div>
  );
}
