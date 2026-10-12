import { CITIES } from "@/lib/cities";

/**
 * Toronto values, kept for tests and Toronto-only call sites. New code should
 * take the city from `getCity()` in lib/cities.ts instead.
 */
export const TORONTO_COORDS = CITIES.toronto.coords;
export const TORONTO_TIMEZONE = CITIES.toronto.timezone;
