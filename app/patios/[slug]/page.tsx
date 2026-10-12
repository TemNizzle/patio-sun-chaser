import type { Metadata } from "next";
import { getPatiosForCity } from "@/lib/patios";
import { PatioDetailPage, patioMetadata } from "@/components/PatioDetailPage";
import { DEFAULT_CITY_ID } from "@/lib/cities";

/**
 * The orientation-derived sun window depends on the date, so a page built once
 * would serve a stale window forever. Re-render daily.
 */
export const revalidate = 86400;

export async function generateStaticParams() {
  const patios = await getPatiosForCity(DEFAULT_CITY_ID);
  return patios.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return patioMetadata(DEFAULT_CITY_ID, slug);
}

export default async function PatioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PatioDetailPage cityId={DEFAULT_CITY_ID} slug={slug} />;
}
