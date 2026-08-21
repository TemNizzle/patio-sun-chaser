type Placement = "home-top" | "list-inline" | "detail-sidebar";

/**
 * Placeholder ad unit. Swap the inner markup for a real ad-network script
 * (e.g. a next/script tag) later — call sites and layout stay unchanged.
 */
export function AdSlot({ placement }: { placement: Placement }) {
  return (
    <div
      data-ad-placement={placement}
      className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted px-4 py-6 text-center text-xs text-muted"
    >
      <div>
        <div className="font-semibold uppercase tracking-wide">Advertisement</div>
        <div className="mt-1">
          Reach sun-chasers here.{" "}
          <a href="mailto:d.vidal@outlook.com" className="text-accent underline">
            Advertise with us
          </a>
        </div>
      </div>
    </div>
  );
}
