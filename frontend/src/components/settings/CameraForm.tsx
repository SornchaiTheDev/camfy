import { useState, useEffect } from "react";
import { DiscoverPanel } from "./DiscoverPanel";
import { useProbeOnvif } from "../../api/cameras";
import type { CameraWithStatus, CreateCameraBody, CameraGridSize, OnvifDiscoveredDevice, OnvifProfile } from "../../types";
import clsx from "clsx";

type Mode = "onvif" | "rtsp";

type Props = {
  camera?: CameraWithStatus;
  onSubmit: (data: CreateCameraBody) => void;
  onCancel: () => void;
  isLoading?: boolean;
};

const GRID_SIZES: CameraGridSize[] = ["small", "medium", "large"];

const inputCls = "w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500";
const labelCls = "block text-sm text-gray-600 dark:text-gray-400 mb-1";

export function CameraForm({ camera, onSubmit, onCancel, isLoading }: Props) {
  const isEdit = !!camera;
  const defaultMode: Mode = camera?.onvif_host ? "onvif" : "rtsp";
  const [mode, setMode] = useState<Mode>(defaultMode);

  const [name, setName] = useState(camera?.name ?? "");
  const [enabled, setEnabled] = useState(camera?.enabled ?? true);
  const [chunkSecs, setChunkSecs] = useState(camera?.chunk_secs ? String(camera.chunk_secs) : "");
  const [gridSize, setGridSize] = useState<CameraGridSize>(camera?.grid_size ?? "medium");

  const [rtspUrl, setRtspUrl] = useState(camera?.rtsp_url ?? "");

  const [onvifHost, setOnvifHost] = useState(camera?.onvif_host ?? "");
  const [onvifPort, setOnvifPort] = useState(String(camera?.onvif_port ?? 80));
  const [onvifUser, setOnvifUser] = useState(camera?.onvif_username ?? "");
  const [onvifPass, setOnvifPass] = useState(camera?.onvif_password ?? "");
  const [profiles, setProfiles] = useState<OnvifProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState(camera?.onvif_profile_token ?? "");

  const probe = useProbeOnvif();

  useEffect(() => {
    if (camera) {
      setName(camera.name);
      setEnabled(camera.enabled);
      setChunkSecs(camera.chunk_secs ? String(camera.chunk_secs) : "");
      setGridSize(camera.grid_size);
      setRtspUrl(camera.rtsp_url ?? "");
      setOnvifHost(camera.onvif_host ?? "");
      setOnvifPort(String(camera.onvif_port ?? 80));
      setOnvifUser(camera.onvif_username ?? "");
      setOnvifPass(camera.onvif_password ?? "");
      setSelectedProfile(camera.onvif_profile_token ?? "");
    }
  }, [camera]);

  function handleDiscoveredDevice(dev: OnvifDiscoveredDevice) {
    setOnvifHost(dev.host);
    setOnvifPort(String(dev.port));
  }

  async function handleFetchProfiles() {
    const result = await probe.mutateAsync({
      host: onvifHost,
      port: parseInt(onvifPort, 10),
      username: onvifUser || undefined,
      password: onvifPass || undefined,
    });
    setProfiles(result.profiles);
    if (!selectedProfile && result.profiles.length > 0) {
      setSelectedProfile(result.profiles[0].token);
    }
    if (!name && result.device_info) {
      setName(`${result.device_info.manufacturer} ${result.device_info.model}`.trim());
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const base: CreateCameraBody = {
      name: name.trim(),
      enabled,
      chunk_secs: chunkSecs ? parseInt(chunkSecs, 10) : null,
      grid_size: gridSize,
    };

    if (mode === "rtsp") {
      onSubmit({ ...base, rtsp_url: rtspUrl.trim() });
    } else {
      onSubmit({
        ...base,
        onvif_host: onvifHost.trim(),
        onvif_port: parseInt(onvifPort, 10),
        onvif_username: onvifUser || null,
        onvif_password: onvifPass || null,
        onvif_profile_token: selectedProfile || null,
      });
    }
  }

  const canSubmit =
    mode === "rtsp"
      ? name.trim() && rtspUrl.trim()
      : name.trim() && onvifHost.trim() && selectedProfile;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60" onClick={onCancel} />
      <form
        onSubmit={handleSubmit}
        className="relative flex flex-col w-full max-w-lg h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h3 className="text-gray-900 dark:text-white font-semibold">
            {isEdit ? "Edit Camera" : "Add Camera"}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {!isEdit && (
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-5">
              {(["onvif", "rtsp"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={clsx(
                    "flex-1 py-1.5 text-sm rounded-md transition-colors",
                    mode === m
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                  )}
                >
                  {m === "onvif" ? "ONVIF (Auto)" : "Manual RTSP"}
                </button>
              ))}
            </div>
          )}

          {mode === "onvif" && (
            <>
              <div>
                <label className={labelCls}>Discover on LAN</label>
                <DiscoverPanel onSelect={handleDiscoveredDevice} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Host / IP</label>
                  <input
                    type="text"
                    value={onvifHost}
                    onChange={(e) => setOnvifHost(e.target.value)}
                    placeholder="192.168.1.100"
                    className={clsx(inputCls, "font-mono")}
                  />
                </div>
                <div>
                  <label className={labelCls}>Port</label>
                  <input
                    type="number"
                    value={onvifPort}
                    onChange={(e) => setOnvifPort(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Username</label>
                  <input
                    type="text"
                    value={onvifUser}
                    onChange={(e) => setOnvifUser(e.target.value)}
                    placeholder="admin"
                    autoComplete="username"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Password</label>
                  <input
                    type="password"
                    value={onvifPass}
                    onChange={(e) => setOnvifPass(e.target.value)}
                    autoComplete="current-password"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleFetchProfiles}
                  disabled={!onvifHost || probe.isPending}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {probe.isPending && (
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {probe.isPending ? "Fetching..." : "Fetch Profiles"}
                </button>
                {probe.isError && (
                  <p className="text-xs text-red-500 mt-1">
                    Could not connect — check host, port, and credentials
                  </p>
                )}
              </div>

              {profiles.length > 0 && (
                <div>
                  <label className={labelCls}>Stream Profile</label>
                  <select
                    value={selectedProfile}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    className={inputCls}
                  >
                    {profiles.map((p) => (
                      <option key={p.token} value={p.token}>
                        {p.name}
                        {p.resolution ? ` (${p.resolution.width}×${p.resolution.height})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {mode === "rtsp" && (
            <div>
              <label className={labelCls}>RTSP URL</label>
              <input
                type="text"
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                required
                placeholder="rtsp://user:pass@192.168.1.100:554/stream"
                className={clsx(inputCls, "font-mono")}
              />
            </div>
          )}

          <div>
            <label className={labelCls}>Camera Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Front Door"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Chunk Duration (s, blank = global)</label>
              <input
                type="number"
                value={chunkSecs}
                onChange={(e) => setChunkSecs(e.target.value)}
                placeholder="300"
                min="30"
                max="3600"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Default Grid Size</label>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(e.target.value as CameraGridSize)}
                className={inputCls}
              >
                {GRID_SIZES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cam-enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="cam-enabled" className="text-sm text-gray-600 dark:text-gray-400">
              Enable recording
            </label>
          </div>

        </div>

        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !canSubmit}
            className="px-4 py-2 text-sm bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Saving..." : isEdit ? "Save Changes" : "Add Camera"}
          </button>
        </div>
      </form>
    </div>
  );
}
