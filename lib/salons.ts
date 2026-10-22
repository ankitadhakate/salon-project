import { Prisma } from "@prisma/client"
import { getArea } from "@/lib/areas"
import { prisma } from "@/lib/db"

const cardInclude = {
  photos: { orderBy: { sortOrder: "asc" as const }, take: 1 },
} satisfies Prisma.SalonInclude

const detailInclude = {
  photos: { orderBy: { sortOrder: "asc" as const } },
  services: { orderBy: { sortOrder: "asc" as const } },
  hours: { orderBy: { dayOfWeek: "asc" as const } },
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

export type SalonQuery = {
  areaSlug?: string
  service?: string
  gender?: "" | "MEN" | "WOMEN" | "UNISEX"
  minPrice?: number
  maxPrice?: number
}

export async function listLiveSalons(query: SalonQuery = {}) {
  const service = query.service?.trim().toLowerCase() ?? ""
  const price =
    query.minPrice != null || query.maxPrice != null
      ? { gte: query.minPrice, lte: query.maxPrice }
      : undefined

  return prisma.salon.findMany({
    where: {
      ...publicSalonWhere(),
      ...(query.areaSlug ? { areaSlug: query.areaSlug } : {}),
      ...(query.gender === "MEN" ? { gender: { in: ["MEN", "UNISEX"] } } : {}),
      ...(query.gender === "WOMEN" ? { gender: { in: ["WOMEN", "UNISEX"] } } : {}),
      ...(query.gender === "UNISEX" ? { gender: "UNISEX" } : {}),
      ...(service ? { searchBlob: { contains: service } } : {}),
      ...(price ? { services: { some: { priceInr: price } } } : {}),
    },
    include: cardInclude,
    orderBy: [{ isEarlyPartner: "desc" }, { name: "asc" }],
  })
}

export async function countLiveByArea() {
  const rows = await prisma.salon.groupBy({
    by: ["areaSlug"],
    where: publicSalonWhere(),
    _count: { _all: true },
  })
  return new Map(rows.map((row) => [row.areaSlug, row._count._all]))
}

export async function getSalonBySlug(areaSlug: string, slug: string) {
  return prisma.salon.findUnique({
    where: { areaSlug_slug: { areaSlug, slug } },
    include: detailInclude,
  })
}

export function viewerCanSee(
  salon: { status: string; isDemo: boolean; ownerId: string },
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

export async function uniqueSlug(areaSlug: string, base: string, excludeId?: string) {
  const root = slugify(base)
  let slug = root
  for (let n = 2; n < 50; n += 1) {
    const found = await prisma.salon.findUnique({
      where: { areaSlug_slug: { areaSlug, slug } },
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
  const areaName = getArea(salon.areaSlug)?.name ?? salon.areaSlug
  const searchBlob = [
    salon.name,
    areaName,
    salon.areaSlug,
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
