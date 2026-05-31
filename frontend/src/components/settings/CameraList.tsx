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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2 pr-4">Name</th>
              <th className="text-left py-2 pr-4">RTSP URL</th>
              <th className="text-left py-2 pr-4">Status</th>
              <th className="text-left py-2 pr-4">Chunk</th>
              <th className="text-right py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cameras.map((cam) => (
              <tr key={cam.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-3 pr-4 text-white font-medium">{cam.name}</td>
                <td className="py-3 pr-4 text-gray-400 font-mono text-xs max-w-xs truncate">
                  {cam.rtsp_url}
                </td>
                <td className="py-3 pr-4">
                  <Badge status={cam.status} />
                </td>
                <td className="py-3 pr-4 text-gray-400">
                  {cam.chunk_secs ? `${cam.chunk_secs}s` : "global"}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => setEditing(cam)}
                    className="text-blue-400 hover:text-blue-300 mr-3 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleting(cam)}
                    className="text-red-400 hover:text-red-300 transition-colors"
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
