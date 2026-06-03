import { useState, useEffect } from "react";
import { useSettings, useUpdateSettings } from "../../api/settings";
import { useStreamStatusStore } from "../../store/stream-status";
import { useToast } from "../ui/Toast";

const INTERVAL_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "5 minutes", value: 5 },
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "6 hours", value: 360 },
];

const inputCls = "w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500";

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export function AutoDiscoveryForm() {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const { toast } = useToast();
  const lastScan = useStreamStatusStore((s) => s.lastScan);

  const [intervalMins, setIntervalMins] = useState(0);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (settings) {
      setIntervalMins(settings.onvif_scan_interval_mins ?? 0);
      setUsername(settings.onvif_default_username ?? "admin");
      setPassword(settings.onvif_default_password ?? "");
    }
  }, [settings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({
        onvif_scan_interval_mins: intervalMins,
        onvif_default_username: username,
        onvif_default_password: password,
      });
      toast("Auto-discovery settings saved", "success");
    } catch {
      toast("Failed to save", "error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {/* Last scan status */}
      {lastScan && (
        <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm border border-gray-200 dark:border-gray-700">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${lastScan.failed > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
          <span className="text-gray-600 dark:text-gray-400">
            Last scan {formatRelativeTime(lastScan.scanned_at)}
            {lastScan.registered > 0 && <> · <span className="text-emerald-600 dark:text-emerald-400">{lastScan.registered} registered</span></>}
            {lastScan.updated > 0 && <> · <span className="text-blue-500">{lastScan.updated} updated</span></>}
            {lastScan.failed > 0 && <> · <span className="text-amber-500">{lastScan.failed} failed</span></>}
          </span>
        </div>
      )}

      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Scan Interval</label>
        <select
          value={intervalMins}
          onChange={(e) => setIntervalMins(Number(e.target.value))}
          className={inputCls}
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          How often to scan the LAN for new ONVIF cameras. Changes take effect immediately without restart.
        </p>
      </div>

      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Default Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
          autoComplete="off"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Default Password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={`${inputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                <path d="M10.748 13.93l2.523 2.523a10.003 10.003 0 01-8.954-5.892 1.651 1.651 0 010-1.185 9.976 9.976 0 012.019-3.053l1.091 1.092A4 4 0 0010.748 13.93z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Used for both the startup scan and scheduled scans.
        </p>
      </div>

      <button
        type="submit"
        disabled={update.isPending}
        className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
      >
        {update.isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
