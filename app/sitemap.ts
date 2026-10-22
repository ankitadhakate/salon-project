import type { MetadataRoute } from "next"
import { AREAS } from "@/lib/areas"
import { prisma } from "@/lib/db"
import { appUrl } from "@/lib/urls"

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: appUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: appUrl("/pune"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: appUrl("/for-salons"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...AREAS.map((area) => ({
      url: appUrl(`/pune/${area.slug}`),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ]

  try {
    const salons = await prisma.salon.findMany({
      where: {
        status: "LIVE",
        isDemo: false,
      },
      select: { areaSlug: true, slug: true, updatedAt: true },
    })
    return [
      ...staticRoutes,
      ...salons.map((salon) => ({
        url: appUrl(`/pune/${salon.areaSlug}/${salon.slug}`),
        lastModified: salon.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ]
  } catch {
    return staticRoutes
  }
}
