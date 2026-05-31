import { useState } from "react";
import { HLSPlayer } from "../player/HLSPlayer";
import { Badge } from "../ui/Badge";
import { CellSizeControl } from "./CellSizeControl";
import { useGridStore } from "../../store/grid";
import { useStreamStatusStore } from "../../store/stream-status";
import type { CameraWithStatus, CameraGridSize } from "../../types";

type Props = {
  camera: CameraWithStatus;
  onSizeChange?: (size: CameraGridSize) => void;
};

export function CameraCell({ camera, onSizeChange }: Props) {
  const [showControls, setShowControls] = useState(false);
  const cellSizes = useGridStore((s) => s.cellSizes);
  const setCellSize = useGridStore((s) => s.setCellSize);
  const wsStatus = useStreamStatusStore((s) => s.statuses.get(camera.id));
  const status = wsStatus ?? camera.status;

  const streamSrc = status === "recording"
    ? `/live/${camera.id}/live.m3u8`
    : null;

  const size: CameraGridSize = cellSizes[camera.id] ?? camera.grid_size;

  function handleSizeChange(newSize: CameraGridSize) {
    setCellSize(camera.id, newSize);
    onSizeChange?.(newSize);
  }

  return (
    <div
      className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <HLSPlayer src={streamSrc} className="w-full h-full" />

      {/* Top overlay: name + status */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <span className="text-white text-xs font-medium truncate">{camera.name}</span>
        <Badge status={status} />
      </div>

      {/* Bottom overlay: size controls (visible on hover) */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-gradient-to-t from-black/70 to-transparent">
          <CellSizeControl value={size} onChange={handleSizeChange} />
          {status === "idle" && (
            <span className="text-gray-400 text-xs">Offline</span>
          )}
        </div>
      )}

      {/* Offline overlay */}
      {status !== "recording" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="text-center">
            <div className="text-gray-400 text-xs mt-1">
              {status === "error" ? "Stream error" : "Waiting for stream..."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
