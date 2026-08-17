import { STATUS_META } from "@/lib/format";

// Ordered along the sun-intensity gradient: most sun -> none.
const ITEMS = [
  { color: STATUS_META.sunny.color, label: "Direct sun" },
  { color: STATUS_META.shaded.color, label: "Shaded" },
  { color: STATUS_META["closed-sky"].color, label: "No sun" },
  { color: "var(--you)", label: "You" },
];

export function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-xl border border-border bg-surface/85 px-3 py-2 text-xs shadow-sm backdrop-blur">
      <div className="flex flex-col gap-1.5">
        {ITEMS.map((it) => (
          <div key={it.label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full border border-white/60"
              style={{ backgroundColor: it.color }}
            />
            <span className="text-foreground">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
