import clsx from "clsx";
import type { StreamStatus } from "../../types";

const COLORS: Record<StreamStatus, string> = {
  recording: "bg-green-500",
  idle: "bg-gray-500",
  error: "bg-red-500",
};

const LABELS: Record<StreamStatus, string> = {
  recording: "REC",
  idle: "IDLE",
  error: "ERR",
};

type Props = { status: StreamStatus; className?: string };

export function Badge({ status, className }: Props) {
  return (
    <span className={clsx("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono text-white", COLORS[status], className)}>
      {status === "recording" && (
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      )}
      {LABELS[status]}
    </span>
  );
}
