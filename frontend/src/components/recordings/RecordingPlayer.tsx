import { HLSPlayer } from "../player/HLSPlayer";
import type { Recording, CameraWithStatus } from "../../types";

type Props = {
  recording: Recording;
  camera: CameraWithStatus;
  onClose: () => void;
};

function getVodSrc(rec: Recording): string {
  // segment_path: {cam_id}/{date}/seg_xxxxx.ts
  // VOD playlist at: /vod/{cam_id}/{date}/archive.m3u8
  const parts = rec.segment_path.split("/");
  if (parts.length < 2) return "";
  const camId = parts[0];
  const date = parts[1];
  return `/vod/${camId}/${date}/archive.m3u8`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function RecordingPlayer({ recording, camera, onClose }: Props) {
  const src = getVodSrc(recording);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-gray-800 rounded-lg w-full max-w-3xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div>
            <span className="text-white font-medium">{camera.name}</span>
            <span className="text-gray-400 text-sm ml-2">
              {new Date(recording.recorded_at).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{formatBytes(recording.size_bytes)}</span>
            <a
              href={`/api/recordings/${recording.id}/download`}
              download={`${recording.id}.mp4`}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Download MP4
            </a>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
        <HLSPlayer
          src={src}
          className="w-full aspect-video"
          muted={false}
          controls
          autoPlay
        />
      </div>
    </div>
  );
}
