import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { SalonCard } from "@/components/salon-card"
import { SearchForm } from "@/components/search-form"
import { buttonVariants } from "@/components/ui/button"
import { filtersToQuery, parseFilters, searchParam, type SearchParams } from "@/lib/filters"
import { directoryEligible, robotsFor } from "@/lib/indexing"
import { getActiveCity, listActiveCities } from "@/lib/places"
import { countRealSalons, listLiveSalons } from "@/lib/salons"
import { appUrl } from "@/lib/urls"
import { cn } from "@/lib/utils"

type Props = { params: Promise<{ city: string }>; searchParams: Promise<SearchParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug } = await params
  const city = await getActiveCity(citySlug)
  if (!city) return { title: "City", robots: robotsFor(false) }
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
    robots: robotsFor(directoryEligible(city.intro, count)),
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
    redirect(query ? `/${city.slug}/${areaValue}${query}` : `/${city.slug}/${areaValue}`)
  }

  const [salons, cities] = await Promise.all([
    listLiveSalons({ citySlug: city.slug, ...filters }),
    listActiveCities(),
  ])
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Salons in ${city.name}`,
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
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
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
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {salons.length === 0 ? "No matches" : salons.length === 1 ? "1 salon" : `${salons.length} salons`}
        </p>
        {filters.service || filters.gender || filters.price ? (
          <Link href={`/${city.slug}`} className="text-sm font-medium text-primary">
            Clear filters
          </Link>
        ) : null}
      </div>
      {salons.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-card px-4 py-10 text-center ring-1 ring-foreground/10">
          <p className="font-heading text-2xl">No salons in {city.name} match that yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Try another locality, or list the salon you run.
          </p>
          <Link href="/for-salons" className={cn(buttonVariants(), "mt-4 h-11 px-4")}>
            List your salon
          </Link>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {salons.map((salon) => (
            <SalonCard key={salon.id} salon={salon} />
          ))}
        </ul>
      )}
      {city.serviceGuides.length > 0 ? (
        <div className="mt-10">
          <h2 className="font-heading text-2xl">Services in {city.name}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {city.serviceGuides.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/${city.slug}/service/${guide.slug}`}
                  className="inline-flex h-9 items-center rounded-full border border-border px-3 text-sm"
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
