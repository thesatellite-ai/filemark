/**
 * Resolve a public-asset path against Vite's base URL.
 *
 * In dev the site is served at `/` so `asset("/screenshots/x.png")` →
 * `/screenshots/x.png`. In production the Cloudflare gateway serves the
 * site under `/apps/filemark/` (Vite `base`), so the same call returns
 * `/apps/filemark/screenshots/x.png`. Use this everywhere we reference
 * static assets in `apps/website/public/` from JSX or anywhere else;
 * absolute `/foo` paths in JSX do NOT get rewritten by Vite at build
 * time, only `import` statements do.
 */
export function asset(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
