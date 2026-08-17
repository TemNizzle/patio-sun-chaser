import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPatios, getPatioBySlug } from "@/lib/patios";
import { patioSunWindow, mapsUrl, exposureSourceNote } from "@/lib/format";
import { PatioExposurePanel } from "@/components/PatioExposurePanel";
import { AdSlot } from "@/components/Ads/AdSlot";
import { SponsoredBadge } from "@/components/Ads/SponsoredBadge";

/**
 * The orientation-derived sun window depends on the date, so a page built once
 * would serve a stale window forever. Re-render daily.
 */
export const revalidate = 86400;

export async function generateStaticParams() {
  const patios = await getAllPatios();
  return patios.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const patio = await getPatioBySlug(slug);
  if (!patio) return { title: "Patio not found" };
  return {
    title: `${patio.name} — sunny patio in ${patio.neighborhood}`,
    description: `When does ${patio.name} in ${patio.neighborhood}, Toronto get sun on the patio? Check current sun exposure and plan your visit.`,
  };
}

export default async function PatioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const patio = await getPatioBySlug(slug);
  if (!patio) notFound();

  const sunWindow = patioSunWindow(patio, new Date());
  const sourceNote = exposureSourceNote(patio.exposure);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← Back to the map
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{patio.name}</h1>
        {patio.sponsored && <SponsoredBadge label={patio.sponsorLabel} />}
      </div>
      <p className="mt-1 text-muted">
        {patio.neighborhood} · {patio.address}
      </p>

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
