/**
 * Base URL for canonical/OG metadata. Resolves in priority order:
 *  1. NEXT_PUBLIC_SITE_URL (set this to your custom domain in production)
 *  2. Vercel-provided deployment URL (automatic on Vercel)
 *  3. localhost for local dev
 */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return new URL(`https://${vercel}`);

  return new URL("http://localhost:3000");
}
