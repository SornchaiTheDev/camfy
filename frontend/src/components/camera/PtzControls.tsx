import { useCallback, useRef } from "react";
import { usePtzMove, usePtzStop, type PtzVelocity } from "../../api/cameras";

const BTN_SPEED = 0.6;   // fixed velocity for D-pad buttons
const DRAG_GAIN = 1.4;   // how aggressively drag distance maps to velocity
const PINCH_GAIN = 2.5;  // pinch distance → zoom velocity

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * PTZ overlay: a transparent gesture surface over the whole video (drag = pan/tilt,
 * pinch = zoom) plus a D-pad + zoom button pad in the corner. Must be mounted inside
 * the `relative` video container.
 */
export function PtzControls({ cameraId }: { cameraId: string }) {
  const move = usePtzMove(cameraId);
  const stop = usePtzStop(cameraId);

  // Dedupe identical velocities so we don't spam the camera while a finger is held.
  const lastSent = useRef<PtzVelocity | null>(null);
  const moving = useRef(false);

  const send = useCallback((v: PtzVelocity) => {
    const r = { x: round2(v.x), y: round2(v.y), zoom: round2(v.zoom) };
    const prev = lastSent.current;
    if (prev && prev.x === r.x && prev.y === r.y && prev.zoom === r.zoom) return;
    lastSent.current = r;
    moving.current = true;
    move.mutate(r);
  }, [move]);

  const halt = useCallback(() => {
    if (!moving.current) return;
    moving.current = false;
    lastSent.current = null;
    stop.mutate();
  }, [stop]);

  // ── Gesture surface (drag = pan/tilt, two-finger pinch = zoom) ────────────────
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ x: number; y: number; dist: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const dist = pts.length >= 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    start.current = { x: cx, y: cy, dist };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !start.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = e.currentTarget.getBoundingClientRect();
    const pts = [...pointers.current.values()];

    if (pts.length >= 2) {
      // Pinch → zoom only
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const zoom = ((dist - start.current.dist) / rect.width) * PINCH_GAIN;
      send({ x: 0, y: 0, zoom });
      return;
    }

    // Single-pointer drag → pan/tilt, normalized by element size
    const dx = ((e.clientX - start.current.x) / (rect.width / 2)) * DRAG_GAIN;
    const dy = ((e.clientY - start.current.y) / (rect.height / 2)) * DRAG_GAIN;
    send({ x: dx, y: -dy, zoom: 0 }); // screen-up = tilt-up (positive)
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      start.current = null;
      halt();
    }
  };

  // ── Button helpers ────────────────────────────────────────────────────────────
  const hold = (v: PtzVelocity) => ({
    onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); send(v); },
    onPointerUp: (e: React.PointerEvent) => { e.stopPropagation(); halt(); },
    onPointerLeave: () => halt(),
    onPointerCancel: () => halt(),
  });

  const btn = "flex items-center justify-center w-11 h-11 rounded-lg bg-black/50 hover:bg-black/70 text-white text-xl font-bold select-none touch-none active:bg-white/30";

  return (
    <>
      {/* Gesture surface — sits under the button pad, captures drag/pinch on the video */}
      <div
        className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* D-pad + zoom pad */}
      <div className="absolute bottom-4 right-4 flex items-end gap-3 touch-none">
        {/* zoom */}
        <div className="flex flex-col gap-2">
          <button className={btn} aria-label="Zoom in" {...hold({ x: 0, y: 0, zoom: BTN_SPEED })}>+</button>
          <button className={btn} aria-label="Zoom out" {...hold({ x: 0, y: 0, zoom: -BTN_SPEED })}>−</button>
        </div>
        {/* d-pad */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1">
          <span />
          <button className={btn} aria-label="Tilt up" {...hold({ x: 0, y: BTN_SPEED, zoom: 0 })}>↑</button>
          <span />
          <button className={btn} aria-label="Pan left" {...hold({ x: -BTN_SPEED, y: 0, zoom: 0 })}>←</button>
          <span />
          <button className={btn} aria-label="Pan right" {...hold({ x: BTN_SPEED, y: 0, zoom: 0 })}>→</button>
          <span />
          <button className={btn} aria-label="Tilt down" {...hold({ x: 0, y: -BTN_SPEED, zoom: 0 })}>↓</button>
          <span />
        </div>
      </div>
    </>
  );
}
