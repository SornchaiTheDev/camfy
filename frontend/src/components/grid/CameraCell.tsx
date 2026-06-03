import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HLSPlayer } from "../player/HLSPlayer";
import { Badge } from "../ui/Badge";
import { useStreamStatusStore } from "../../store/stream-status";
import { useUpdateCamera } from "../../api/cameras";
import type { CameraWithStatus } from "../../types";

type Props = {
  camera: CameraWithStatus;
};

function CameraNameInput({ camera, onDone }: { camera: CameraWithStatus; onDone: () => void }) {
  const [value, setValue] = useState(camera.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const update = useUpdateCamera();

  useEffect(() => { inputRef.current?.select(); }, []);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== camera.name) {
      update.mutate({ id: camera.id, name: trimmed });
    }
    onDone();
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") onDone();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      className="bg-black/60 text-white text-xs font-medium rounded px-1 py-0.5 outline-none border border-white/40 w-full min-w-0"
      style={{ maxWidth: 160 }}
    />
  );
}

export function CameraCell({ camera }: Props) {
  const wsStatus = useStreamStatusStore((s) => s.statuses.get(camera.id));
  const status = wsStatus ?? camera.status;
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  const streamSrc = status === "recording" ? `/live/${camera.id}/live.m3u8` : null;

  return (
    <div
      className="relative w-full h-full bg-gray-900 overflow-hidden group cursor-pointer"
      onClick={() => navigate(`/camera/${camera.id}`)}
    >
      <HLSPlayer src={streamSrc} className="w-full h-full" />

      {/* Name + status overlay (online) */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/60 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
        {editing ? (
          <CameraNameInput camera={camera} onDone={() => setEditing(false)} />
        ) : (
          <span
            className="text-white text-xs font-medium truncate drop-shadow cursor-pointer hover:underline"
            title="Click to rename"
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
            {camera.name}
          </span>
        )}
        <Badge status={status} />
      </div>

      {/* Offline overlay */}
      {status !== "recording" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 pointer-events-none gap-1">
          <span
            className="text-gray-400 text-xs font-medium pointer-events-auto cursor-pointer hover:underline"
            title="Click to rename"
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
            {camera.name}
          </span>
          <span className="text-gray-500 text-xs">
            {status === "error" ? "Stream error" : "Offline"}
          </span>
        </div>
      )}
    </div>
  );
}
