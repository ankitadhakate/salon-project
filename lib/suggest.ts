import { prisma } from "@/lib/db"
import { publicSalonWhere } from "@/lib/salons"

export type SuggestHit = {
  kind: "city" | "area" | "salon" | "service"
  label: string
  hint: string
  href: string
  lat?: number
  lng?: number
}

export function groupSuggestions(hits: SuggestHit[]) {
  return {
    places: hits.filter((hit) => hit.kind === "city" || hit.kind === "area"),
    salons: hits.filter((hit) => hit.kind === "salon"),
    services: hits.filter((hit) => hit.kind === "service"),
  }
}

function average(
  rows: { citySlug: string; areaSlug: string; _avg: { latitude: number | null; longitude: number | null } }[],
  citySlug: string,
  areaSlug?: string,
) {
  const matched = rows.filter(
    (row) => row.citySlug === citySlug && (areaSlug ? row.areaSlug === areaSlug : true) && row._avg.latitude != null && row._avg.longitude != null,
  )
  if (matched.length === 0) return null
  const lat = matched.reduce((sum, row) => sum + (row._avg.latitude ?? 0), 0) / matched.length
  const lng = matched.reduce((sum, row) => sum + (row._avg.longitude ?? 0), 0) / matched.length
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/** Cities and areas first, then salon and service names. One round of queries, no per-row lookups. */
export async function searchSuggestions(raw: string): Promise<SuggestHit[]> {
  const term = raw.trim().slice(0, 60)
  if (term.length < 1) return []
  const whereSalon = publicSalonWhere()
  const [cities, areas, salons, services] = await Promise.all([
    prisma.city.findMany({
      where: { active: true, name: { contains: term, mode: "insensitive" } },
      take: 3,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.locality.findMany({
      where: { name: { contains: term, mode: "insensitive" }, city: { active: true } },
      include: { city: { select: { name: true, slug: true } } },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.salon.findMany({
      where: {
        ...whereSalon,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { searchBlob: { contains: term.toLowerCase() } },
        ],
      },
      select: {
        name: true,
        slug: true,
        citySlug: true,
        areaSlug: true,
        locality: { select: { name: true } },
        city: { select: { name: true } },
      },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { name: { contains: term, mode: "insensitive" }, salon: whereSalon },
      select: { name: true, category: true },
      distinct: ["name"],
      take: 5,
      orderBy: { name: "asc" },
    }),
  ])

  const placeKeys = [
    ...cities.map((city) => ({ citySlug: city.slug })),
    ...areas.map((area) => ({ citySlug: area.citySlug, areaSlug: area.slug })),
  ]
  const centers =
    placeKeys.length === 0
      ? []
      : await prisma.salon.groupBy({
          by: ["citySlug", "areaSlug"],
          where: {
            ...whereSalon,
            latitude: { not: null },
            longitude: { not: null },
            OR: placeKeys.map((key) =>
              "areaSlug" in key && key.areaSlug
                ? { citySlug: key.citySlug, areaSlug: key.areaSlug }
                : { citySlug: key.citySlug },
            ),
          },
          _avg: { latitude: true, longitude: true },
        })

  const hits: SuggestHit[] = []
  for (const city of cities) {
    const point = average(centers, city.slug)
    hits.push({
      kind: "city",
      label: city.name,
      hint: "City",
      href: point
        ? `/?lat=${point.lat.toFixed(5)}&lng=${point.lng.toFixed(5)}&km=10&place=${encodeURIComponent(city.name)}`
        : `/${city.slug}`,
      lat: point?.lat,
      lng: point?.lng,
    })
  }
  for (const area of areas) {
    const point = average(centers, area.citySlug, area.slug)
    const label = area.name
    hits.push({
      kind: "area",
      label,
      hint: area.city.name,
      href: point
        ? `/?lat=${point.lat.toFixed(5)}&lng=${point.lng.toFixed(5)}&km=5&place=${encodeURIComponent(`${area.name}, ${area.city.name}`)}`
        : `/${area.city.slug}/${area.slug}`,
      lat: point?.lat,
      lng: point?.lng,
    })
  }
  for (const salon of salons) {
    const place = [salon.locality?.name, salon.city?.name].filter(Boolean).join(", ")
    hits.push({
      kind: "salon",
      label: salon.name,
      hint: place,
      href: `/${salon.citySlug}/${salon.areaSlug}/${salon.slug}`,
    })
  }
  for (const service of services) {
    hits.push({
      kind: "service",
      label: service.name,
      hint: service.category,
      href: `/search?q=${encodeURIComponent(service.name)}`,
    })
  }
  return hits
}
