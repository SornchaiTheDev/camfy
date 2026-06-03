import { useState } from "react";
import { useDeleteRecording } from "../../api/recordings";
import { RecordingPlayer } from "./RecordingPlayer";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";
import type { Recording, CameraWithStatus } from "../../types";

type Props = {
  recordings: Recording[];
  cameras: CameraWithStatus[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function RecordingList({ recordings, cameras, total, page, onPageChange }: Props) {
  const [playing, setPlaying] = useState<Recording | null>(null);
  const [deleting, setDeleting] = useState<Recording | null>(null);
  const deleteRec = useDeleteRecording();
  const { toast } = useToast();

  const cameraMap = new Map(cameras.map((c) => [c.id, c]));
  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteRec.mutateAsync(deleting.id);
      toast("Recording deleted", "success");
      setDeleting(null);
    } catch {
      toast("Failed to delete", "error");
    }
  }

  const playingCamera = playing ? cameraMap.get(playing.camera_id) : null;

  if (recordings.length === 0) {
    return <div className="text-gray-400 dark:text-gray-500 text-sm py-16 text-center">No recordings found</div>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <th className="text-left py-2 pr-4 font-medium">Camera</th>
              <th className="text-left py-2 pr-4 font-medium">Recorded At</th>
              <th className="text-left py-2 pr-4 font-medium">Size</th>
              <th className="text-right py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((rec) => {
              const cam = cameraMap.get(rec.camera_id);
              return (
                <tr key={rec.id} className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="py-2.5 pr-4 text-gray-900 dark:text-white">{cam?.name ?? rec.camera_id}</td>
                  <td className="py-2.5 pr-4 text-gray-400 dark:text-gray-500 text-xs">
                    {new Date(rec.recorded_at).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-400 dark:text-gray-500 text-xs">{formatBytes(rec.size_bytes)}</td>
                  <td className="py-2.5 text-right">
                    {cam && (
                      <button
                        onClick={() => setPlaying(rec)}
                        className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mr-4 transition-colors text-xs"
                      >
                        Play
                      </button>
                    )}
                    <a
                      href={`/api/recordings/${rec.id}/download`}
                      download={`${rec.id}.mp4`}
                      className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mr-4 transition-colors text-xs"
                    >
                      ↓ MP4
                    </a>
                    <button
                      onClick={() => setDeleting(rec)}
                      className="text-red-400 hover:text-red-500 transition-colors text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-md disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Prev
          </button>
          <span className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-md disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {playing && playingCamera && (
        <RecordingPlayer
          recording={playing}
          camera={playingCamera}
          onClose={() => setPlaying(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete Recording"
          message="Delete this recording segment? This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
