import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DirectoryBrowser } from "@/components/directory-browser"
import { NearMe } from "@/components/near-me"
import { SearchForm } from "@/components/search-form"
import { WhatsAppShare } from "@/components/whatsapp-share"
import { hasActiveQuery, hasListingFilters, parseFilters, type SearchParams } from "@/lib/filters"
import { parseNear, widenNearHref } from "@/lib/geo"
import { typicalPriceLabel } from "@/lib/format"
import { directoryEligible, robotsForListing } from "@/lib/indexing"
import { getLocality, listActiveCities } from "@/lib/places"
import { areaServicePrices, countRealSalons, listLiveSalons } from "@/lib/salons"
import { appUrl } from "@/lib/urls"

type Props = { params: Promise<{ city: string; locality: string }>; searchParams: Promise<SearchParams> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { city: citySlug, locality: localitySlug } = await params
  const locality = await getLocality(citySlug, localitySlug)
  if (!locality) notFound()
  const sp = await searchParams
  const count = await countRealSalons({ citySlug, areaSlug: localitySlug })
  const title = `Salons in ${locality.name}, ${locality.city.name}`
  const description =
    locality.intro.trim() ||
    `Find salons in ${locality.name}, ${locality.city.name}. Prices are published by each salon.`
  const path = `/${citySlug}/${locality.slug}`
  return {
    title,
    description: description.slice(0, 180),
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
    robots: robotsForListing(directoryEligible(locality.intro, count), hasActiveQuery(sp)),
  }
}

export default async function LocalityPage({ params, searchParams }: Props) {
  const { city: citySlug, locality: localitySlug } = await params
  const locality = await getLocality(citySlug, localitySlug)
  if (!locality) notFound()
  const sp = await searchParams
  const filters = parseFilters(sp)
  const near = parseNear(sp)
  const [listed, cities, servicePrices] = await Promise.all([
    listLiveSalons({
      citySlug,
      areaSlug: locality.slug,
      ...filters,
      near,
      timeZone: locality.city.timezone,
    }),
    listActiveCities(),
    areaServicePrices(citySlug, locality.slug),
  ])
  const { salons, hasMore, total } = listed
  const city = locality.city
  const priceRange = typicalPriceLabel(servicePrices)
  const intro = locality.intro.trim()
  const pageUrl = appUrl(`/${city.slug}/${locality.slug}`)
  const menu = cities.find((item) => item.slug === city.slug)
  const nearby = (menu?.localities ?? []).filter((area) => area.slug !== locality.slug).slice(0, 6)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Salons in ${locality.name}, ${city.name}`,
    numberOfItems: total,
    itemListElement: salons.map((salon, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: appUrl(`/${city.slug}/${locality.slug}/${salon.slug}`),
      name: salon.name,
    })),
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="inline-flex min-h-11 items-center hover:text-foreground">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${city.slug}`} className="inline-flex min-h-11 items-center hover:text-foreground">
              {city.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{locality.name}</li>
        </ol>
      </nav>
      <h1 className="mt-3 font-heading text-4xl text-balance sm:text-5xl">
        Salons in {locality.name}, {city.name}
      </h1>
      {priceRange ? <p className="mt-3 text-base font-medium">{priceRange}</p> : null}
      {intro ? <p className="mt-3 max-w-2xl text-muted-foreground">{intro}</p> : null}
      <div className="mt-4">
        <WhatsAppShare message={`Salons in ${locality.name}, ${city.name}: ${pageUrl}`} />
      </div>
      <div className="mt-6 rounded-3xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        <SearchForm
          cities={cities.map((item) => ({ slug: item.slug, name: item.name, localities: item.localities }))}
          defaults={{
            city: city.slug,
            area: locality.slug,
            service: filters.service,
            gender: filters.gender || "ANY",
            price: filters.price || "ANY",
          }}
        />
        <Suspense fallback={null}>
          <NearMe
            citySlug={city.slug}
            localities={(menu?.localities ?? []).map((area) => ({ slug: area.slug, name: area.name }))}
          />
        </Suspense>
      </div>
      <DirectoryBrowser
        path={`/${city.slug}/${locality.slug}`}
        filters={filters}
        near={near}
        services={(menu?.serviceGuides ?? []).map((guide) => ({ value: guide.query, label: guide.name }))}
        salons={salons}
        hasMore={hasMore}
        total={total}
        empty={{
          kind: near?.km && !hasListingFilters(filters) ? "radius" : "area",
          areaName: locality.name,
          cityName: city.name,
          cityHref: `/${city.slug}`,
          nearby: nearby.map((area) => ({ href: `/${city.slug}/${area.slug}`, name: area.name })),
          widenHref: near?.km ? widenNearHref(`/${city.slug}/${locality.slug}`, sp, near) : undefined,
          radiusKm: near?.km,
        }}
      />
      {nearby.length > 0 ? (
        <div className="mt-10">
          <h2 className="font-heading text-2xl">Nearby in {city.name}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {nearby.map((area) => (
              <li key={area.slug}>
                <Link
                  href={`/${city.slug}/${area.slug}`}
                  className="inline-flex h-11 items-center rounded-full border border-border px-3 text-sm"
                >
                  {area.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`/${city.slug}`}
                className="inline-flex h-11 items-center rounded-full border border-border px-3 text-sm"
              >
                All of {city.name}
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  )
}
