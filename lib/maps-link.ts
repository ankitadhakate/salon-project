/**
 * Google Maps links pasted by an owner. Parsing is local. Short links are
 * resolved by following redirects one hop at a time. No Google API.
 */

const MAX_URL_LENGTH = 2000
const DEFAULT_MAX_REDIRECTS = 5
const DEFAULT_TIMEOUT_MS = 5000
const MAX_BODY_BYTES = 64 * 1024

export const MAPS_LINK_ERRORS = {
  notMaps: "That isn't a Google Maps link. Paste a link from Maps, or search the address.",
  offMap: "Those coordinates are off the map. Paste a link that opens the salon.",
  nullIsland: "That link points at 0, 0. Paste the link that opens the salon.",
  noPin: "That Maps link has no pin we can use. Open the salon in Maps and copy that link, or search the address.",
  shortFailed: "That short link didn't open. Paste the full Google Maps link, or search the address.",
  tooMany: "That short link redirected too many times. Paste the full Maps link, or search the address.",
  timeout: "That Maps link took too long. Paste the full link, or search the address.",
  tooLarge: "That Maps link was too large to open. Paste the full link, or search the address.",
  leftGoogle: "That link leaves Google Maps. Paste a maps.app.goo.gl link or the full Maps URL.",
  save: "That Google Maps link can't be saved. Paste it again, or clear the field.",
} as const

const REDIRECT_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "google.com",
  "www.google.com",
  "google.co.in",
  "www.google.co.in",
  "maps.google.com",
  "consent.google.com",
])

export type MapsLinkResult =
  | { ok: true; kind: "coords"; latitude: number; longitude: number; mapsUrl: string }
  | { ok: true; kind: "place"; placeQuery: string; mapsUrl: string }
  | { ok: true; kind: "short"; mapsUrl: string }
  | { ok: false; error: string }

type FetchLike = (input: string, init: RequestInit) => Promise<Response>

type Extracted =
  | { kind: "coords"; latitude: number; longitude: number }
  | { kind: "place"; placeQuery: string }
  | { kind: "none" }
  | { kind: "error"; error: string }

function fail(error: string): MapsLinkResult {
  return { ok: false, error }
}

function hostName(hostname: string) {
  return hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "")
}

export function isIpLiteral(hostname: string) {
  const host = hostName(hostname)
  if (!host) return false
  if (host.includes(":")) return true
  if (/^\d+$/.test(host)) return true
  if (/^0x[0-9a-f]+$/i.test(host)) return true
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return true
  return false
}

function isGoogleMapsHost(host: string) {
  return /^(?:maps\.|www\.)?google\.(?:[a-z]{2,3}|[a-z]{2,3}\.[a-z]{2})$/.test(host)
}

function isMapsPath(url: URL) {
  return url.pathname === "/maps" || url.pathname.startsWith("/maps/")
}

function isShortHost(url: URL) {
  const host = hostName(url.hostname)
  if (host === "maps.app.goo.gl") return true
  if (host === "goo.gl") return url.pathname === "/maps" || url.pathname.startsWith("/maps/")
  return false
}

function isMapsPage(url: URL) {
  const host = hostName(url.hostname)
  if (isIpLiteral(host)) return false
  if (isShortHost(url)) return true
  if (!isGoogleMapsHost(host)) return false
  if (host.startsWith("maps.google.")) return true
  return isMapsPath(url)
}

function isPasteHost(url: URL) {
  return isMapsPage(url) || hostName(url.hostname) === "consent.google.com"
}

/** Hosts a redirect is allowed to land on. Country TLDs are accepted as pasted URLs, not as hops. */
export function isRedirectHost(url: URL) {
  const host = hostName(url.hostname)
  if (isIpLiteral(host) || !REDIRECT_HOSTS.has(host)) return false
  if (host === "goo.gl") return url.pathname === "/maps" || url.pathname.startsWith("/maps/")
  if (host === "maps.app.goo.gl" || host === "consent.google.com" || host === "maps.google.com") return true
  return isMapsPath(url)
}

function readUrl(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  if (url.protocol !== "https:") return null
  if (url.username || url.password) return null
  if (isIpLiteral(url.hostname)) return null
  return url
}

/** Keep only an https Google Maps URL. Anything else is dropped before it is stored. */
export function sanitizeMapsUrl(raw: string | null | undefined) {
  if (!raw) return null
  const url = readUrl(raw)
  if (!url || !isMapsPage(url)) return null
  url.hash = ""
  const stored = url.toString()
  if (stored.length > MAX_URL_LENGTH) return null
  return stored
}

export function readMapsUrl(formData: FormData) {
  const raw = String(formData.get("mapsUrl") ?? "").trim()
  if (!raw) return { ok: true as const, value: null }
  const value = sanitizeMapsUrl(raw)
  if (!value) return { ok: false as const, error: MAPS_LINK_ERRORS.save }
  return { ok: true as const, value }
}

function parsePair(latRaw: string, lngRaw: string): Extracted | null {
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(latRaw) || !/^[+-]?\d+(?:\.\d+)?$/.test(lngRaw)) return null
  const latitude = Number(latRaw)
  const longitude = Number(lngRaw)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { kind: "error", error: MAPS_LINK_ERRORS.offMap }
  }
  if (latitude === 0 && longitude === 0) {
    return { kind: "error", error: MAPS_LINK_ERRORS.nullIsland }
  }
  return { kind: "coords", latitude, longitude }
}

function pairFromText(value: string): Extracted | null {
  const match = value
    .trim()
    .replace(/^loc:/i, "")
    .match(/^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/)
  if (!match) return null
  return parsePair(match[1]!, match[2]!)
}

function decoded(url: URL) {
  const raw = `${url.pathname}${url.search}`
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function cleanPlace(value: string) {
  const name = value.replace(/\+/g, " ").replace(/\s+/g, " ").trim()
  if (name.length < 3 || name.length > 160) return null
  if (!/[\p{L}\p{N}]/u.test(name)) return null
  if (pairFromText(name)) return null
  return name
}

function extract(url: URL): Extracted {
  const text = decoded(url)
  const pins = [...text.matchAll(/!3d([+-]?\d+(?:\.\d+)?)!4d([+-]?\d+(?:\.\d+)?)/g)]
  if (pins.length) {
    const last = pins[pins.length - 1]!
    return parsePair(last[1]!, last[2]!) ?? { kind: "none" }
  }

  for (const key of ["destination", "query", "q", "ll"] as const) {
    const value = url.searchParams.get(key)
    if (!value) continue
    const pair = pairFromText(value)
    if (pair) return pair
  }

  const at = text.match(/@([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/)
  if (at) return parsePair(at[1]!, at[2]!) ?? { kind: "none" }

  const placePath = text.match(/\/maps\/place\/([^/]+)/)
  if (placePath?.[1]) {
    const name = cleanPlace(placePath[1])
    if (name) return { kind: "place", placeQuery: name }
  }
  for (const key of ["q", "query", "destination"] as const) {
    const value = url.searchParams.get(key)
    if (!value) continue
    const name = cleanPlace(value)
    if (name) return { kind: "place", placeQuery: name }
  }
  return { kind: "none" }
}

function withStoredUrl(raw: string, current: URL, located: Extracted): MapsLinkResult {
  const mapsUrl = sanitizeMapsUrl(raw) ?? sanitizeMapsUrl(current.toString())
  if (!mapsUrl) return fail(MAPS_LINK_ERRORS.notMaps)
  if (located.kind === "coords") {
    return { ok: true, kind: "coords", latitude: located.latitude, longitude: located.longitude, mapsUrl }
  }
  if (located.kind === "place") {
    return { ok: true, kind: "place", placeQuery: located.placeQuery, mapsUrl }
  }
  return fail(MAPS_LINK_ERRORS.noPin)
}

/** Parse a full Maps URL. Short links come back as `short` and are not fetched. */
export function parseMapsUrl(raw: string): MapsLinkResult {
  const url = readUrl(raw)
  if (!url || !isPasteHost(url) || hostName(url.hostname) === "consent.google.com") {
    return fail(MAPS_LINK_ERRORS.notMaps)
  }
  const located = extract(url)
  if (located.kind === "error") return fail(located.error)
  if (located.kind === "coords" || located.kind === "place") return withStoredUrl(raw, url, located)
  if (isShortHost(url)) {
    const mapsUrl = sanitizeMapsUrl(raw)
    if (!mapsUrl) return fail(MAPS_LINK_ERRORS.notMaps)
    return { ok: true, kind: "short", mapsUrl }
  }
  return fail(MAPS_LINK_ERRORS.noPin)
}

function consentTarget(url: URL) {
  const next = url.searchParams.get("continue")
  if (!next) return null
  try {
    const target = new URL(next)
    if (target.protocol !== "https:" || target.username || target.password) return null
    return target
  } catch {
    return null
  }
}

function isAbort(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")
}

async function discardBody(response: Response) {
  const length = Number(response.headers.get("content-length") ?? "0")
  await response.body?.cancel().catch(() => undefined)
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return "large" as const
  return "ok" as const
}

/**
 * Follow short-link redirects ourselves. Every hop must be https and on the
 * host allowlist. Bodies are cancelled. Consent pages contribute their continue URL.
 */
export async function resolveMapsLink(
  raw: string,
  options?: { fetch?: FetchLike; timeoutMs?: number; maxRedirects?: number },
): Promise<MapsLinkResult> {
  const fetchImpl = options?.fetch ?? fetch
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxRedirects = options?.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  const deadline = Date.now() + timeoutMs

  let current = readUrl(raw)
  if (!current || !isPasteHost(current)) return fail(MAPS_LINK_ERRORS.notMaps)

  let followed = 0
  for (;;) {
    if (current.protocol !== "https:" || current.username || current.password || isIpLiteral(current.hostname)) {
      return fail(MAPS_LINK_ERRORS.leftGoogle)
    }

    if (hostName(current.hostname) === "consent.google.com") {
      if (followed > 0 && !isRedirectHost(current)) return fail(MAPS_LINK_ERRORS.leftGoogle)
      const next = consentTarget(current)
      if (!next) return fail(MAPS_LINK_ERRORS.noPin)
      followed += 1
      if (followed > maxRedirects) return fail(MAPS_LINK_ERRORS.tooMany)
      current = next
      continue
    }

    if (followed > 0 && !isRedirectHost(current)) return fail(MAPS_LINK_ERRORS.leftGoogle)

    const located = extract(current)
    if (located.kind === "error") return fail(located.error)
    if (located.kind === "coords" || located.kind === "place") return withStoredUrl(raw, current, located)
    if (!isShortHost(current)) return fail(MAPS_LINK_ERRORS.noPin)
    if (followed >= maxRedirects) return fail(MAPS_LINK_ERRORS.tooMany)
    if (Date.now() >= deadline) return fail(MAPS_LINK_ERRORS.timeout)

    let response: Response
    try {
      const remaining = Math.max(1, deadline - Date.now())
      response = await fetchImpl(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(remaining),
        headers: { Accept: "text/html" },
      })
    } catch (error) {
      return fail(isAbort(error) ? MAPS_LINK_ERRORS.timeout : MAPS_LINK_ERRORS.shortFailed)
    }

    const size = await discardBody(response)
    if (size === "large") return fail(MAPS_LINK_ERRORS.tooLarge)
    if (response.status < 300 || response.status >= 400) return fail(MAPS_LINK_ERRORS.shortFailed)
    const location = response.headers.get("location")
    if (!location) return fail(MAPS_LINK_ERRORS.shortFailed)

    let next: URL
    try {
      next = new URL(location, current)
    } catch {
      return fail(MAPS_LINK_ERRORS.shortFailed)
    }
    followed += 1
    current = next
  }
}
