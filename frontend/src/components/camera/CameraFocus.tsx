import { useNavigate, useParams } from "react-router-dom";
import { HLSPlayer } from "../player/HLSPlayer";
import { Badge } from "../ui/Badge";
import { PtzControls } from "./PtzControls";
import { useCamera } from "../../api/cameras";
import { useStreamStatusStore } from "../../store/stream-status";

export function CameraFocus() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: camera, isLoading, error } = useCamera(id);
  const wsStatus = useStreamStatusStore((s) => s.statuses.get(id));

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading…</div>;
  }
  if (error || !camera) {
    return <div className="flex items-center justify-center h-full text-red-500 text-sm">Camera not found</div>;
  }

  const status = wsStatus ?? camera.status;
  const streamSrc = status === "recording" ? `/live/${camera.id}/live.m3u8` : null;

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      <HLSPlayer src={streamSrc} className="w-full h-full" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-3 py-2 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-black/50 hover:bg-black/70 text-white text-lg"
        >
          ←
        </button>
        <span className="text-white text-sm font-medium truncate drop-shadow flex-1">{camera.name}</span>
        <Badge status={status} />
      </div>

      {/* PTZ controls — only for PTZ-capable cameras with a live stream */}
      {camera.ptz_capable && status === "recording" && <PtzControls cameraId={camera.id} />}

      {status !== "recording" && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
          {status === "error" ? "Stream error" : "Offline"}
        </div>
      )}
    </div>
  );
}
