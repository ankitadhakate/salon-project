import { haversineKm } from "@/lib/geo"

export type KnownPlace = {
  lat: number
  lng: number
  area: string
  city: string
}

const AREA_KM = 12
const CITY_KM = 40

/** Nearest listed salon pin. An area name inside 12 km, otherwise the city inside 40 km. */
export function nearestKnownLabel(lat: number, lng: number, places: KnownPlace[]) {
  let best: { km: number; area: string; city: string } | null = null
  for (const place of places) {
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) continue
    const km = haversineKm(lat, lng, place.lat, place.lng)
    if (!best || km < best.km) best = { km, area: place.area.trim(), city: place.city.trim() }
  }
  if (!best) return null
  if (best.km <= AREA_KM && best.area) return best.area
  if (best.km <= CITY_KM && best.city) return best.city
  return null
}
