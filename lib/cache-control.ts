/** Shared Cache-Control values. firebase.json repeats IMMUTABLE_CACHE for Hosting. */

export const PUBLIC_PAGE_CACHE = "public, s-maxage=300, stale-while-revalidate=600"

/** Shared caches must not reuse a logged-out page for a browser that sent Cookie. */
export const PUBLIC_PAGE_VARY = "Cookie"

export const PRIVATE_NO_STORE = "private, no-store"

export const IMMUTABLE_CACHE =
  "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable"

// Cookie-setting routes live under these prefixes (session, claim, logout). A response
// that sets a cookie must stay private, and these paths are private even with no cookie.
const PRIVATE_PREFIXES = ["/admin", "/dashboard", "/login", "/signup", "/auth", "/partner", "/api"]

export function isPrivatePage(pathname: string) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function cacheControlFor(input: {
  method: string
  pathname: string
  hasSession: boolean
  preview: boolean
}) {
  if (input.method !== "GET" && input.method !== "HEAD") return PRIVATE_NO_STORE
  if (input.hasSession || input.preview || isPrivatePage(input.pathname)) return PRIVATE_NO_STORE
  return PUBLIC_PAGE_CACHE
}

export function varyForCache(cacheControl: string) {
  return cacheControl === PUBLIC_PAGE_CACHE ? PUBLIC_PAGE_VARY : null
}
