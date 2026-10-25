import Link from "next/link"
import { CategoryRail } from "@/components/category-rail"
import { LocationPrompt } from "@/components/location-prompt"
import { OmniSearch } from "@/components/omni-search"
import { SalonRail } from "@/components/salon-rail"
import { buttonVariants } from "@/components/ui/button"
import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { defaultCity, parseDiscovery } from "@/lib/discovery"
import { hasActiveQuery, searchParam, type SearchParams } from "@/lib/filters"
import { parseNear, widenNearHref } from "@/lib/geo"
import { robotsForListing } from "@/lib/indexing"
import { listActiveCities } from "@/lib/places"
import { listLiveSalons, publicSalonWhere } from "@/lib/salons"
import { siteName } from "@/lib/site"
import { appUrl } from "@/lib/urls"
import { cn } from "@/lib/utils"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const sp = await searchParams
  if (!hasActiveQuery(sp)) return {}
  return {
    robots: robotsForListing(true, true),
    alternates: { canonical: "/" },
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const near = parseNear(sp)
  const discovery = parseDiscovery(sp)
  const ask = searchParam(sp, "change") === "1"
  const cities = await listActiveCities()
  const preferred = defaultCity(cities)
  const timeZone = preferred?.timezone
  const [popular, budget, center] = await Promise.all([
    listLiveSalons({
      near,
      pageSize: 8,
      sort: near ? "nearest" : "",
      timeZone,
    }),
    listLiveSalons({
      near,
      pageSize: 8,
      sort: "price-asc",
      timeZone,
    }),
    preferred
      ? prisma.salon.aggregate({
          where: { ...publicSalonWhere(), citySlug: preferred.slug, latitude: { not: null } },
          _avg: { latitude: true, longitude: true },
        })
      : Promise.resolve(null),
  ])
  const name = siteName()
  const defaultPlace =
    preferred && center?._avg.latitude != null && center._avg.longitude != null
      ? { label: preferred.name, lat: center._avg.latitude, lng: center._avg.longitude }
      : null
  const seeAll = near
    ? `/search?lat=${near.lat.toFixed(5)}&lng=${near.lng.toFixed(5)}${near.km ? `&km=${near.km}` : ""}${discovery.place ? `&place=${encodeURIComponent(discovery.place)}` : ""}`
    : "/search"
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: appUrl("/"),
    description: "Salon discovery. Owners list their own services and prices.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${appUrl("/search")}?q={query}`,
      "query-input": "required name=query",
    },
  }
  const emptyNear = Boolean(near && popular.total === 0)

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="relative overflow-hidden px-4 pt-8 pb-8 sm:pt-14 sm:pb-12">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,#f6bd60_0%,transparent_36%),radial-gradient(circle_at_100%_10%,#f28482_0%,transparent_32%),linear-gradient(#f7ede2,#f5cac3)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="inline-flex h-8 items-center rounded-full bg-mustard px-3 text-sm font-semibold text-foreground">
            Early access
          </p>
          <h1 className="mt-3 font-heading text-4xl leading-[1.05] text-balance sm:text-6xl">Find salons near you</h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
            Prices written down by the salon. Haircut, facial, bridal makeup. Free for you.
          </p>
          <div className="mt-6 text-left">
            <OmniSearch />
          </div>
          <LocationPrompt active={Boolean(near)} ask={ask} defaultPlace={defaultPlace} />
        </div>
      </section>

      <CategoryRail />

      {emptyNear ? (
        <section className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-2xl bg-card px-4 py-12 text-center shadow-card ring-1 ring-border">
            <p className="font-heading text-2xl">No salons nearby</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Nothing with a map pin is inside {near?.km ?? "this"} km. Widen the radius, or browse the city list.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href={widenNearHref("/", sp, near!)} className={cn(buttonVariants(), "h-11 px-4")}>
                Widen radius
              </Link>
              {preferred ? (
                <Link href={`/${preferred.slug}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}>
                  Browse {preferred.name}
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <>
          <SalonRail title={near ? "Popular near you" : "Popular right now"} href={seeAll} salons={popular.salons} />
          <SalonRail title={near ? "Budget near you" : "Budget picks"} href={`${seeAll}${seeAll.includes("?") ? "&" : "?"}sort=price-asc`} salons={budget.salons} />
        </>
      )}

      {cities.map((city) => (
        <section key={city.slug} className="mx-auto max-w-6xl px-4 py-4 pb-12">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-heading text-2xl">Areas in {city.name}</h2>
            <Link href={`/${city.slug}`} className="inline-flex h-11 items-center text-sm font-medium text-sage-ink">
              All areas
            </Link>
          </div>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {city.localities.slice(0, 12).map((area) => (
              <li key={area.slug} className="shrink-0">
                <Link
                  href={`/${city.slug}/${area.slug}`}
                  className="inline-flex h-11 items-center rounded-full bg-card px-3 text-sm shadow-card ring-1 ring-border"
                >
                  {area.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
