import { prisma } from "@/lib/db"
import { slugify } from "@/lib/salons"

export const RESERVED_CITY_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "dashboard",
  "demo",
  "for-salons",
  "icon",
  "login",
  "partner",
  "robots.txt",
  "search",
  "signup",
  "sitemap.xml",
  "uploads",
])

export const RESERVED_LOCALITY_SLUGS = new Set(["service", "services"])

const cityMenuInclude = {
  localities: { orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }] },
  serviceGuides: { orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }] },
}

export async function listActiveCities() {
  return prisma.city.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: cityMenuInclude,
  })
}

export async function getActiveCity(slug: string) {
  return prisma.city.findFirst({
    where: { slug, active: true },
    include: cityMenuInclude,
  })
}

export async function getLocality(citySlug: string, slug: string) {
  const locality = await prisma.locality.findUnique({
    where: { citySlug_slug: { citySlug, slug } },
    include: { city: true },
  })
  if (!locality?.city.active) return null
  return locality
}

export async function getServiceGuide(citySlug: string, slug: string) {
  const guide = await prisma.serviceGuide.findUnique({
    where: { citySlug_slug: { citySlug, slug } },
    include: { city: true },
  })
  if (!guide?.city.active) return null
  return guide
}

export function cleanSlug(input: string, fallback: string) {
  const slug = slugify(input.trim() || fallback)
  return slug === "salon" && !input.trim() ? "" : slug
}

export function citySlugError(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2 || slug.length > 40) {
    return "Use a short lowercase slug, like pune or austin."
  }
  if (RESERVED_CITY_SLUGS.has(slug)) return "That address is reserved."
  return null
}

export function localitySlugError(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2 || slug.length > 60) {
    return "Use a short lowercase locality slug, like baner."
  }
  if (RESERVED_LOCALITY_SLUGS.has(slug)) return "That locality slug is reserved."
  return null
}
