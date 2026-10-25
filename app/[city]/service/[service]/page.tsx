import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DirectoryBrowser } from "@/components/directory-browser"
import { NearMe } from "@/components/near-me"
import { hasActiveQuery, hasListingFilters, parseFilters, type SearchParams } from "@/lib/filters"
import { parseNear, widenNearHref } from "@/lib/geo"
import { directoryEligible, robotsForListing } from "@/lib/indexing"
import { getActiveCity, getServiceGuide } from "@/lib/places"
import { countRealSalons, listLiveSalons } from "@/lib/salons"
import { appUrl } from "@/lib/urls"

type Props = {
  params: Promise<{ city: string; service: string }>
  searchParams: Promise<SearchParams>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { city: citySlug, service: serviceSlug } = await params
  const guide = await getServiceGuide(citySlug, serviceSlug)
  if (!guide) notFound()
  const sp = await searchParams
  const count = await countRealSalons({ citySlug, serviceQuery: guide.query })
  const title = `${guide.name} in ${guide.city.name}`
  const description =
    guide.intro.trim() ||
    `${guide.name} at salons in ${guide.city.name}, with prices published by each salon.`
  const path = `/${citySlug}/service/${guide.slug}`
  return {
    title,
    description: description.slice(0, 180),
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
    robots: robotsForListing(directoryEligible(guide.intro, count), hasActiveQuery(sp)),
  }
}

export default async function ServicePage({ params, searchParams }: Props) {
  const { city: citySlug, service: serviceSlug } = await params
  const guide = await getServiceGuide(citySlug, serviceSlug)
  if (!guide) notFound()
  const sp = await searchParams
  const filters = parseFilters(sp)
  const near = parseNear(sp)
  const city = guide.city
  const menu = await getActiveCity(citySlug)
  const listed = await listLiveSalons({
    citySlug,
    service: guide.query,
    gender: filters.gender,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    open: filters.open,
    sort: filters.sort,
    page: filters.page,
    near,
    timeZone: city.timezone,
  })
  const { salons, hasMore, total } = listed
  const path = `/${city.slug}/service/${guide.slug}`
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${guide.name} in ${city.name}`,
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
          <li className="text-foreground">{guide.name}</li>
        </ol>
      </nav>
      <h1 className="mt-3 font-heading text-4xl sm:text-5xl">
        {guide.name} in {city.name}
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        {guide.intro.trim() ||
          `Salons in ${city.name} that list ${guide.name.toLowerCase()}, with prices set by the salon.`}
      </p>
      <Suspense fallback={null}>
        <NearMe
          citySlug={city.slug}
          localities={(menu?.localities ?? []).map((area) => ({ slug: area.slug, name: area.name }))}
        />
      </Suspense>
      <DirectoryBrowser
        path={path}
        filters={{ ...filters, service: "" }}
        near={near}
        services={(menu?.serviceGuides ?? []).map((item) => ({ value: item.query, label: item.name }))}
        salons={salons}
        hasMore={hasMore}
        total={total}
        summaryLead={[guide.name]}
        showService={false}
        empty={{
          kind: near?.km && !hasListingFilters({ ...filters, service: "" }) ? "radius" : "service",
          cityName: city.name,
          cityHref: `/${city.slug}`,
          serviceName: guide.name,
          nearby: (menu?.localities ?? []).slice(0, 6).map((area) => ({ href: `/${city.slug}/${area.slug}`, name: area.name })),
          widenHref: near?.km ? widenNearHref(path, sp, near) : undefined,
          radiusKm: near?.km,
        }}
      />
    </div>
  )
}
