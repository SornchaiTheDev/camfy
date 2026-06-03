import { useStreamStatusStore } from "../../store/stream-status";
import { useTheme } from "../../context/theme";

export function TopBar() {
  const diskUsage = useStreamStatusStore((s) => s.diskUsage);
  const { theme, toggle } = useTheme();

  return (
    <header className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4 shrink-0">
      <span className="text-gray-400 dark:text-gray-500 text-sm hidden md:block">Network Video Recorder</span>
      <div className="ml-auto flex items-center gap-4">
        {diskUsage && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {diskUsage.used_gb.toFixed(1)} / {diskUsage.total_gb.toFixed(1)} GB
            </span>
            <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  diskUsage.percent > 90
                    ? "bg-red-500"
                    : diskUsage.percent > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${diskUsage.percent}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">{diskUsage.percent}%</span>
          </div>
        )}
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "☀" : "☽"}
        </button>
      </div>
    </header>
  );
}
