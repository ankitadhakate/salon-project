import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { DirectoryBrowser } from "@/components/directory-browser"
import { NearMe } from "@/components/near-me"
import { SearchForm } from "@/components/search-form"
import { filtersToQuery, hasActiveQuery, hasListingFilters, parseFilters, searchParam, type SearchParams } from "@/lib/filters"
import { parseNear, widenNearHref, withNearQuery } from "@/lib/geo"
import { directoryEligible, robotsForListing } from "@/lib/indexing"
import { getActiveCity, listActiveCities } from "@/lib/places"
import { countRealSalons, listLiveSalons } from "@/lib/salons"
import { appUrl } from "@/lib/urls"

type Props = { params: Promise<{ city: string }>; searchParams: Promise<SearchParams> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { city: citySlug } = await params
  const city = await getActiveCity(citySlug)
  if (!city) notFound()
  const sp = await searchParams
  const count = await countRealSalons({ citySlug: city.slug })
  const title = `Salons in ${city.name}`
  const description =
    city.intro.trim() ||
    `Find salons in ${city.name}. Compare services and prices published by each salon.`
  return {
    title,
    description: description.slice(0, 180),
    alternates: { canonical: `/${city.slug}` },
    openGraph: { title, description, url: `/${city.slug}` },
    robots: robotsForListing(directoryEligible(city.intro, count), hasActiveQuery(sp)),
  }
}

export default async function CityPage({ params, searchParams }: Props) {
  const { city: citySlug } = await params
  const city = await getActiveCity(citySlug)
  if (!city) notFound()
  const sp = await searchParams
  const areaValue = searchParam(sp, "area")
  const filters = parseFilters(sp)
  if (areaValue && city.localities.some((area) => area.slug === areaValue)) {
    const query = filtersToQuery(filters)
    redirect(withNearQuery(query ? `/${city.slug}/${areaValue}${query}` : `/${city.slug}/${areaValue}`, sp))
  }
  const near = parseNear(sp)

  const [listed, cities] = await Promise.all([
    listLiveSalons({ citySlug: city.slug, ...filters, near, timeZone: city.timezone }),
    listActiveCities(),
  ])
  const { salons, hasMore, total } = listed
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Salons in ${city.name}`,
    numberOfItems: total,
    itemListElement: salons.map((salon, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: appUrl(`/${city.slug}/${salon.areaSlug}/${salon.slug}`),
      name: salon.name,
    })),
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="inline-flex min-h-11 items-center hover:text-foreground">
          Home
        </Link>
        <span aria-hidden="true"> / </span>
        {city.name}
      </p>
      <h1 className="mt-3 font-heading text-4xl sm:text-5xl">Salons in {city.name}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        {city.intro.trim() ||
          `Listings in ${city.name} with prices set by the salon. Message them on WhatsApp when you want to book.`}
      </p>
      <div className="mt-6 rounded-3xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        <SearchForm
          cities={cities.map((item) => ({ slug: item.slug, name: item.name, localities: item.localities }))}
          defaults={{ city: city.slug, service: filters.service, gender: filters.gender || "ANY", price: filters.price || "ANY" }}
        />
        <Suspense fallback={null}>
          <NearMe
            citySlug={city.slug}
            localities={city.localities.map((area) => ({ slug: area.slug, name: area.name }))}
          />
        </Suspense>
      </div>
      <DirectoryBrowser
        path={`/${city.slug}`}
        filters={filters}
        near={near}
        services={city.serviceGuides.map((guide) => ({ value: guide.query, label: guide.name }))}
        salons={salons}
        hasMore={hasMore}
        total={total}
        empty={{
          kind: near?.km && !hasListingFilters(filters) ? "radius" : "city",
          cityName: city.name,
          cityHref: `/${city.slug}`,
          nearby: city.localities.slice(0, 6).map((area) => ({ href: `/${city.slug}/${area.slug}`, name: area.name })),
          widenHref: near?.km ? widenNearHref(`/${city.slug}`, sp, near) : undefined,
          radiusKm: near?.km,
        }}
      />
      {city.serviceGuides.length > 0 ? (
        <div className="mt-10">
          <h2 className="font-heading text-2xl">Services in {city.name}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {city.serviceGuides.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/${city.slug}/service/${guide.slug}`}
                  className="inline-flex h-11 items-center rounded-full border border-border px-3 text-sm"
                >
                  {guide.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
