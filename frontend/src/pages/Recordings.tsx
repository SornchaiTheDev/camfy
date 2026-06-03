import { useState } from "react";
import { useCameras } from "../api/cameras";
import { useRecordings } from "../api/recordings";
import { RecordingList } from "../components/recordings/RecordingList";

export function Recordings() {
  const { data: cameras } = useCameras();
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useRecordings({
    camera_id: selectedCameraId || undefined,
    date: date || undefined,
    page,
    limit: 50,
  });

  return (
    <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recordings</h1>

      <div className="flex gap-4 mb-6 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Camera</label>
          <select
            value={selectedCameraId}
            onChange={(e) => { setSelectedCameraId(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
          >
            <option value="">All cameras</option>
            {cameras?.map((cam) => (
              <option key={cam.id} value={cam.id}>{cam.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
          />
        </div>

        {(selectedCameraId || date) && (
          <div className="flex items-end">
            <button
              onClick={() => { setSelectedCameraId(""); setDate(""); setPage(1); }}
              className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : !selectedCameraId ? (
        <div className="text-gray-400 dark:text-gray-500 text-sm py-16 text-center">Select a camera to view recordings</div>
      ) : (
        <RecordingList
          recordings={data?.data ?? []}
          cameras={cameras ?? []}
          total={data?.total ?? 0}
          page={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
