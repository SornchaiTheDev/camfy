import { useState } from "react";
import { useCameras, useCreateCamera } from "../api/cameras";
import { CameraList } from "../components/settings/CameraList";
import { CameraForm } from "../components/settings/CameraForm";
import { PolicyForm } from "../components/settings/PolicyForm";
import { useToast } from "../components/ui/Toast";
import type { CreateCameraBody } from "../types";

type Tab = "cameras" | "policy";

export function Settings() {
  const [tab, setTab] = useState<Tab>("cameras");
  const [showAdd, setShowAdd] = useState(false);
  const { data: cameras } = useCameras();
  const createCamera = useCreateCamera();
  const { toast } = useToast();

  async function handleCreate(data: CreateCameraBody) {
    try {
      await createCamera.mutateAsync(data);
      toast("Camera added", "success");
      setShowAdd(false);
    } catch {
      toast("Failed to add camera", "error");
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-700 mb-6">
        {(["cameras", "policy"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm capitalize transition-colors ${
              tab === t
                ? "text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t === "cameras" ? "Cameras" : "Recording Policy"}
          </button>
        ))}
      </div>

      {tab === "cameras" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm text-gray-400">{cameras?.length ?? 0} camera(s)</h2>
            <button
              onClick={() => setShowAdd(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add Camera
            </button>
          </div>
          <CameraList cameras={cameras ?? []} />
        </div>
      )}

      {tab === "policy" && <PolicyForm />}

      {showAdd && (
        <CameraForm
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
          isLoading={createCamera.isPending}
        />
      )}
    </div>
  );
}
