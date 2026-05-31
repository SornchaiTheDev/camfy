import { useStreamStatusStore } from "../../store/stream-status";

export function TopBar() {
  const diskUsage = useStreamStatusStore((s) => s.diskUsage);

  return (
    <header className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4 shrink-0">
      <span className="text-gray-400 text-sm hidden md:block">Network Video Recorder</span>
      <div className="ml-auto flex items-center gap-3">
        {diskUsage && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {diskUsage.used_gb.toFixed(1)} / {diskUsage.total_gb.toFixed(1)} GB
            </span>
            <div className="w-24 h-2 bg-gray-600 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  diskUsage.percent > 90
                    ? "bg-red-500"
                    : diskUsage.percent > 70
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${diskUsage.percent}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{diskUsage.percent}%</span>
          </div>
        )}
      </div>
    </header>
  );
}
