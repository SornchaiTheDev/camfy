import { useCameras } from "../api/cameras";
import { CameraGrid } from "../components/grid/CameraGrid";

export function Dashboard() {
  const { data: cameras, isLoading, error } = useCameras();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading cameras...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        Failed to load cameras
      </div>
    );
  }

  return (
    <div className="p-4 h-full">
      <CameraGrid cameras={cameras ?? []} />
    </div>
  );
}
