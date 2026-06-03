import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_WIDTH = 480;

type GridStore = {
  widths: Record<string, number>;
  heights: Record<string, number>;
  setWidth: (id: string, w: number) => void;
  setHeight: (id: string, h: number) => void;
};

export const useGridStore = create<GridStore>()(
  persist(
    (set) => ({
      widths: {},
      heights: {},
      setWidth: (id, w) => set((s) => ({ widths: { ...s.widths, [id]: w } })),
      setHeight: (id, h) => set((s) => ({ heights: { ...s.heights, [id]: h } })),
    }),
    { name: "camfy-grid-v3" }
  )
);
