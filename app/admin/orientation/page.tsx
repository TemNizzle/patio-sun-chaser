import { notFound } from "next/navigation";
import { seedPatios } from "@/data/patios.seed";
import { barbadosPatios } from "@/data/barbados.seed";
import { orientationOverrides } from "@/lib/orientation-overrides";
import { getCity, isCityId, DEFAULT_CITY_ID } from "@/lib/cities";
import { OrientationTool } from "@/components/Admin/OrientationTool";

/** Local data-entry tool; writes to the repo working tree, so dev only. */
export const dynamic = "force-dynamic";

/** `?city=barbados` reviews that city's venues; defaults to Toronto. */
export default async function OrientationAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { city: cityParam } = await searchParams;
  const cityId = cityParam && isCityId(cityParam) ? cityParam : DEFAULT_CITY_ID;
  const city = getCity(cityId);
  const all = [...seedPatios, ...barbadosPatios].filter(
    (p) => (p.city ?? DEFAULT_CITY_ID) === cityId
  );

  // Patios that have neither an orientation nor a curated window, since a
  // window would override anything entered here anyway. In Barbados cover is
  // what matters, so anything with no cover recorded yet is also queued.
  const needsReview = all.filter((p) => {
    if (p.exposure.sunStartsAt || p.exposure.sunEndsAt) return false;
    if (cityId === "barbados") return !p.exposure.coverage;
    return !p.exposure.orientation;
  });

  return (
    <OrientationTool
      patios={needsReview}
      initialOverrides={orientationOverrides}
      center={city.coords}
    />
  );
}
