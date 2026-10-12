import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPatiosForCity } from "@/lib/patios";
import { PatioDetailPage, patioMetadata } from "@/components/PatioDetailPage";
import { CITIES, DEFAULT_CITY_ID, isCityId } from "@/lib/cities";

/** Same daily re-render as the Toronto detail page: the sun window depends on the date. */
export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  const cities = Object.keys(CITIES).filter((id) => id !== DEFAULT_CITY_ID);
  const perCity = await Promise.all(
    cities.map(async (city) => {
      const patios = await getPatiosForCity(city as keyof typeof CITIES);
      return patios.map((p) => ({ city, slug: p.slug }));
    })
  );
  return perCity.flat();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}): Promise<Metadata> {
  const { city, slug } = await params;
  if (!isCityId(city)) return {};
  return patioMetadata(city, slug);
}

export default async function CityPatioPage({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { city, slug } = await params;
  if (!isCityId(city) || city === DEFAULT_CITY_ID) notFound();
  return <PatioDetailPage cityId={city} slug={slug} />;
}
