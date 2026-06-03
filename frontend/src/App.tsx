import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RightNav } from "./components/layout/RightNav";
import { Dashboard } from "./pages/Dashboard";
import { Recordings } from "./pages/Recordings";
import { Settings } from "./pages/Settings";
import { useWebSocket } from "./hooks/useWebSocket";

function AppShell() {
  useWebSocket();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <main className="flex-1 min-w-0 overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/recordings" element={<Recordings />} />
          <Route path="/settings" element={<Settings />} />
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
