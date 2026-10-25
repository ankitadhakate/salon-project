import { appBaseUrl } from "@/lib/urls"
import { siteName } from "@/lib/site"

export type PlaceHit = { label: string; latitude: number; longitude: number }

type NominatimRow = { display_name?: string; lat?: string; lon?: string }

/** Nominatim search. Used by address lookup and as the fallback for a Maps link with a place name. */
export async function searchPlaces(query: string) {
  const trimmed = query.trim()
  if (trimmed.length < 3 || trimmed.length > 160) {
    return { results: [] as PlaceHit[], status: 200 }
  }
  const endpoint = process.env.GEOCODER_URL || "https://nominatim.openstreetmap.org/search"
  const url = new URL(endpoint)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("limit", "5")
  url.searchParams.set("q", trimmed)
  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": `${siteName()} salon directory (${appBaseUrl()})`,
      },
      next: { revalidate: 60 * 60 },
    })
  } catch {
    return { results: [] as PlaceHit[], error: "Address search is unavailable right now.", status: 502 }
  }
  if (!response.ok) {
    return { results: [] as PlaceHit[], error: "Address search is unavailable right now.", status: 502 }
  }
  const rows = (await response.json()) as NominatimRow[]
  const results = rows
    .map((row) => ({
      label: (row.display_name ?? "").slice(0, 180),
      latitude: Number(row.lat),
      longitude: Number(row.lon),
    }))
    .filter(
      (row) =>
        row.label &&
        Number.isFinite(row.latitude) &&
        Number.isFinite(row.longitude) &&
        row.latitude >= -90 &&
        row.latitude <= 90 &&
        row.longitude >= -180 &&
        row.longitude <= 180 &&
        !(row.latitude === 0 && row.longitude === 0),
    )
  return { results, status: 200 }
}

type ReverseRow = {
  display_name?: string
  address?: {
    suburb?: string
    neighbourhood?: string
    quarter?: string
    city_district?: string
    city?: string
    town?: string
    village?: string
    state?: string
  }
}

/** Nominatim reverse. Used when no listed salon is close enough to name the area. */
export async function reversePlaceName(latitude: number, longitude: number) {
  const endpoint = process.env.GEOCODER_REVERSE_URL || "https://nominatim.openstreetmap.org/reverse"
  const url = new URL(endpoint)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("lat", String(latitude))
  url.searchParams.set("lon", String(longitude))
  url.searchParams.set("zoom", "14")
  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": `${siteName()} salon directory (${appBaseUrl()})`,
      },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 * 60 * 24 },
    })
  } catch {
    return null
  }
  if (!response.ok) return null
  const row = (await response.json()) as ReverseRow
  const address = row.address
  const label =
    address?.suburb ||
    address?.neighbourhood ||
    address?.quarter ||
    address?.city_district ||
    address?.city ||
    address?.town ||
    address?.village ||
    ""
  const city = address?.city || address?.town || address?.village || ""
  const name = label && city && label !== city ? `${label}, ${city}` : label || city
  return name ? name.slice(0, 80) : null
}
