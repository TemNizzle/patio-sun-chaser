import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_CITY_ID, cityPath, type CityId } from "@/lib/cities";
import {
  CITY_COOKIE,
  isCityIdValue,
  nearestCity,
  pointFromHeaders,
} from "@/lib/geo";

/**
 * Opens "/" on the visitor's own city instead of always Toronto.
 *
 * Order of preference:
 *  1. The city they picked before (cookie set by the city switcher, or by
 *     "Find me" when it detects they are in another city).
 *  2. The nearest city to their IP location. Vercel supplies a coarse
 *     latitude/longitude on `x-vercel-ip-*` headers; that is precise enough to
 *     pick a city and needs no permission prompt.
 *  3. Toronto, when neither is available (local dev, unknown IP).
 *
 * Only "/" is matched, so city pages and venue pages are never redirected.
 */
export function proxy(request: NextRequest) {
  const cookie = request.cookies.get(CITY_COOKIE)?.value;
  let target: CityId = DEFAULT_CITY_ID;

  if (isCityIdValue(cookie)) {
    target = cookie;
  } else {
    const point = pointFromHeaders(
      request.headers.get("x-vercel-ip-latitude"),
      request.headers.get("x-vercel-ip-longitude")
    );
    if (point) target = nearestCity(point).city.id;
  }

  if (target === DEFAULT_CITY_ID) return NextResponse.next();
  return NextResponse.redirect(new URL(cityPath(target), request.url));
}

export const config = {
  matcher: "/",
};
