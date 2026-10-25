import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { openNowClock } from "@/lib/format"

const placeInclude = {
  city: { select: { slug: true, name: true, timezone: true, dialCode: true, countryCode: true } },
  locality: { select: { slug: true, name: true, intro: true } },
} satisfies Prisma.SalonInclude

const cardInclude = {
  photos: { orderBy: { sortOrder: "asc" as const }, take: 1 },
  ...placeInclude,
} satisfies Prisma.SalonInclude

const detailInclude = {
  photos: { orderBy: { sortOrder: "asc" as const } },
  services: { orderBy: { sortOrder: "asc" as const } },
  hours: { orderBy: { dayOfWeek: "asc" as const } },
  ...placeInclude,
} satisfies Prisma.SalonInclude

export type SalonCard = Prisma.SalonGetPayload<{ include: typeof cardInclude }>
export type SalonDetail = Prisma.SalonGetPayload<{ include: typeof detailInclude }>
export type OwnerSalon = SalonDetail

export function demoListingsVisible() {
  if (process.env.SHOW_DEMO_LISTINGS === "true") return true
  if (process.env.SHOW_DEMO_LISTINGS === "false") return false
  return process.env.NODE_ENV !== "production"
}

export function publicSalonWhere(): Prisma.SalonWhereInput {
  return {
    status: "LIVE",
    ...(demoListingsVisible() ? {} : { isDemo: false }),
  }
}

export const DIRECTORY_PAGE_SIZE = 20

export type SalonQuery = {
  citySlug?: string
  areaSlug?: string
  service?: string
  gender?: "" | "MEN" | "WOMEN" | "UNISEX"
  minPrice?: number
  maxPrice?: number
  open?: boolean
  sort?: "" | "price-asc" | "price-desc" | "nearest"
  page?: number
  pageSize?: number
  near?: { lat: number; lng: number; km?: number | null } | null
  timeZone?: string
}

export type ListedSalon = SalonCard & { distanceKm: number | null }

function likeTerm(value: string) {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

function distanceSql(near: { lat: number; lng: number } | null | undefined) {
  if (!near) return Prisma.sql`NULL::double precision`
  return Prisma.sql`CASE
    WHEN s.latitude IS NULL OR s.longitude IS NULL THEN NULL
    ELSE (
      6371 * acos(LEAST(1::float8, GREATEST(-1::float8,
        cos(radians(${near.lat})) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(${near.lng}))
        + sin(radians(${near.lat})) * sin(radians(s.latitude))
      )))
    )
  END`
}

export function realSalonWhere(filter: {
  citySlug: string
  areaSlug?: string
  serviceQuery?: string
}): Prisma.SalonWhereInput {
  const service = filter.serviceQuery?.trim().toLowerCase()
  return {
    status: "LIVE",
    isDemo: false,
    citySlug: filter.citySlug,
    ...(filter.areaSlug ? { areaSlug: filter.areaSlug } : {}),
    ...(service ? { searchBlob: { contains: service } } : {}),
  }
}

export function countRealSalons(filter: {
  citySlug: string
  areaSlug?: string
  serviceQuery?: string
}) {
  return prisma.salon.count({ where: realSalonWhere(filter) })
}

export async function listLiveSalons(query: SalonQuery = {}) {
  const pageSize = query.pageSize ?? DIRECTORY_PAGE_SIZE
  const page = Math.max(1, Math.min(query.page ?? 1, 50))
  const take = page * pageSize
  const service = query.service?.trim().toLowerCase() ?? ""
  const conditions: Prisma.Sql[] = [Prisma.sql`s.status = 'LIVE'`]
  if (!demoListingsVisible()) conditions.push(Prisma.sql`s."isDemo" = false`)
  if (query.citySlug) conditions.push(Prisma.sql`s."citySlug" = ${query.citySlug}`)
  if (query.areaSlug) conditions.push(Prisma.sql`s."areaSlug" = ${query.areaSlug}`)
  if (query.gender === "MEN") conditions.push(Prisma.sql`s.gender IN ('MEN', 'UNISEX')`)
  else if (query.gender === "WOMEN") conditions.push(Prisma.sql`s.gender IN ('WOMEN', 'UNISEX')`)
  else if (query.gender === "UNISEX") conditions.push(Prisma.sql`s.gender = 'UNISEX'`)
  if (service) conditions.push(Prisma.sql`s."searchBlob" LIKE ${likeTerm(service)} ESCAPE '\\'`)
  if (query.minPrice != null || query.maxPrice != null) {
    const price: Prisma.Sql[] = []
    if (query.minPrice != null) price.push(Prisma.sql`sv."priceInr" >= ${query.minPrice}`)
    if (query.maxPrice != null) price.push(Prisma.sql`sv."priceInr" <= ${query.maxPrice}`)
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "Service" sv WHERE sv."salonId" = s.id AND ${Prisma.join(price, " AND ")})`,
    )
  }
  if (query.open) {
    const clock = openNowClock(query.timeZone || "Asia/Kolkata")
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "OpeningHour" h
      WHERE h."salonId" = s.id AND h.closed = false AND (
        (h."dayOfWeek" = ${clock.day} AND h."closeTime" > h."openTime" AND h."openTime" <= ${clock.now} AND h."closeTime" > ${clock.now})
        OR (h."dayOfWeek" = ${clock.day} AND h."closeTime" <= h."openTime" AND h."openTime" <= ${clock.now})
        OR (h."dayOfWeek" = ${clock.previousDay} AND h."closeTime" <= h."openTime" AND ${clock.now} < h."closeTime")
      )
    )`)
  }
  const near = query.near
  if (near?.km != null) {
    const deltaLat = near.km / 111
    const cos = Math.cos((near.lat * Math.PI) / 180) || 1
    const deltaLng = near.km / (111 * Math.abs(cos))
    conditions.push(Prisma.sql`s.latitude IS NOT NULL AND s.longitude IS NOT NULL`)
    conditions.push(Prisma.sql`s.latitude BETWEEN ${near.lat - deltaLat} AND ${near.lat + deltaLat}`)
    conditions.push(Prisma.sql`s.longitude BETWEEN ${near.lng - deltaLng} AND ${near.lng + deltaLng}`)
  }
  const where = Prisma.join(conditions, " AND ")
  const distance = distanceSql(near)
  const kmWhere =
    near?.km != null
      ? Prisma.sql`distance_km IS NOT NULL AND distance_km <= ${near.km}`
      : Prisma.sql`TRUE`
  const order =
    query.sort === "price-asc"
      ? Prisma.sql`listed."startingPrice" ASC NULLS LAST, listed.name ASC`
      : query.sort === "price-desc"
        ? Prisma.sql`listed."startingPrice" DESC NULLS LAST, listed.name ASC`
        : query.sort === "nearest" && near
          ? Prisma.sql`listed.distance_km ASC NULLS LAST, listed.name ASC`
          : near
            ? Prisma.sql`listed.distance_km ASC NULLS LAST, listed."isEarlyPartner" DESC, listed.name ASC`
            : Prisma.sql`listed."isEarlyPartner" DESC, listed.name ASC`
  const listed = Prisma.sql`
    SELECT s.id, s.name, s."startingPrice", s."isEarlyPartner", ${distance} AS distance_km
    FROM "Salon" s
    WHERE ${where}
  `
  const [rows, counted] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; distance_km: number | null }>>(Prisma.sql`
      SELECT listed.id, listed.distance_km
      FROM (${listed}) listed
      WHERE ${kmWhere}
      ORDER BY ${order}
      LIMIT ${take + 1}
    `),
    prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM (${listed}) listed
      WHERE ${kmWhere}
    `),
  ])
  const total = Number(counted[0]?.count ?? 0)
  const hasMore = rows.length > take
  const slice = rows.slice(0, take)
  if (slice.length === 0) return { salons: [] as ListedSalon[], hasMore: false, total }
  const found = await prisma.salon.findMany({
    where: { id: { in: slice.map((row) => row.id) } },
    include: cardInclude,
  })
  const byId = new Map(found.map((salon) => [salon.id, salon]))
  const salons = slice.flatMap((row) => {
    const salon = byId.get(row.id)
    if (!salon) return []
    return [{ ...salon, distanceKm: row.distance_km == null ? null : row.distance_km }]
  })
  return { salons, hasMore, total }
}

export async function areaServicePrices(citySlug: string, areaSlug: string) {
  const rows = await prisma.service.findMany({
    where: { salon: { ...publicSalonWhere(), citySlug, areaSlug } },
    select: { priceInr: true },
  })
  return rows.map((row) => row.priceInr)
}

export async function countLiveByArea(citySlug: string) {
  const rows = await prisma.salon.groupBy({
    by: ["areaSlug"],
    where: { ...publicSalonWhere(), citySlug },
    _count: { _all: true },
  })
  return new Map(rows.map((row) => [row.areaSlug, row._count._all]))
}

export async function getSalonBySlug(citySlug: string, areaSlug: string, slug: string) {
  return prisma.salon.findUnique({
    where: { citySlug_areaSlug_slug: { citySlug, areaSlug, slug } },
    include: detailInclude,
  })
}

export function viewerCanSee(
  salon: { status: string; isDemo: boolean; ownerId: string | null },
  viewer: { id: string; role: string } | null,
) {
  const publiclyListed = salon.status === "LIVE" && (!salon.isDemo || demoListingsVisible())
  if (publiclyListed) return { visible: true, preview: false }
  if (viewer && (viewer.role === "ADMIN" || viewer.id === salon.ownerId)) {
    return { visible: true, preview: true }
  }
  return { visible: false, preview: false }
}

export function slugify(input: string) {
  const slug = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return slug || "salon"
}

export async function uniqueSlug(
  citySlug: string,
  areaSlug: string,
  base: string,
  excludeId?: string,
) {
  const root = slugify(base)
  let slug = root
  for (let n = 2; n < 50; n += 1) {
    const found = await prisma.salon.findUnique({
      where: { citySlug_areaSlug_slug: { citySlug, areaSlug, slug } },
      select: { id: true },
    })
    if (!found || found.id === excludeId) return slug
    slug = `${root.slice(0, 54)}-${n}`
  }
  return `${root.slice(0, 40)}-${Date.now().toString(36)}`
}

export function defaultHours() {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    closed: dayOfWeek === 6,
    openTime: "10:00",
    closeTime: "20:00",
  }))
}

export async function refreshSalonSearch(salonId: string) {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    include: { services: true },
  })
  if (!salon) return
  const place = await prisma.locality.findUnique({
    where: { citySlug_slug: { citySlug: salon.citySlug, slug: salon.areaSlug } },
    include: { city: { select: { name: true } } },
  })
  const searchBlob = [
    salon.name,
    place?.name ?? salon.areaSlug,
    place?.city.name,
    salon.areaSlug,
    salon.citySlug,
    salon.address,
    salon.description,
    salon.gender,
    ...salon.services.flatMap((service) => [service.name, service.category]),
  ]
    .join(" ")
    .toLowerCase()
  const startingPrice = salon.services.length
    ? Math.min(...salon.services.map((service) => service.priceInr))
    : null
  await prisma.salon.update({
    where: { id: salonId },
    data: { searchBlob, startingPrice },
  })
}

export async function getOwnerSalon(ownerId: string) {
  return prisma.salon.findUnique({
    where: { ownerId },
    include: detailInclude,
  })
}
