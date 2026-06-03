import type { Recording, CameraWithStatus } from "../../types";

type Props = {
  recording: Recording;
  camera: CameraWithStatus;
  onClose: () => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function RecordingPlayer({ recording, camera, onClose }: Props) {
  const src = `/api/recordings/${recording.id}/stream`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80">
      {/* Tap backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 sm:rounded-xl w-full sm:max-w-3xl shadow-2xl overflow-hidden sm:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="min-w-0 flex-1">
            <div className="text-gray-900 dark:text-white font-medium truncate">{camera.name}</div>
            <div className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
              {new Date(recording.recorded_at).toLocaleString()}
              <span className="ml-2">{formatBytes(recording.size_bytes)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-3">
            <a
              href={`/api/recordings/${recording.id}/download`}
              download={`${recording.id}.mp4`}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Download"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <video
          key={recording.id}
          src={src}
          className="w-full aspect-video bg-black"
          controls
          autoPlay
          playsInline
        />
      </div>
    </div>
  );
}
