import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants"
import {
  filtersToQuery,
  parseFilters,
  searchParam,
  type PublicFilters,
  type SearchParams,
  type SortKey,
} from "@/lib/filters"
import { parseNear, type NearQuery } from "@/lib/geo"

/** Browser-only memory. Not a cookie, and not written on the server. */
export const PLACE_STORAGE_KEY = "letstrim.place"

export const SEARCH_RADII = [2, 5, 10, 20] as const
export type SearchRadius = (typeof SEARCH_RADII)[number]

export type SavedPlace = {
  lat: number
  lng: number
  label: string
  km: SearchRadius
}

export type GeoPermission = "granted" | "prompt" | "denied" | "unknown"

/** What the home page should do before painting a location field. */
export function nextLocationStep(input: {
  ask: boolean
  hasSaved: boolean
  permission: GeoPermission
}): "saved" | "request" | "enter" {
  if (input.ask) return "enter"
  if (input.hasSaved) return "saved"
  if (input.permission === "denied") return "enter"
  return "request"
}

/** A prompt that is still 'prompt' after an error means the browser wanted a click. */
export function locationAfterGeoError(code: number, permission: GeoPermission): "choose" | "enter" {
  if (code === 1 && permission !== "denied") return "choose"
  return "enter"
}

export function defaultCity<T extends { slug: string; name: string }>(cities: T[]): T | null {
  return (
    cities.find((city) => city.slug === "pune" || city.name.toLowerCase() === "pune") ?? cities[0] ?? null
  )
}

function asRadius(value: number): SearchRadius {
  return (SEARCH_RADII as readonly number[]).includes(value) ? (value as SearchRadius) : 5
}

export function parseSavedPlace(raw: string | null): SavedPlace | null {
  if (!raw) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const lat = typeof record.lat === "number" ? record.lat : Number.NaN
  const lng = typeof record.lng === "number" ? record.lng : Number.NaN
  const label = typeof record.label === "string" ? record.label.trim().slice(0, 80) : ""
  const km = typeof record.km === "number" ? record.km : 5
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null
  if (lat === 0 && lng === 0) return null
  if (!label) return null
  return { lat, lng, label, km: asRadius(km) }
}

export function serializePlace(place: SavedPlace) {
  return JSON.stringify({
    lat: Number(place.lat.toFixed(5)),
    lng: Number(place.lng.toFixed(5)),
    label: place.label.trim().slice(0, 80),
    km: asRadius(place.km),
  })
}

export type DiscoveryQuery = PublicFilters & {
  q: string
  category: ServiceCategory | ""
  near: NearQuery | null
  place: string
}

export function parseDiscovery(sp: SearchParams): DiscoveryQuery {
  const filters = parseFilters(sp)
  const q = searchParam(sp, "q").slice(0, 80)
  const categoryRaw = searchParam(sp, "category")
  const category = (SERVICE_CATEGORIES as readonly string[]).includes(categoryRaw)
    ? (categoryRaw as ServiceCategory)
    : ""
  const sortRaw = searchParam(sp, "sort")
  const sort: SortKey =
    sortRaw === "relevance" ||
    sortRaw === "nearest" ||
    sortRaw === "price-asc" ||
    sortRaw === "price-desc"
      ? sortRaw
      : filters.sort
  return {
    ...filters,
    sort,
    q,
    category,
    near: parseNear(sp),
    place: searchParam(sp, "place").slice(0, 80),
  }
}

export function discoveryToQuery(query: DiscoveryQuery) {
  const params = new URLSearchParams(filtersToQuery(query).replace(/^\?/, ""))
  if (query.q) params.set("q", query.q)
  if (query.category) params.set("category", query.category)
  if (query.place) params.set("place", query.place)
  if (query.near) {
    params.set("lat", query.near.lat.toFixed(5))
    params.set("lng", query.near.lng.toFixed(5))
    if (query.near.km) params.set("km", String(query.near.km))
  }
  const text = params.toString()
  return text ? `?${text}` : ""
}

export function discoveryPath(query: DiscoveryQuery) {
  return `/search${discoveryToQuery(query)}`
}

export function clearDiscoveryFilters(query: DiscoveryQuery): DiscoveryQuery {
  return {
    ...query,
    service: "",
    gender: "",
    price: "",
    minPrice: undefined,
    maxPrice: undefined,
    open: false,
    sort: "",
    page: 1,
    category: "",
    near: query.near ? { ...query.near, km: null } : null,
  }
}
