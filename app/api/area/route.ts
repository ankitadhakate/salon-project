import { nearestKnownLabel } from "@/lib/area"
import { prisma } from "@/lib/db"
import { reversePlaceName } from "@/lib/geocode"
import { boundingBox } from "@/lib/geo"
import { publicSalonWhere } from "@/lib/salons"

export const dynamic = "force-dynamic"

function coord(value: string | null, min: number, max: number) {
  if (!value || !/^-?\d+(\.\d+)?$/.test(value)) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < min || number > max) return null
  if (number === 0) return null
  return number
}

/** Area name for a GPS pin. Known salon areas first, Nominatim only as a fallback. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const lat = coord(params.get("lat"), -90, 90)
  const lng = coord(params.get("lng"), -180, 180)
  if (lat == null || lng == null) {
    return Response.json({ label: null }, { status: 400 })
  }
  const box = boundingBox(lat, lng, 40)
  const salons = await prisma.salon.findMany({
    where: {
      ...publicSalonWhere(),
      latitude: { gte: box.minLat, lte: box.maxLat, not: null },
      longitude: { gte: box.minLng, lte: box.maxLng, not: null },
    },
    select: {
      latitude: true,
      longitude: true,
      locality: { select: { name: true } },
      city: { select: { name: true } },
    },
    take: 200,
  })
  const known = nearestKnownLabel(
    lat,
    lng,
    salons.flatMap((salon) =>
      salon.latitude == null || salon.longitude == null
        ? []
        : [{ lat: salon.latitude, lng: salon.longitude, area: salon.locality.name, city: salon.city.name }],
    ),
  )
  const label = known ?? (await reversePlaceName(lat, lng))
  return Response.json({ label })
}
