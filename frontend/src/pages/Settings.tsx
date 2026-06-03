import { useState } from "react";
import { useCameras, useCreateCamera, useAutoRegisterCameras } from "../api/cameras";
import { CameraList } from "../components/settings/CameraList";
import { CameraForm } from "../components/settings/CameraForm";
import { PolicyForm } from "../components/settings/PolicyForm";
import { AutoDiscoveryForm } from "../components/settings/AutoDiscoveryForm";
import { useToast } from "../components/ui/Toast";
import type { CreateCameraBody } from "../types";

type Tab = "cameras" | "policy" | "discovery";

export function Settings() {
  const [tab, setTab] = useState<Tab>("cameras");
  const [showAdd, setShowAdd] = useState(false);
  const [showAutoRegister, setShowAutoRegister] = useState(false);
  const [arUsername, setArUsername] = useState("admin");
  const [arPassword, setArPassword] = useState("");
  const { data: cameras } = useCameras();
  const createCamera = useCreateCamera();
  const autoRegister = useAutoRegisterCameras();
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

  async function handleAutoRegister() {
    try {
      const result = await autoRegister.mutateAsync({ username: arUsername, password: arPassword });
      const parts: string[] = [];
      if (result.registered.length > 0) parts.push(`Registered ${result.registered.length}`);
      if (result.updated.length > 0) parts.push(`updated ${result.updated.length} IP`);
      if (result.skipped.length > 0) parts.push(`skipped ${result.skipped.length}`);
      if (result.failed.length > 0) parts.push(`failed ${result.failed.length}`);
      toast(parts.join(", ") || "No cameras found", result.failed.length > 0 ? "error" : "success");
      setShowAutoRegister(false);
    } catch {
      toast("Auto-register failed", "error");
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Settings</h1>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 mb-6">
        {(["cameras", "policy", "discovery"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 pb-2 text-sm transition-colors ${
              tab === t
                ? "text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white font-medium"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            {t === "cameras" ? "Cameras" : t === "policy" ? "Recording Policy" : "Auto-Discovery"}
          </button>
        ))}
      </div>

      {tab === "cameras" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm text-gray-400 dark:text-gray-500">{cameras?.length ?? 0} camera(s)</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAutoRegister(true)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors"
              >
                Auto-Register
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
              >
                + Add Camera
              </button>
            </div>
          </div>
          <CameraList cameras={cameras ?? []} />
        </div>
      )}

      {tab === "policy" && <PolicyForm />}
      {tab === "discovery" && <AutoDiscoveryForm />}

      {showAdd && (
        <CameraForm
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
          isLoading={createCamera.isPending}
        />
      )}

      {showAutoRegister && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-gray-900 dark:text-white font-semibold mb-1">Auto-Register ONVIF Cameras</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Scans LAN for ONVIF cameras and registers new ones automatically.
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Username</label>
                <input
                  type="text"
                  value={arUsername}
                  onChange={(e) => setArUsername(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-sm rounded-md px-3 py-2 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={arPassword}
                  onChange={(e) => setArPassword(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-sm rounded-md px-3 py-2 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAutoRegister(false)}
                disabled={autoRegister.isPending}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAutoRegister}
                disabled={autoRegister.isPending}
                className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {autoRegister.isPending ? "Scanning…" : "Scan & Register"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
