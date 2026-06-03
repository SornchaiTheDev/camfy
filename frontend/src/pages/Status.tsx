import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCameras } from "../api/cameras";
import { getSystemStatus, getCameraLogs } from "../api/system";

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1024 ** 2;
  return `${mb.toFixed(0)} MB`;
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <div className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
      {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function CameraLogsPanel({ cameraId, cameraName }: { cameraId: string; cameraName: string }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["camera-logs", cameraId],
    queryFn: () => getCameraLogs(cameraId),
    refetchInterval: 5000,
  });

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <span className="text-sm font-medium text-gray-900 dark:text-white">{cameraName}</span>
        <button
          onClick={() => refetch()}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Refresh
        </button>
      </div>
      <div className="h-48 overflow-y-auto bg-gray-950 p-3 font-mono text-xs leading-relaxed">
        {isLoading ? (
          <span className="text-gray-500">Loading…</span>
        ) : !data?.lines.length ? (
          <span className="text-gray-500">No logs yet</span>
        ) : (
          data.lines.map((line, i) => (
            <div key={i} className={`${line.includes("error") || line.includes("Error") ? "text-red-400" : "text-gray-400"}`}>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function Status() {
  const [expandedCam, setExpandedCam] = useState<string | null>(null);

  const { data: system, isLoading: sysLoading } = useQuery({
    queryKey: ["system-status"],
    queryFn: getSystemStatus,
    refetchInterval: 5000,
  });

  const { data: cameras } = useCameras();

  return (
    <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">System Status</h1>

      {/* System metrics */}
      <section className="mb-8">
        <h2 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Machine</h2>
        {sysLoading || !system ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <div className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-2">CPU</div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">{system.cpu_percent}%</div>
              <div className="h-4 mb-2" />
              <ProgressBar
                percent={system.cpu_percent}
                color={system.cpu_percent > 90 ? "bg-red-500" : system.cpu_percent > 70 ? "bg-amber-500" : "bg-emerald-500"}
              />
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <div className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-2">Memory</div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">{system.memory.percent}%</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                {formatBytes(system.memory.used_bytes)} / {formatBytes(system.memory.total_bytes)}
              </div>
              <ProgressBar
                percent={system.memory.percent}
                color={system.memory.percent > 90 ? "bg-red-500" : system.memory.percent > 70 ? "bg-amber-500" : "bg-emerald-500"}
              />
            </div>

            <StatCard
              label="Uptime"
              value={formatUptime(system.uptime_secs)}
              sub="System uptime"
            />
          </div>
        )}
      </section>

      {/* Camera logs */}
      <section>
        <h2 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Camera Logs</h2>
        {!cameras?.length ? (
          <div className="text-sm text-gray-400">No cameras configured</div>
        ) : (
          <div className="flex flex-col gap-3">
            {cameras.map((cam) => (
              <div key={cam.id}>
                <button
                  onClick={() => setExpandedCam(expandedCam === cam.id ? null : cam.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        cam.status === "recording"
                          ? "bg-emerald-500"
                          : cam.status === "error"
                          ? "bg-red-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{cam.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{cam.status}</span>
                  </div>
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedCam === cam.id ? "rotate-180" : ""}`}
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {expandedCam === cam.id && (
                  <div className="mt-1">
                    <CameraLogsPanel cameraId={cam.id} cameraName={cam.name} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
