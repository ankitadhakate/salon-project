import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SalonCard } from "@/components/salon-card"
import { SearchForm } from "@/components/search-form"
import { WhatsAppShare } from "@/components/whatsapp-share"
import { buttonVariants } from "@/components/ui/button"
import { parseFilters, type SearchParams } from "@/lib/filters"
import { typicalPriceLabel } from "@/lib/format"
import { directoryEligible, robotsFor } from "@/lib/indexing"
import { getLocality, listActiveCities } from "@/lib/places"
import { areaServicePrices, countRealSalons, listLiveSalons } from "@/lib/salons"
import { appUrl } from "@/lib/urls"
import { cn } from "@/lib/utils"

type Props = { params: Promise<{ city: string; locality: string }>; searchParams: Promise<SearchParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, locality: localitySlug } = await params
  const locality = await getLocality(citySlug, localitySlug)
  if (!locality) return { title: "Area", robots: robotsFor(false) }
  const count = await countRealSalons({ citySlug, areaSlug: localitySlug })
  const title = `Salons in ${locality.name}, ${locality.city.name}`
  const description =
    locality.intro.trim() ||
    `Find salons in ${locality.name}, ${locality.city.name}. Prices are published by each salon.`
  return {
    title,
    description: description.slice(0, 180),
    alternates: { canonical: `/${citySlug}/${locality.slug}` },
    openGraph: { title, description, url: `/${citySlug}/${locality.slug}` },
    robots: robotsFor(directoryEligible(locality.intro, count)),
  }
}

export default async function LocalityPage({ params, searchParams }: Props) {
  const { city: citySlug, locality: localitySlug } = await params
  const locality = await getLocality(citySlug, localitySlug)
  if (!locality) notFound()
  const filters = parseFilters(await searchParams)
  const [salons, cities, servicePrices] = await Promise.all([
    listLiveSalons({ citySlug, areaSlug: locality.slug, ...filters }),
    listActiveCities(),
    areaServicePrices(citySlug, locality.slug),
  ])
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
    numberOfItems: salons.length,
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
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {salons.length === 0 ? "No matches" : salons.length === 1 ? "1 salon" : `${salons.length} salons`}
        </p>
        {filters.service || filters.gender || filters.price ? (
          <Link href={`/${city.slug}/${locality.slug}`} className="text-sm font-medium text-primary">
            Clear filters
          </Link>
        ) : null}
      </div>
      {salons.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-card px-4 py-10 text-center ring-1 ring-foreground/10">
          <p className="font-heading text-2xl">No salons in {locality.name} match that yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            A salon here would live at /{city.slug}/{locality.slug}/your-salon.
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
      {nearby.length > 0 ? (
        <div className="mt-10">
          <h2 className="font-heading text-2xl">Nearby in {city.name}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {nearby.map((area) => (
              <li key={area.slug}>
                <Link
                  href={`/${city.slug}/${area.slug}`}
                  className="inline-flex h-9 items-center rounded-full border border-border px-3 text-sm"
                >
                  {area.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`/${city.slug}`}
                className="inline-flex h-9 items-center rounded-full border border-border px-3 text-sm"
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
