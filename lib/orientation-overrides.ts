import overridesJson from "@/data/orientations.json";
import type { Coverage, Orientation, Patio } from "@/lib/types";

/**
 * Orientation data collected with the /admin/orientation tool, kept out of
 * patios.seed.ts so a rapid entry session never has to rewrite TypeScript
 * source. Merged over the seed at read time by lib/patios.ts.
 */
export interface OrientationOverride {
  /** Optional: coverage-only entries are enough where the sun is often overhead (Barbados). */
  orientation?: Orientation;
  coverage?: Coverage;
  obstructionFactor: number;
  /** ISO date-time of the satellite check. */
  verifiedAt: string;
  notes?: string;
}

export type OrientationOverrides = Record<string, OrientationOverride>;

export const orientationOverrides = overridesJson as OrientationOverrides;

/**
 * A curated sun window beats orientation inside estimateExposure(), so an
 * override would be silently ignored on a patio that still carries one. None
 * do today; the guard keeps that from becoming a silent failure later.
 */
export function applyOrientationOverrides(
  patios: Patio[],
  overrides: OrientationOverrides = orientationOverrides
): Patio[] {
  return patios.map((patio) => {
    const override = overrides[patio.id];
    if (!override) return patio;

    const { sunStartsAt, sunEndsAt } = patio.exposure;
    if (sunStartsAt || sunEndsAt) {
      console.warn(
        `[orientation] ${patio.slug} has a curated sun window; ignoring override.`
      );
      return patio;
    }

    return {
      ...patio,
      exposure: {
        ...patio.exposure,
        orientation: override.orientation ?? patio.exposure.orientation,
        coverage: override.coverage ?? patio.exposure.coverage,
        obstructionFactor: override.obstructionFactor,
        exposureSource: "satellite-estimated",
        verifiedAt: override.verifiedAt,
        notes: override.notes ?? patio.exposure.notes,
      },
    };
  });
}
