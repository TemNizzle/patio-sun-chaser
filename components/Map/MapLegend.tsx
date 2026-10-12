import { STATUS_META } from "@/lib/format";
import type { ViewMode } from "@/lib/cities";

export function MapLegend({ mode = "sun" }: { mode?: ViewMode }) {
  // Same colors in both modes; only the "good" end of the scale moves.
  const items = [
    { color: STATUS_META.sunny.color, label: "Direct sun", best: mode === "sun" },
    { color: STATUS_META.shaded.color, label: "Shaded", best: mode === "shade" },
    { color: STATUS_META["closed-sky"].color, label: "No sun", best: false },
    { color: "var(--you)", label: "You", best: false },
  ];
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-xl border border-border bg-surface/85 px-3 py-2 text-xs shadow-sm backdrop-blur">
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full border border-white/60"
              style={{ backgroundColor: it.color }}
            />
            <span className="text-foreground">
              {it.label}
              {it.best && <span className="text-muted"> · what you want</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
