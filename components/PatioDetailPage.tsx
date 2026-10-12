import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPatioBySlug } from "@/lib/patios";
import {
  patioSunWindow,
  mapsUrl,
  exposureSourceNote,
  COVERAGE_LABEL,
} from "@/lib/format";
import { cityPath, getCity, type CityId } from "@/lib/cities";
import { PatioExposurePanel } from "@/components/PatioExposurePanel";
import { AdSlot } from "@/components/Ads/AdSlot";
import { SponsoredBadge } from "@/components/Ads/SponsoredBadge";

export async function patioMetadata(
  cityId: CityId,
  slug: string
): Promise<Metadata> {
  const city = getCity(cityId);
  const patio = await getPatioBySlug(slug, cityId);
  if (!patio) return { title: "Not found" };
  const shade = city.defaultMode === "shade";
  return {
    title: `${patio.name} — ${shade ? "shaded" : "sunny"} ${city.venueNoun} in ${patio.neighborhood}`,
    description: shade
      ? `Where is the shade at ${patio.name} in ${patio.neighborhood}, ${city.name}? Check current sun exposure and plan your visit.`
      : `When does ${patio.name} in ${patio.neighborhood}, ${city.name} get sun on the patio? Check current sun exposure and plan your visit.`,
  };
}

/** Detail page body shared by Toronto's /patios/[slug] and /[city]/patios/[slug]. */
export async function PatioDetailPage({
  cityId,
  slug,
}: {
  cityId: CityId;
  slug: string;
}) {
  const patio = await getPatioBySlug(slug, cityId);
  if (!patio) notFound();

  const sunWindow = patioSunWindow(patio, new Date());
  const sourceNote = exposureSourceNote(patio.exposure);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href={cityPath(cityId)} className="text-sm text-accent hover:underline">
        ← Back to the map
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{patio.name}</h1>
        {patio.sponsored && <SponsoredBadge label={patio.sponsorLabel} />}
      </div>
      <p className="mt-1 text-muted">
        {patio.neighborhood} · {patio.address}
      </p>
      {patio.exposure.coverage && (
        <p className="mt-1 text-sm text-muted">
          {COVERAGE_LABEL[patio.exposure.coverage]}
          {patio.exposure.coverage === "roofed" && " · stays dry in a shower"}
        </p>
      )}

      <div className="mt-6">
        <PatioExposurePanel patio={patio} />
      </div>

      {sunWindow && (
        <dl className="mt-6 rounded-xl border border-border bg-surface p-4">
          <dt className="text-xs uppercase tracking-wide text-muted">
            {sunWindow.isEstimate
              ? "Estimated sun window today"
              : "Typical sun window"}
          </dt>
          <dd className="mt-1 font-semibold text-foreground">
            ☀ {sunWindow.text}
          </dd>
        </dl>
      )}

      <a
        href={mapsUrl(patio.address)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-muted py-3 font-medium text-foreground hover:border-accent/60"
      >
        ➤ Open in Maps
      </a>

      {sourceNote && <p className="mt-4 text-xs text-muted">{sourceNote}</p>}

      <div className="mt-8">
        <AdSlot placement="detail-sidebar" />
      </div>
    </main>
  );
}
