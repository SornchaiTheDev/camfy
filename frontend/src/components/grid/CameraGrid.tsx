import { useRef, useCallback, useEffect, useState } from "react";
import { useGridStore, DEFAULT_WIDTH } from "../../store/grid";
import { CameraCell } from "./CameraCell";
import type { CameraWithStatus } from "../../types";

type Props = {
  cameras: CameraWithStatus[];
};

function ResizableCell({
  camera,
  width,
  height,
  onWidthChange,
  onHeightChange,
}: {
  camera: CameraWithStatus;
  width: number;
  height: number;
  onWidthChange: (w: number) => void;
  onHeightChange: (h: number) => void;
}) {
  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const makeResizeHandler = useCallback(
    (axes: "x" | "y" | "xy") => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startRef.current = { x: e.clientX, y: e.clientY, w: width, h: height };

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startRef.current.x;
        const dy = ev.clientY - startRef.current.y;
        if (axes === "x" || axes === "xy") onWidthChange(Math.max(160, startRef.current.w + dx));
        if (axes === "y" || axes === "xy") onHeightChange(Math.max(120, startRef.current.h + dy));
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [width, height, onWidthChange, onHeightChange]
  );

  return (
    <div className="relative flex-shrink-0" style={{ width, height }}>
      <CameraCell camera={camera} />

      {/* Right edge — resize width */}
      <div
        onMouseDown={makeResizeHandler("x")}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-20 hover:bg-white/20 transition-colors"
      />

      {/* Bottom edge — resize height */}
      <div
        onMouseDown={makeResizeHandler("y")}
        className="absolute bottom-0 left-0 right-0 h-1.5 cursor-row-resize z-20 hover:bg-white/20 transition-colors"
      />

      {/* Corner — resize both */}
      <div
        onMouseDown={makeResizeHandler("xy")}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 hover:bg-white/30 transition-colors"
      />
    </div>
  );
}

export function CameraGrid({ cameras }: Props) {
  const { widths, heights, setWidth, setHeight } = useGridStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [defaultHeight, setDefaultHeight] = useState(window.innerHeight);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDefaultHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey) return; // let shift+scroll do native horizontal
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  if (cameras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mb-3 opacity-40">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-500">No cameras configured</p>
        <p className="text-xs mt-1 text-gray-400 dark:text-gray-600">Add cameras in Settings</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto"
    >
      <div
        className="flex flex-row flex-nowrap items-start"
        style={{ minHeight: "100%" }}
      >
        {cameras.map((camera) => (
          <ResizableCell
            key={camera.id}
            camera={camera}
            width={widths[camera.id] ?? DEFAULT_WIDTH}
            height={heights[camera.id] ?? defaultHeight}
            onWidthChange={(w) => setWidth(camera.id, w)}
            onHeightChange={(h) => setHeight(camera.id, h)}
          />
        ))}
      </div>
    </div>
  );
}
