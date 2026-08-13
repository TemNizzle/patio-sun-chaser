import type { SunStatus } from "@/lib/sun-exposure";
import type { ExposureProfile } from "@/lib/types";

export const STATUS_META: Record<
  SunStatus,
  { label: string; color: string; dot: string }
> = {
  sunny: { label: "Sunny now", color: "var(--sun-sunny)", dot: "🟢" },
  shaded: { label: "In shade", color: "var(--sun-shaded)", dot: "⚪️" },
  "closed-sky": { label: "No sun", color: "var(--sun-shaded)", dot: "⚫️" },
};

/** "00:00-00:00" is the CSV's sentinel for unknown hours. */
export function formatHours(hours?: string): string | null {
  if (!hours || hours === "00:00-00:00") return null;
  return hours.replace("-", " – ");
}

export function formatSunWindow(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  return `${start} – ${end}`;
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`;
}

/** Detail-page disclaimer/confirmation copy for an exposure profile's data source. */
export function exposureSourceNote(exposure: ExposureProfile): string | null {
  const verifiedDate = exposure.verifiedAt
    ? new Date(exposure.verifiedAt).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  switch (exposure.exposureSource) {
    case "mockdata-csv":
      return "Sun times shown are placeholder estimates from seed data, not yet verified against real sun-angle and building-shadow modeling.";
    case "verified":
      return verifiedDate
        ? `Sun exposure verified in person on ${verifiedDate}.`
        : "Sun exposure verified in person.";
    case "satellite-estimated":
      return "Sun exposure estimated from satellite imagery, not yet confirmed with staff.";
    case "manual":
      return null;
  }
}
