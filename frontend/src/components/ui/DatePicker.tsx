import { useState, useRef, useEffect } from "react";
import clsx from "clsx";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseLocal(val: string): Date | null {
  if (!val) return null;
  const [y, m, d] = val.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder = "Pick date" }: Props) {
  const selected = parseLocal(value);
  const today = new Date();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(() => {
    const base = selected ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // sync view when value changes externally
  useEffect(() => {
    if (selected) setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]);

  function prevMonth() {
    setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  }
  function nextMonth() {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1));
  }

  // build calendar grid cells
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { day: number; cur: boolean }[] = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, cur: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, cur: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, cur: false });
  }

  function selectDay(day: number, cur: boolean) {
    let d: Date;
    if (!cur) {
      // determine if it's prev or next month
      if (cells[0]?.cur === false && day > 15) {
        d = new Date(year, month - 1, day);
      } else {
        d = new Date(year, month + 1, day);
      }
    } else {
      d = new Date(year, month, day);
    }
    onChange(toLocalISO(d));
    setOpen(false);
  }

  function isSelected(day: number, cur: boolean) {
    if (!selected || !cur) return false;
    return (
      selected.getFullYear() === year &&
      selected.getMonth() === month &&
      selected.getDate() === day
    );
  }

  function isToday(day: number, cur: boolean) {
    if (!cur) return false;
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  }

  const displayLabel = selected
    ? selected.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : placeholder;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-lg text-sm border transition-colors",
          "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
          "focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500",
          selected
            ? "text-gray-900 dark:text-white"
            : "text-gray-400 dark:text-gray-500"
        )}
      >
        <CalIcon />
        <span>{displayLabel}</span>
      </button>

      {/* Popup */}
      {open && (
        <div className={clsx(
          "absolute z-50 mt-1 right-0 w-72 rounded-xl shadow-xl border p-3",
          "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <ChevronLeft />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <ChevronRight />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((cell, i) => {
              const sel = isSelected(cell.day, cell.cur);
              const tod = isToday(cell.day, cell.cur);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(cell.day, cell.cur)}
                  className={clsx(
                    "h-8 w-full rounded-lg text-sm transition-colors",
                    sel && "bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold",
                    !sel && tod && "text-gray-900 dark:text-white font-semibold ring-1 ring-gray-300 dark:ring-gray-600",
                    !sel && !tod && cell.cur && "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800",
                    !cell.cur && "text-gray-300 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50",
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {selected && (
            <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Clear date
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="2.5" width="13" height="12" rx="2" />
      <line x1="1.5" y1="6.5" x2="14.5" y2="6.5" />
      <line x1="5" y1="1" x2="5" y2="4" />
      <line x1="11" y1="1" x2="11" y2="4" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="10 4 6 8 10 12" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="6 4 10 8 6 12" />
    </svg>
  );
}
