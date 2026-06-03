import { useState, useMemo } from "react";
import clsx from "clsx";
import { useCameras } from "../api/cameras";
import { useInfiniteRecordings } from "../api/recordings";
import { RecordingFeed } from "../components/recordings/RecordingFeed";
import { DatePicker } from "../components/ui/DatePicker";

export function Recordings() {
  const { data: cameras } = useCameras();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>();

  const searchMatchedId = useMemo(() => {
    if (!search.trim() || !cameras) return undefined;
    const q = search.trim().toLowerCase();
    const cam = cameras.find((c) => c.name.toLowerCase().includes(q));
    return cam?.id;
  }, [search, cameras]);

  // Explicit badge selection wins over text-search match.
  const matchedCameraId = selectedCameraId ?? searchMatchedId;

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteRecordings({
    camera_id: matchedCameraId,
    date: date || undefined,
  });

  const recordings = data?.pages.flatMap((p) => p.data) ?? [];
  const hasFilter = !!search.trim() || !!date || !!selectedCameraId;

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
    <div className="px-3 py-4 sm:p-6 max-w-5xl mx-auto w-full">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recordings</h1>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-5">
        <div className="flex gap-2 flex-1">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search camera..."
              className="w-full px-3 py-2.5 sm:py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            />
          </div>
          <div className="shrink-0">
            <DatePicker value={date} onChange={setDate} placeholder="Filter by date" />
          </div>
        </div>
        {hasFilter && (
          <button
            onClick={() => { setSearch(""); setDate(""); setSelectedCameraId(undefined); }}
            className="px-3 py-2 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors rounded-lg border border-gray-200 dark:border-gray-700 sm:border-transparent sm:hover:bg-transparent"
          >
            Clear
          </button>
        )}
      </div>

      {/* Camera filter badges */}
      {cameras && cameras.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none">
          {cameras.map((cam) => {
            const active = selectedCameraId === cam.id;
            return (
              <button
                key={cam.id}
                onClick={() => setSelectedCameraId(active ? undefined : cam.id)}
                className={clsx(
                  "shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  active
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {cam.name}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading...</div>
      ) : (
        <RecordingFeed
          recordings={recordings}
          cameras={cameras ?? []}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
        />
      )}
    </div>
    </div>
  );
}
