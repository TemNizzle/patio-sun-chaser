export function SponsoredBadge({ label = "Sponsored" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
      {label}
    </span>
  );
}
