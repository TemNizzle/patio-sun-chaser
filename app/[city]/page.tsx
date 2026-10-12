import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CityHome } from "@/components/CityHome";
import { CITIES, DEFAULT_CITY_ID, getCity, isCityId } from "@/lib/cities";

/** Only the non-default cities live under /<city>; Toronto stays at "/". */
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(CITIES)
    .filter((id) => id !== DEFAULT_CITY_ID)
    .map((city) => ({ city }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: cityParam } = await params;
  if (!isCityId(cityParam)) return {};
  const city = getCity(cityParam);
  const lookingFor = city.defaultMode === "shade" ? "shaded" : "sunny";
  return {
    title: {
      absolute: `${city.brand} — Find ${lookingFor} ${city.venueNounPlural} in ${city.name}`,
    },
    description: `A live directory of ${city.name} ${city.venueDescription}, showing which are in the ${city.defaultMode} right now and when that changes.`,
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  if (!isCityId(city) || city === DEFAULT_CITY_ID) notFound();
  return <CityHome cityId={city} />;
}
