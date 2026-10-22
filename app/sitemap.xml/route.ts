import { NextResponse } from "next/server"
import { allowIndexing, directoryEligible } from "@/lib/indexing"
import { prisma } from "@/lib/db"
import { countRealSalons } from "@/lib/salons"
import { appUrl } from "@/lib/urls"

export const dynamic = "force-dynamic"

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function entry(path: string, lastModified?: Date) {
  const last = lastModified ? `<lastmod>${lastModified.toISOString()}</lastmod>` : ""
  return `<url><loc>${escapeXml(appUrl(path))}</loc>${last}</url>`
}

export async function GET() {
  if (!allowIndexing()) {
    return new NextResponse("Not found\n", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    })
  }

  const urls = [entry("/"), entry("/for-salons")]
  const cities = await prisma.city.findMany({
    where: { active: true },
    include: { localities: true, serviceGuides: true },
  })
  for (const city of cities) {
    const cityCount = await countRealSalons({ citySlug: city.slug })
    if (directoryEligible(city.intro, cityCount)) urls.push(entry(`/${city.slug}`, city.updatedAt))
    for (const area of city.localities) {
      const count = await countRealSalons({ citySlug: city.slug, areaSlug: area.slug })
      if (directoryEligible(area.intro, count)) urls.push(entry(`/${city.slug}/${area.slug}`))
    }
    for (const guide of city.serviceGuides) {
      const count = await countRealSalons({ citySlug: city.slug, serviceQuery: guide.query })
      if (directoryEligible(guide.intro, count)) {
        urls.push(entry(`/${city.slug}/service/${guide.slug}`))
      }
    }
  }
  const salons = await prisma.salon.findMany({
    where: { status: "LIVE", isDemo: false },
    select: { citySlug: true, areaSlug: true, slug: true, updatedAt: true },
  })
  for (const salon of salons) {
    urls.push(entry(`/${salon.citySlug}/${salon.areaSlug}/${salon.slug}`, salon.updatedAt))
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`
  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
}
