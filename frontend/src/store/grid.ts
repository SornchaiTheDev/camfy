import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LayoutItem } from "react-grid-layout";
import type { CameraGridSize } from "../types";

type GridStore = {
  layouts: { lg: LayoutItem[] };
  cellSizes: Record<string, CameraGridSize>;
  setLayouts: (layouts: { lg: LayoutItem[] }) => void;
  setCellSize: (cameraId: string, size: CameraGridSize) => void;
  reconcile: (cameraIds: string[]) => void;
};

const SIZE_COLS: Record<CameraGridSize, number> = {
  small: 3,
  medium: 6,
  large: 12,
};
const SIZE_ROWS: Record<CameraGridSize, number> = {
  small: 3,
  medium: 4,
  large: 6,
};

export const useGridStore = create<GridStore>()(
  persist(
    (set) => ({
      layouts: { lg: [] },
      cellSizes: {},

      setLayouts: (layouts) => set({ layouts }),

      setCellSize: (cameraId, size) =>
        set((s) => {
          const cellSizes = { ...s.cellSizes, [cameraId]: size };
          const lg = s.layouts.lg.map((item) =>
            item.i === cameraId
              ? { ...item, w: SIZE_COLS[size], h: SIZE_ROWS[size] }
              : item
          );
          return { cellSizes, layouts: { lg } };
        }),

      reconcile: (cameraIds) =>
        set((s) => {
          const existingIds = new Set(cameraIds);
          // prune orphaned
          const lg = s.layouts.lg.filter((item) => existingIds.has(item.i));
          const cellSizes = Object.fromEntries(
            Object.entries(s.cellSizes).filter(([id]) => existingIds.has(id))
          );
          // add missing
          const existingLayoutIds = new Set(lg.map((l) => l.i));
          let col = 0;
          let row = lg.length > 0 ? Math.max(...lg.map((l) => l.y + l.h)) : 0;
          for (const id of cameraIds) {
            if (existingLayoutIds.has(id)) continue;
            const size: CameraGridSize = cellSizes[id] ?? "medium";
            const w = SIZE_COLS[size];
            const h = SIZE_ROWS[size];
            if (col + w > 12) { col = 0; row += h; }
            lg.push({ i: id, x: col, y: row, w, h });
            col += w;
          }
          return { layouts: { lg }, cellSizes };
        }),
    }),
    { name: "camfy-grid" }
  )
);
