import { useEffect, useCallback } from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";

type Breakpoint = "lg" | "md" | "sm";
import { useGridStore } from "../../store/grid";
import { useReorderCameras } from "../../api/cameras";
import { CameraCell } from "./CameraCell";
import type { CameraWithStatus, ReorderItem } from "../../types";

type Props = {
  cameras: CameraWithStatus[];
};

export function CameraGrid({ cameras }: Props) {
  const { layouts, setLayouts, reconcile } = useGridStore();
  const reorder = useReorderCameras();
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1280 });

  useEffect(() => {
    reconcile(cameras.map((c) => c.id));
  }, [cameras, reconcile]);

  const handleLayoutChange = useCallback(
    (_currentLayout: Layout, allLayouts: ResponsiveLayouts<Breakpoint>) => {
      const lg = allLayouts.lg;
      if (lg) setLayouts({ lg: [...lg] as LayoutItem[] });
    },
    [setLayouts]
  );

  const handleDragStop = useCallback(
    (layout: Layout) => {
      const items: ReorderItem[] = layout.map((item, idx) => ({
        id: item.i,
        grid_order: idx,
      }));
      reorder.mutate(items);
    },
    [reorder]
  );

  if (cameras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <div className="text-4xl mb-3">📷</div>
        <p className="text-lg">No cameras configured</p>
        <p className="text-sm mt-1">Add cameras in Settings</p>
      </div>
    );
  }

  const cameraMap = new Map(cameras.map((c) => [c.id, c]));

  return (
    <div ref={containerRef} className="w-full">
      {mounted && (
        <ResponsiveGridLayout<Breakpoint>
          width={width}
          layouts={{ lg: layouts.lg }}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={{ lg: 12, md: 12, sm: 6 }}
          rowHeight={80}
          dragConfig={{ handle: ".drag-handle" }}
          onLayoutChange={handleLayoutChange}
          onDragStop={handleDragStop}
        >
          {layouts.lg
            .filter((item) => cameraMap.has(item.i))
            .map((item) => {
              const camera = cameraMap.get(item.i)!;
              return (
                <div key={item.i} className="relative">
                  <div className="drag-handle absolute top-0 left-0 right-12 h-8 cursor-grab active:cursor-grabbing z-10" />
                  <CameraCell camera={camera} />
                </div>
              );
            })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
