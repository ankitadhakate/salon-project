import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { NearMe } from "@/components/near-me"
import { SalonCard } from "@/components/salon-card"
import { buttonVariants } from "@/components/ui/button"
import { filtersToQuery, parseFilters, type SearchParams } from "@/lib/filters"
import { parseNear, rankByDistance } from "@/lib/geo"
import { directoryEligible, robotsFor } from "@/lib/indexing"
import { getActiveCity, getServiceGuide } from "@/lib/places"
import { countRealSalons, listLiveSalons } from "@/lib/salons"
import { appUrl } from "@/lib/urls"
import { cn } from "@/lib/utils"

type Props = {
  params: Promise<{ city: string; service: string }>
  searchParams: Promise<SearchParams>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, service: serviceSlug } = await params
  const guide = await getServiceGuide(citySlug, serviceSlug)
  if (!guide) return { title: "Service", robots: robotsFor(false) }
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
    robots: robotsFor(directoryEligible(guide.intro, count)),
  }
}

export default async function ServicePage({ params, searchParams }: Props) {
  const { city: citySlug, service: serviceSlug } = await params
  const guide = await getServiceGuide(citySlug, serviceSlug)
  if (!guide) notFound()
  const sp = await searchParams
  const filters = parseFilters(sp)
  const near = parseNear(sp)
  const listed = await listLiveSalons({
    citySlug,
    service: guide.query,
    gender: filters.gender,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
  })
  const salons = rankByDistance(listed, near)
  const city = guide.city
  const menu = await getActiveCity(citySlug)
  const query = filtersToQuery({ ...filters, service: "" })
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${guide.name} in ${city.name}`,
    numberOfItems: salons.length,
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
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${city.slug}`} className="hover:text-foreground">
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
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {salons.length === 0 ? "No matches" : salons.length === 1 ? "1 salon" : `${salons.length} salons`}
        </p>
        {query ? (
          <Link href={`/${city.slug}/service/${guide.slug}`} className="text-sm font-medium text-primary">
            Clear filters
          </Link>
        ) : null}
      </div>
      {salons.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-card px-4 py-10 text-center ring-1 ring-foreground/10">
          <p className="font-heading text-2xl">No {guide.name.toLowerCase()} listings yet</p>
          <Link href={`/${city.slug}`} className={cn(buttonVariants({ variant: "outline" }), "mt-4 h-11 px-4")}>
            All salons in {city.name}
          </Link>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {salons.map((salon) => (
            <SalonCard key={salon.id} salon={salon} distanceKm={salon.distanceKm} />
          ))}
        </ul>
      )}
    </div>
  )
}
