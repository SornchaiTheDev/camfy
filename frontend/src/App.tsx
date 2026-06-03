import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RightNav } from "./components/layout/RightNav";
import { Dashboard } from "./pages/Dashboard";
import { Recordings } from "./pages/Recordings";
import { Settings } from "./pages/Settings";
import { Status } from "./pages/Status";
import { CameraFocus } from "./components/camera/CameraFocus";
import { useWebSocket } from "./hooks/useWebSocket";

function AppShell() {
  useWebSocket();

  return (
    <div className="flex h-[100dvh] bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden w-screen max-w-full">
      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-hidden pb-16 sm:pb-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/camera/:id" element={<CameraFocus />} />
          <Route path="/recordings" element={<Recordings />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/status" element={<Status />} />
        </Routes>
      </main>
      <RightNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
