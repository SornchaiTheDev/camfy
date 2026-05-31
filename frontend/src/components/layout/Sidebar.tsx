import { NavLink } from "react-router-dom";
import clsx from "clsx";

const links = [
  { to: "/", label: "Dashboard", icon: "⊞" },
  { to: "/recordings", label: "Recordings", icon: "⏺" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  return (
    <aside className="w-16 md:w-48 bg-gray-900 flex flex-col py-4 shrink-0">
      <div className="px-4 mb-6 hidden md:block">
        <span className="text-white font-bold text-lg tracking-tight">Camfy</span>
      </div>
      <div className="px-2 mb-4 md:hidden flex justify-center">
        <span className="text-white font-bold text-sm">C</span>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )
            }
          >
            <span className="text-base">{l.icon}</span>
            <span className="hidden md:inline">{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
