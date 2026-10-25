/**
 * Google Maps links pasted by an owner. Parsing is local. Short links are
 * resolved by following redirects one hop at a time, and by reading a small
 * HTML body when Google answers 200 instead of redirecting. No Google API.
 * Every hop stays on an allow-listed Google host.
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

export type MapsLinkResult =
  | {
      ok: true
      kind: "coords"
      latitude: number
      longitude: number
      mapsUrl: string
      placeName: string | null
    }
  | { ok: true; kind: "place"; placeQuery: string; mapsUrl: string }
  | { ok: true; kind: "short"; mapsUrl: string }
  | { ok: false; error: string }

type FetchLike = (input: string, init: RequestInit) => Promise<Response>

type Hit = { kind: "hit"; latitude: number | null; longitude: number | null; placeName: string | null }
type Extracted = Hit | { kind: "error"; error: string }

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

/** Hosts a redirect or an HTML link is allowed to land on. Google only, never an IP. */
export function isRedirectHost(url: URL) {
  const host = hostName(url.hostname)
  if (isIpLiteral(host)) return false
  if (host === "maps.app.goo.gl") return true
  if (host === "goo.gl") return url.pathname === "/maps" || url.pathname.startsWith("/maps/")
  if (host === "consent.google.com") return true
  if (!isGoogleMapsHost(host)) return false
  if (host.startsWith("maps.google.")) return true
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

function parsePair(latRaw: string, lngRaw: string): Extracted | { kind: "coords"; latitude: number; longitude: number } | null {
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

function pairFromText(value: string) {
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

function applyPair(hit: Hit, pair: Extracted | { kind: "coords"; latitude: number; longitude: number } | null) {
  if (!pair) return null
  if (pair.kind === "error") return pair
  if (pair.kind === "coords") {
    hit.latitude = pair.latitude
    hit.longitude = pair.longitude
  }
  return null
}

/** Pull coordinates and, when the URL has one, the place name. Coordinates win over a name. */
function extract(url: URL): Extracted {
  const text = decoded(url)
  const hit: Hit = { kind: "hit", latitude: null, longitude: null, placeName: null }

  const pins = [...text.matchAll(/!3d([+-]?\d+(?:\.\d+)?)!4d([+-]?\d+(?:\.\d+)?)/g)]
  if (pins.length) {
    const last = pins[pins.length - 1]!
    const failed = applyPair(hit, parsePair(last[1]!, last[2]!))
    if (failed) return failed
  }

  if (hit.latitude == null) {
    for (const key of ["destination", "query", "q", "ll"] as const) {
      const value = url.searchParams.get(key)
      if (!value) continue
      const failed = applyPair(hit, pairFromText(value))
      if (failed) return failed
      if (hit.latitude != null) break
    }
  }

  if (hit.latitude == null) {
    const at = text.match(/@([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/)
    if (at) {
      const failed = applyPair(hit, parsePair(at[1]!, at[2]!))
      if (failed) return failed
    }
  }

  const placePath = text.match(/\/maps\/place\/([^/@]+)/)
  if (placePath?.[1]) hit.placeName = cleanPlace(placePath[1])
  if (!hit.placeName) {
    for (const key of ["q", "query", "destination"] as const) {
      const value = url.searchParams.get(key)
      if (!value || pairFromText(value)) continue
      const name = cleanPlace(value)
      if (name) {
        hit.placeName = name
        break
      }
    }
  }
  return hit
}

function withStoredUrl(raw: string, current: URL, located: Hit): MapsLinkResult {
  const mapsUrl = sanitizeMapsUrl(raw) ?? sanitizeMapsUrl(current.toString())
  if (!mapsUrl) return fail(MAPS_LINK_ERRORS.notMaps)
  if (located.latitude != null && located.longitude != null) {
    return {
      ok: true,
      kind: "coords",
      latitude: located.latitude,
      longitude: located.longitude,
      mapsUrl,
      placeName: located.placeName,
    }
  }
  if (located.placeName) {
    return { ok: true, kind: "place", placeQuery: located.placeName, mapsUrl }
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
  if (located.latitude != null || located.placeName) return withStoredUrl(raw, url, located)
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

function decodeHtmlUrl(value: string) {
  return value.replace(/&amp;/g, "&").replace(/\\\//g, "/")
}

function urlsInHtml(html: string) {
  const found: string[] = []
  const refresh = html.match(/content\s*=\s*["'][^"']*url\s*=\s*([^"'\s>]+)/i)
  if (refresh?.[1]) found.push(decodeHtmlUrl(refresh[1]))
  for (const match of html.matchAll(/https:\/\/[^\s"'<>\\]+/g)) {
    found.push(decodeHtmlUrl(match[0]))
  }
  return found
}

function locatedFromHtml(html: string): Extracted | { kind: "follow"; url: URL } | null {
  let follow: URL | null = null
  for (const raw of urlsInHtml(html)) {
    const url = readUrl(raw)
    if (!url || !isRedirectHost(url)) continue
    if (isShortHost(url)) {
      follow ??= url
      continue
    }
    const located = extract(url)
    if (located.kind === "error") return located
    if (located.latitude != null || located.placeName) return located
  }
  const pin = html.match(/!3d([+-]?\d+(?:\.\d+)?)!4d([+-]?\d+(?:\.\d+)?)/)
  if (pin) {
    const pair = parsePair(pin[1]!, pin[2]!)
    if (pair?.kind === "error") return pair
    if (pair?.kind === "coords") {
      return { kind: "hit", latitude: pair.latitude, longitude: pair.longitude, placeName: null }
    }
  }
  if (follow) return { kind: "follow", url: follow }
  return null
}

async function readCapped(response: Response): Promise<"large" | string> {
  const length = Number(response.headers.get("content-length") ?? "0")
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    await response.body?.cancel().catch(() => undefined)
    return "large"
  }
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel().catch(() => undefined)
    return ""
  }
  if (!response.body) return ""
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined)
      return "large"
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(merged)
}

/**
 * Follow short-link redirects ourselves. Every hop must be https and on the
 * Google allowlist. A 200 HTML page is read only up to 64KB, and only links
 * that stay on that allowlist are used. Consent pages contribute their continue URL.
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
    if (located.latitude != null || located.placeName) return withStoredUrl(raw, current, located)
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
        headers: {
          Accept: "text/html",
          "User-Agent": "Mozilla/5.0 (compatible; LetsTrimLinkResolver/1.0)",
        },
      })
    } catch (error) {
      return fail(isAbort(error) ? MAPS_LINK_ERRORS.timeout : MAPS_LINK_ERRORS.shortFailed)
    }

    const body = await readCapped(response)
    if (body === "large") return fail(MAPS_LINK_ERRORS.tooLarge)

    if (response.status >= 200 && response.status < 300) {
      const found = locatedFromHtml(body)
      if (!found) return fail(MAPS_LINK_ERRORS.shortFailed)
      if (found.kind === "error") return fail(found.error)
      if (found.kind === "hit") return withStoredUrl(raw, current, found)
      followed += 1
      if (followed > maxRedirects) return fail(MAPS_LINK_ERRORS.tooMany)
      current = found.url
      continue
    }

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
