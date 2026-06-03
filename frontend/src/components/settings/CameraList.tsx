import { useState } from "react";
import { Badge } from "../ui/Badge";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { CameraForm } from "./CameraForm";
import { useDeleteCamera, useUpdateCamera } from "../../api/cameras";
import { useToast } from "../ui/Toast";
import type { CameraWithStatus, CreateCameraBody } from "../../types";

type Props = {
  cameras: CameraWithStatus[];
};

export function CameraList({ cameras }: Props) {
  const [editing, setEditing] = useState<CameraWithStatus | null>(null);
  const [deleting, setDeleting] = useState<CameraWithStatus | null>(null);
  const deleteCamera = useDeleteCamera();
  const updateCamera = useUpdateCamera();
  const { toast } = useToast();

  async function handleUpdate(data: CreateCameraBody) {
    if (!editing) return;
    try {
      await updateCamera.mutateAsync({ id: editing.id, ...data });
      toast("Camera updated", "success");
      setEditing(null);
    } catch {
      toast("Failed to update camera", "error");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteCamera.mutateAsync(deleting.id);
      toast("Camera deleted", "success");
      setDeleting(null);
    } catch {
      toast("Failed to delete camera", "error");
    }
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className="space-y-2 sm:hidden">
        {cameras.map((cam) => (
          <div
            key={cam.id}
            className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-gray-900 dark:text-white font-medium">{cam.name}</span>
              <Badge status={cam.status} />
            </div>
            <p className="text-gray-400 dark:text-gray-500 font-mono text-xs break-all">
              {cam.rtsp_url}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 dark:text-gray-500 text-xs">
                Chunk: {cam.chunk_secs ? `${cam.chunk_secs}s` : "global"}
              </span>
              <div className="flex gap-4">
                <button
                  onClick={() => setEditing(cam)}
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleting(cam)}
                  className="text-red-400 hover:text-red-500 transition-colors text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <th className="text-left py-2 pr-4 font-medium">Name</th>
              <th className="text-left py-2 pr-4 font-medium">RTSP URL</th>
              <th className="text-left py-2 pr-4 font-medium">Status</th>
              <th className="text-left py-2 pr-4 font-medium">Chunk</th>
              <th className="text-right py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cameras.map((cam) => (
              <tr key={cam.id} className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="py-3 pr-4 text-gray-900 dark:text-white font-medium">{cam.name}</td>
                <td className="py-3 pr-4 text-gray-400 dark:text-gray-500 font-mono text-xs max-w-xs truncate">
                  {cam.rtsp_url}
                </td>
                <td className="py-3 pr-4">
                  <Badge status={cam.status} />
                </td>
                <td className="py-3 pr-4 text-gray-400 dark:text-gray-500">
                  {cam.chunk_secs ? `${cam.chunk_secs}s` : "global"}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => setEditing(cam)}
                    className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mr-4 transition-colors text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleting(cam)}
                    className="text-red-400 hover:text-red-500 transition-colors text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <CameraForm
          camera={editing}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
          isLoading={updateCamera.isPending}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete Camera"
          message={`Delete "${deleting.name}"? All recordings will also be removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
