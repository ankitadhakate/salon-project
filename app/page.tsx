import { Suspense } from "react"
import Link from "next/link"
import { AreaGrid } from "@/components/area-grid"
import { NearMe } from "@/components/near-me"
import { SalonCard } from "@/components/salon-card"
import { SearchForm } from "@/components/search-form"
import { buttonVariants } from "@/components/ui/button"
import type { Metadata } from "next"
import { hasActiveQuery, type SearchParams } from "@/lib/filters"
import { parseNear, widenNearHref } from "@/lib/geo"
import { robotsForListing } from "@/lib/indexing"
import { listActiveCities } from "@/lib/places"
import { countLiveByArea, listLiveSalons } from "@/lib/salons"
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

const quickServices = [
  { slug: "haircut", name: "Haircut" },
  { slug: "facial", name: "Facial" },
  { slug: "bridal-makeup", name: "Bridal makeup" },
  { slug: "beard-trim", name: "Beard trim" },
  { slug: "hair-colour", name: "Hair colour" },
  { slug: "manicure", name: "Manicure" },
]

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const near = parseNear(sp)
  const cities = await listActiveCities()
  const [listed, countEntries] = await Promise.all([
    listLiveSalons({
      near,
      pageSize: 6,
      sort: near ? "nearest" : "",
      timeZone: cities[0]?.timezone,
    }),
    Promise.all(cities.map(async (city) => [city.slug, await countLiveByArea(city.slug)] as const)),
  ])
  const countsByCity = new Map(countEntries)
  const preview = listed.salons
  const name = siteName()
  const primary = cities[0]
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: appUrl("/"),
    description: "Salon discovery. Owners list their own services and prices.",
    potentialAction: primary
      ? {
          "@type": "SearchAction",
          target: `${appUrl(`/${primary.slug}`)}?service={query}`,
          "query-input": "required name=query",
        }
      : undefined,
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="px-4 pt-8 pb-4 sm:pt-14">
        <div className="mx-auto max-w-5xl">
          <p className="inline-flex h-8 items-center rounded-full bg-mustard px-3 text-sm font-semibold text-foreground">
            Early access
          </p>
          <h1 className="mt-2 max-w-2xl font-heading text-4xl leading-[1.05] text-balance sm:text-6xl">
            Find a salon near you, with the price written down.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Search by city, locality, and service — haircut, facial, bridal makeup. Free for you.
            Salon owners publish the page themselves.
          </p>
          {cities.length > 0 ? (
            <ul className="mt-4 flex gap-2 overflow-x-auto">
              {cities.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={`/${city.slug}`}
                    className="inline-flex h-11 items-center rounded-full border border-border bg-card px-3 text-sm font-medium"
                  >
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
      <SearchForm
        sticky
        cities={cities.map((city) => ({ slug: city.slug, name: city.name, localities: city.localities }))}
      />
      <section className="px-4">
        <div className="mx-auto max-w-5xl">
          {primary ? (
            <Suspense fallback={null}>
              <NearMe
                citySlug={primary.slug}
                localities={primary.localities.map((area) => ({ slug: area.slug, name: area.name }))}
              />
            </Suspense>
          ) : null}
          {primary ? (
            <ul className="mt-4 hidden gap-2 overflow-x-auto pb-1 sm:flex">
              {quickServices.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/${primary.slug}/service/${service.slug}`}
                    className="inline-flex h-11 items-center rounded-full border border-border bg-card px-3 text-sm whitespace-nowrap"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-heading text-3xl">{near ? "Salons near you" : "Featured salons"}</h2>
          {primary && preview.length > 0 ? (
            <Link
              href={
                near
                  ? `/${primary.slug}?lat=${near.lat.toFixed(5)}&lng=${near.lng.toFixed(5)}${near.km ? `&km=${near.km}` : ""}`
                  : `/${primary.slug}`
              }
              className="inline-flex h-11 items-center text-sm font-medium text-sage-ink"
            >
              See all
            </Link>
          ) : null}
        </div>
        {preview.length === 0 && near?.km ? (
          <div className="rounded-2xl bg-card px-4 py-12 text-center shadow-card ring-1 ring-border">
            <p className="font-heading text-2xl">No salons within {near.km} km</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href={widenNearHref(`/${primary?.slug ?? ""}`, sp, near)} className={cn(buttonVariants(), "h-11 px-4")}>
                Widen radius
              </Link>
              {primary ? (
                <Link href={`/${primary.slug}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}>
                  Browse {primary.name}
                </Link>
              ) : null}
            </div>
          </div>
        ) : preview.length === 0 ? (
          <div className="rounded-2xl bg-card px-4 py-12 text-center shadow-card ring-1 ring-border">
            <p className="font-heading text-2xl">No public listings yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Owners add themselves. If you run a salon, the early partner page is free.
            </p>
            <Link href="/for-salons" className={cn(buttonVariants(), "mt-4 h-11 px-4")}>
              List your salon free
            </Link>
          </div>
        ) : (
          <>
            <ul className="grid gap-4 sm:hidden">
              {preview.slice(0, 4).map((salon) => (
                <SalonCard key={salon.id} salon={salon} distanceKm={salon.distanceKm} />
              ))}
            </ul>
            <ul className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {preview.map((salon) => (
                <SalonCard key={salon.id} salon={salon} distanceKm={salon.distanceKm} />
              ))}
            </ul>
          </>
        )}
      </section>

      {cities.map((city) => {
        const counts = countsByCity.get(city.slug) ?? new Map()
        const withListings = [...city.localities].sort(
          (a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0),
        )
        const mobileAreas = withListings.filter((area) => (counts.get(area.slug) ?? 0) > 0).slice(0, 6)
        const areaChips = mobileAreas.length > 0 ? mobileAreas : city.localities.slice(0, 6)
        return (
          <section key={city.slug} className="mx-auto max-w-6xl px-4 py-4 pb-10 sm:pb-12">
            <div className="sm:hidden">
              <div className="mb-3 flex items-end justify-between gap-3">
                <h2 className="font-heading text-3xl">Areas</h2>
                <Link href={`/${city.slug}`} className="inline-flex h-11 items-center text-sm font-medium text-sage-ink">
                  All areas
                </Link>
              </div>
              <ul className="flex flex-wrap gap-2">
                {areaChips.map((area) => (
                  <li key={area.slug}>
                    <Link
                      href={`/${city.slug}/${area.slug}`}
                      className="inline-flex h-11 items-center rounded-full border border-border bg-card px-3 text-sm"
                    >
                      {area.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden sm:block">
              <h2 className="font-heading text-3xl">Localities in {city.name}</h2>
              <p className="mt-2 mb-4 max-w-xl text-sm text-muted-foreground">
                {city.localities.length} localities on the {city.name} list.
              </p>
              <AreaGrid citySlug={city.slug} localities={city.localities} counts={counts} />
            </div>
          </section>
        )
      })}

      <section className="hidden border-t border-border bg-card sm:block">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
          {[
            ["Pick a city and a locality", "Start with the cities on the list. Each one has its own neighbourhoods."],
            ["Compare the price list", "Each salon writes its own services, prices, and how long they take."],
            ["Message them", `WhatsApp or call. ${name} doesn't sit in the middle of the booking.`],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="font-heading text-2xl">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
