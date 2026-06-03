import { HLSPlayer } from "../player/HLSPlayer";
import type { Recording, CameraWithStatus } from "../../types";

type Props = {
  recording: Recording;
  camera: CameraWithStatus;
  onClose: () => void;
};

function getVodSrc(rec: Recording): string {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div>
            <span className="text-gray-900 dark:text-white font-medium">{camera.name}</span>
            <span className="text-gray-400 dark:text-gray-500 text-sm ml-2">
              {new Date(recording.recorded_at).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 dark:text-gray-500">{formatBytes(recording.size_bytes)}</span>
            <a
              href={`/api/recordings/${recording.id}/download`}
              download={`${recording.id}.mp4`}
              className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              Download MP4
            </a>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
        <HLSPlayer
          src={src}
          className="w-full aspect-video bg-black"
          muted={false}
          controls
          autoPlay
        />
      </div>
    </div>
  );
}
