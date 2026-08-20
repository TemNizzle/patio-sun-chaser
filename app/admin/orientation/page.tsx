import { notFound } from "next/navigation";
import { seedPatios } from "@/data/patios.seed";
import { orientationOverrides } from "@/lib/orientation-overrides";
import { OrientationTool } from "@/components/Admin/OrientationTool";

/** Local data-entry tool; writes to the repo working tree, so dev only. */
export const dynamic = "force-dynamic";

export default function OrientationAdminPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // Seed patios that have neither an orientation nor a curated window, since a
  // window would override anything entered here anyway.
  const needsOrientation = seedPatios.filter(
    (p) =>
      !p.exposure.orientation &&
      !p.exposure.sunStartsAt &&
      !p.exposure.sunEndsAt
  );

  return (
    <OrientationTool
      patios={needsOrientation}
      initialOverrides={orientationOverrides}
    />
  );
}
