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
    return <div className="text-gray-500 text-sm py-8 text-center">No recordings found</div>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2 pr-4">Camera</th>
              <th className="text-left py-2 pr-4">Recorded At</th>
              <th className="text-left py-2 pr-4">Size</th>
              <th className="text-right py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((rec) => {
              const cam = cameraMap.get(rec.camera_id);
              return (
                <tr key={rec.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-2.5 pr-4 text-white">{cam?.name ?? rec.camera_id}</td>
                  <td className="py-2.5 pr-4 text-gray-400 text-xs">
                    {new Date(rec.recorded_at).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-400 text-xs">{formatBytes(rec.size_bytes)}</td>
                  <td className="py-2.5 text-right">
                    {cam && (
                      <button
                        onClick={() => setPlaying(rec)}
                        className="text-blue-400 hover:text-blue-300 mr-3 transition-colors"
                      >
                        Play
                      </button>
                    )}
                    <a
                      href={`/api/recordings/${rec.id}/download`}
                      download={`${rec.id}.mp4`}
                      className="text-green-400 hover:text-green-300 mr-3 transition-colors text-sm"
                    >
                      ↓ MP4
                    </a>
                    <button
                      onClick={() => setDeleting(rec)}
                      className="text-red-400 hover:text-red-300 transition-colors"
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
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded disabled:opacity-40 hover:bg-gray-600 transition-colors"
          >
            Prev
          </button>
          <span className="px-3 py-1 text-sm text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded disabled:opacity-40 hover:bg-gray-600 transition-colors"
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
