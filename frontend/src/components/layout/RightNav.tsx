import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { useTheme } from "../../context/theme";
import { useStreamStatusStore } from "../../store/stream-status";

const links = [
  {
    to: "/",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M2 3a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm9 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V3zm0 6a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1V9zM2 11a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 01-1 1H3a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    to: "/recordings",
    label: "Recordings",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path
          fillRule="evenodd"
          d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    to: "/status",
    label: "Status",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M3 4a1 1 0 000 2h.01a1 1 0 000-2H3zm3.5 0a1 1 0 000 2H17a1 1 0 000-2H6.5zM3 9a1 1 0 000 2h.01a1 1 0 000-2H3zm3.5 0a1 1 0 000 2H17a1 1 0 000-2H6.5zM3 14a1 1 0 000 2h.01a1 1 0 000-2H3zm3.5 0a1 1 0 000 2H17a1 1 0 000-2H6.5z" clipRule="evenodd" />
      </svg>
    ),
  },
];

function Tooltip({ label }: { label: string }) {
  return (
    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-150 shadow-lg">
      {label}
      <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900 dark:border-l-gray-700" />
    </div>
  );
}

export function RightNav() {
  const { theme, toggle } = useTheme();
  const diskUsage = useStreamStatusStore((s) => s.diskUsage);

  return (
    <>
      {/* Desktop: right sidebar */}
      <aside className="hidden sm:flex w-14 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex-col items-center py-4 shrink-0">
        <div className="mb-6 text-gray-900 dark:text-white font-bold text-sm select-none">C</div>

        <nav className="flex flex-col gap-1 w-full px-2 flex-1">
          {links.map((l) => (
            <div key={l.to} className="relative group">
              <NavLink
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center justify-center w-full h-10 rounded-lg transition-colors",
                    isActive
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                      : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  )
                }
              >
                {l.icon}
              </NavLink>
              <Tooltip label={l.label} />
            </div>
          ))}
        </nav>

        <div className="flex flex-col items-center gap-3 w-full px-2">
          {diskUsage && (
            <div className="relative group w-full flex justify-center">
              <button className="flex flex-col items-center gap-1 w-10 h-10 justify-center">
                <div className="w-5 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      diskUsage.percent > 90 ? "bg-red-500" : diskUsage.percent > 70 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${diskUsage.percent}%` }}
                  />
                </div>
                <span className="text-gray-400 dark:text-gray-500" style={{ fontSize: "9px" }}>
                  {diskUsage.percent}%
                </span>
              </button>
              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-150 shadow-lg">
                {diskUsage.used_gb.toFixed(1)} / {diskUsage.total_gb.toFixed(1)} GB
                <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900 dark:border-l-gray-700" />
              </div>
            </div>
          )}

          <div className="relative group w-full flex justify-center">
            <button
              onClick={toggle}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-150 shadow-lg">
              {theme === "dark" ? "Light mode" : "Dark mode"}
              <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900 dark:border-l-gray-700" />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile: bottom nav bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center safe-area-pb">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors",
                isActive
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-400 dark:text-gray-500"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={clsx("p-1 rounded-lg transition-colors", isActive && "bg-gray-100 dark:bg-gray-800")}>
                  {l.icon}
                </span>
                <span>{l.label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={toggle}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-gray-400 dark:text-gray-500"
        >
          <span className="p-1 rounded-lg">
            {theme === "dark" ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </span>
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </nav>
    </>
  );
}
