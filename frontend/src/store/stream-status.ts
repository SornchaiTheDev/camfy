import { create } from "zustand";
import type { StreamStatus } from "../types";

export type ScanResult = {
  registered: number;
  updated: number;
  failed: number;
  scanned_at: string;
};

type StreamStatusStore = {
  statuses: Map<string, StreamStatus>;
  setStatus: (cameraId: string, status: StreamStatus) => void;
  diskUsage: { used_gb: number; total_gb: number; percent: number } | null;
  setDiskUsage: (usage: { used_gb: number; total_gb: number; percent: number }) => void;
  lastScan: ScanResult | null;
  setLastScan: (scan: ScanResult) => void;
};

export const useStreamStatusStore = create<StreamStatusStore>((set) => ({
  statuses: new Map(),
  setStatus: (cameraId, status) =>
    set((s) => {
      const next = new Map(s.statuses);
      next.set(cameraId, status);
      return { statuses: next };
    }),
  diskUsage: null,
  setDiskUsage: (usage) => set({ diskUsage: usage }),
  lastScan: null,
  setLastScan: (scan) => set({ lastScan: scan }),
}));
