import clsx from "clsx";
import type { CameraGridSize } from "../../types";

const SIZES: CameraGridSize[] = ["small", "medium", "large"];

type Props = {
  value: CameraGridSize;
  onChange: (size: CameraGridSize) => void;
};

export function CellSizeControl({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {SIZES.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={clsx(
            "px-2 py-0.5 text-xs rounded transition-colors",
            value === s
              ? "bg-white text-gray-900"
              : "bg-black/40 text-gray-300 hover:bg-black/60"
          )}
        >
          {s[0].toUpperCase()}
        </button>
      ))}
    </div>
  );
}
