import type { SearchParams } from "@/lib/filters"
import { searchParam } from "@/lib/filters"

export type NearQuery = {
  lat: number
  lng: number
  km: number | null
}

const RADIUS = new Set([2, 5, 10, 20])

/** Degrees of latitude and longitude that cover `km` around a point. */
export function boundingBox(lat: number, lng: number, km: number) {
  const deltaLat = km / 111
  const cosine = Math.cos((lat * Math.PI) / 180)
  const deltaLng = km / (111 * (Math.abs(cosine) || 1e-6))
  return {
    minLat: lat - deltaLat,
    maxLat: lat + deltaLat,
    minLng: lng - deltaLng,
    maxLng: lng + deltaLng,
  }
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(km: number) {
  if (km < 0.1) return "under 100 m"
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

function coord(value: string, min: number, max: number) {
  if (!value || !/^-?\d+(\.\d+)?$/.test(value)) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < min || number > max) return null
  return number
}

export function parseNear(sp: SearchParams): NearQuery | null {
  const lat = coord(searchParam(sp, "lat"), -90, 90)
  const lng = coord(searchParam(sp, "lng"), -180, 180)
  if (lat == null || lng == null) return null
  const kmRaw = Number(searchParam(sp, "km"))
  const km = RADIUS.has(kmRaw) ? kmRaw : null
  return { lat, lng, km }
}

export function widenNearHref(path: string, sp: SearchParams, near: NearQuery) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    const text = (Array.isArray(value) ? value[0] : value)?.trim() ?? ""
    if (!text || key === "km" || key === "page") continue
    params.set(key, text)
  }
  params.set("lat", near.lat.toFixed(5))
  params.set("lng", near.lng.toFixed(5))
  const next = near.km === 2 ? 5 : near.km === 5 ? 10 : near.km === 10 ? 20 : null
  if (next) params.set("km", String(next))
  return `${path}?${params.toString()}`
}

export function withNearQuery(pathWithQuery: string, sp: SearchParams) {
  const near = parseNear(sp)
  if (!near) return pathWithQuery
  const [path, query = ""] = pathWithQuery.split("?")
  const params = new URLSearchParams(query)
  params.set("lat", near.lat.toFixed(5))
  params.set("lng", near.lng.toFixed(5))
  if (near.km) params.set("km", String(near.km))
  const next = params.toString()
  return next ? `${path}?${next}` : path
}

export function parsePin(formData: FormData, required: boolean) {
  const latRaw = String(formData.get("latitude") ?? "").trim()
  const lngRaw = String(formData.get("longitude") ?? "").trim()
  if (!latRaw && !lngRaw) {
    if (required) {
      return { ok: false as const, error: "Search the address and drop the pin on the salon." }
    }
    return { ok: true as const, empty: true as const }
  }
  const latitude = coord(latRaw, -90, 90)
  const longitude = coord(lngRaw, -180, 180)
  if (latitude == null || longitude == null) {
    return { ok: false as const, error: "That pin is off the map. Drop it again." }
  }
  return { ok: true as const, empty: false as const, latitude, longitude }
}

export function rankByDistance<T extends { latitude: number | null; longitude: number | null }>(
  salons: T[],
  near: NearQuery | null,
) {
  if (!near) return salons.map((salon) => ({ ...salon, distanceKm: null as number | null }))
  const ranked = salons.map((salon) => ({
    ...salon,
    distanceKm:
      salon.latitude != null && salon.longitude != null
        ? haversineKm(near.lat, near.lng, salon.latitude, salon.longitude)
        : null,
  }))
  ranked.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0
    if (a.distanceKm == null) return 1
    if (b.distanceKm == null) return -1
    return a.distanceKm - b.distanceKm
  })
  const limit = near.km
  if (limit == null) return ranked
  return ranked.filter((salon) => salon.distanceKm != null && salon.distanceKm <= limit)
}
