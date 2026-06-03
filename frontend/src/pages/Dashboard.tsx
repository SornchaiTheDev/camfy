import { useCameras } from "../api/cameras";
import { CameraGrid } from "../components/grid/CameraGrid";

export function Dashboard() {
  const { data: cameras, isLoading, error } = useCameras();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
        Loading cameras...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 text-sm">
        Failed to load cameras
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <CameraGrid cameras={cameras ?? []} />
    </div>
  );
}
