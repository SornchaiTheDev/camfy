import { create } from "zustand";
import type { StreamStatus } from "../types";

type StreamStatusStore = {
  statuses: Map<string, StreamStatus>;
  setStatus: (cameraId: string, status: StreamStatus) => void;
  diskUsage: { used_gb: number; total_gb: number; percent: number } | null;
  setDiskUsage: (usage: { used_gb: number; total_gb: number; percent: number }) => void;
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
}));
