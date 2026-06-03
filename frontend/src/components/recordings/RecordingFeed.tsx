import { useEffect, useRef, useState } from "react";
import { useDeleteRecording } from "../../api/recordings";
import { RecordingPlayer } from "./RecordingPlayer";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";
import type { Recording, CameraWithStatus } from "../../types";

type Props = {
  recordings: Recording[];
  cameras: CameraWithStatus[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatDateHeading(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function getDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA");
}

function getHourKey(iso: string): number {
  return new Date(iso).getHours();
}

function formatHourHeading(hour: number): string {
  const start = hour % 12 === 0 ? 12 : hour % 12;
  const end = (hour + 1) % 12 === 0 ? 12 : (hour + 1) % 12;
  const startSuffix = hour < 12 ? "AM" : "PM";
  const endSuffix = hour + 1 < 12 ? "AM" : "PM";
  return `${start}:00 ${startSuffix} – ${end}:00 ${endSuffix}`;
}

function RecordingCard({
  rec,
  camName,
  onPlay,
  onDelete,
}: {
  rec: Recording;
  camName: string;
  onPlay: () => void;
  onDelete: () => void;
}) {
  const [thumbError, setThumbError] = useState(false);

  return (
    <div className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      {/* Thumbnail */}
      <button
        onClick={onPlay}
        className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 block overflow-hidden"
      >
        {!thumbError ? (
          <img
            src={`/api/recordings/${rec.id}/thumb`}
            alt=""
            onError={() => setThumbError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M4 8a2 2 0 012-2h9a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
            </svg>
          </div>
        )}
        {/* Play overlay — always visible on touch, hover-only on pointer devices */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded font-mono">
          {formatDuration(rec.duration_sec)}
        </div>
      </button>

      {/* Info row */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{camName}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-2">
            <span>{formatTime(rec.recorded_at)}</span>
            <span>·</span>
            <span>{formatBytes(rec.size_bytes)}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <a
            href={`/api/recordings/${rec.id}/download`}
            download={`${rec.id}.mp4`}
            title="Download"
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
          <button
            onClick={onDelete}
            title="Delete"
            className="p-2 text-gray-400 hover:text-red-500 active:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function RecordingFeed({ recordings, cameras, hasNextPage, isFetchingNextPage, onLoadMore }: Props) {
  const [playing, setPlaying] = useState<Recording | null>(null);
  const [deleting, setDeleting] = useState<Recording | null>(null);
  const deleteRec = useDeleteRecording();
  const { toast } = useToast();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const cameraMap = new Map(cameras.map((c) => [c.id, c]));

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMore(); },
      { rootMargin: "200px" }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasNextPage, onLoadMore]);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteRec.mutateAsync(deleting.id);
      toast("Recording deleted", "success");
      setDeleting(null);
    } catch {
      toast("Failed to delete", "error");
    }
  }

  if (recordings.length === 0) {
    return <div className="text-gray-400 dark:text-gray-500 text-sm py-16 text-center">No recordings found</div>;
  }

  type HourGroup = { hour: number; items: Recording[] };
  type DayGroup = { date: string; hours: HourGroup[] };

  const groups: DayGroup[] = [];
  for (const rec of recordings) {
    const dateKey = getDateKey(rec.recorded_at);
    const hour = getHourKey(rec.recorded_at);

    let dayGroup = groups[groups.length - 1];
    if (!dayGroup || dayGroup.date !== dateKey) {
      dayGroup = { date: dateKey, hours: [] };
      groups.push(dayGroup);
    }

    let hourGroup = dayGroup.hours[dayGroup.hours.length - 1];
    if (!hourGroup || hourGroup.hour !== hour) {
      hourGroup = { hour, items: [] };
      dayGroup.hours.push(hourGroup);
    }

    hourGroup.items.push(rec);
  }

  const playingCamera = playing ? cameraMap.get(playing.camera_id) : null;

  return (
    <>
      <div className="space-y-10 min-w-0 w-full">
        {groups.map((group) => {
          const totalClips = group.hours.reduce((n, h) => n + h.items.length, 0);
          return (
            <div key={group.date}>
              {/* Day heading */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {formatDateHeading(group.date)}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs text-gray-400 dark:text-gray-600">
                  {totalClips} clip{totalClips !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Hour sub-groups */}
              <div className="space-y-6">
                {group.hours.map((hourGroup) => (
                  <div key={hourGroup.hour}>
                    {/* Hour heading */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                        {formatHourHeading(hourGroup.hour)}
                      </span>
                      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800/60" />
                      <span className="text-xs text-gray-300 dark:text-gray-700">
                        {hourGroup.items.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {hourGroup.items.map((rec) => {
                        const cam = cameraMap.get(rec.camera_id);
                        return (
                          <RecordingCard
                            key={rec.id}
                            rec={rec}
                            camName={cam?.name ?? rec.camera_id}
                            onPlay={() => setPlaying(rec)}
                            onDelete={() => setDeleting(rec)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div ref={sentinelRef} className="py-4 text-center">
        {isFetchingNextPage && (
          <span className="text-gray-400 dark:text-gray-500 text-sm">Loading more...</span>
        )}
        {!hasNextPage && recordings.length > 0 && (
          <span className="text-gray-300 dark:text-gray-700 text-xs">All recordings loaded</span>
        )}
      </div>

      {playing && playingCamera && (
        <RecordingPlayer
          recording={playing}
          camera={playingCamera}
          onClose={() => setPlaying(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete Recording"
          message="Delete this recording segment? This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
