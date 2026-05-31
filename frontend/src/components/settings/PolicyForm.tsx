import { useState, useEffect } from "react";
import { useSettings, useUpdateSettings } from "../../api/settings";
import { useToast } from "../ui/Toast";
import type { DeletionMode } from "../../types";

export function PolicyForm() {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const { toast } = useToast();

  const [chunkSecs, setChunkSecs] = useState("300");
  const [retainDays, setRetainDays] = useState("30");
  const [maxDiskGb, setMaxDiskGb] = useState("100");
  const [deletionMode, setDeletionMode] = useState<DeletionMode>("days");
  const [storagePath, setStoragePath] = useState("./recordings");

  useEffect(() => {
    if (settings) {
      setChunkSecs(String(settings.chunk_secs));
      setRetainDays(String(settings.retain_days));
      setMaxDiskGb(String(settings.max_disk_gb));
      setDeletionMode(settings.deletion_mode);
      setStoragePath(settings.storage_path);
    }
  }, [settings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({
        chunk_secs: parseInt(chunkSecs, 10),
        retain_days: parseInt(retainDays, 10),
        max_disk_gb: parseInt(maxDiskGb, 10),
        deletion_mode: deletionMode,
        storage_path: storagePath,
      });
      toast("Settings saved", "success");
    } catch {
      toast("Failed to save settings", "error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Default Chunk Duration (seconds)
        </label>
        <input
          type="number"
          value={chunkSecs}
          onChange={(e) => setChunkSecs(e.target.value)}
          min="30"
          max="3600"
          className="w-full px-3 py-2 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Duration of each recorded segment file. Per-camera setting overrides this.
        </p>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Storage Path</label>
        <input
          type="text"
          value={storagePath}
          onChange={(e) => setStoragePath(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-white font-mono rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-2">Deletion Policy</label>
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="radio"
              value="days"
              checked={deletionMode === "days"}
              onChange={() => setDeletionMode("days")}
            />
            Keep by age
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="radio"
              value="disk"
              checked={deletionMode === "disk"}
              onChange={() => setDeletionMode("disk")}
            />
            Keep by disk usage
          </label>
        </div>

        {deletionMode === "days" ? (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Retain recordings for (days)</label>
            <input
              type="number"
              value={retainDays}
              onChange={(e) => setRetainDays(e.target.value)}
              min="1"
              max="365"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max disk usage (GB)</label>
            <input
              type="number"
              value={maxDiskGb}
              onChange={(e) => setMaxDiskGb(e.target.value)}
              min="1"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={update.isPending}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {update.isPending ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
