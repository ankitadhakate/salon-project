import Link from "next/link"
import { FilterChips, SearchFilters } from "@/components/search-filters"
import { OmniSearch } from "@/components/omni-search"
import { SalonCard } from "@/components/salon-card"
import { buttonVariants } from "@/components/ui/button"
import type { Metadata } from "next"
import { parseDiscovery, discoveryPath, discoverySort } from "@/lib/discovery"
import { type SearchParams } from "@/lib/filters"
import { widenNearHref } from "@/lib/geo"
import { robotsForListing } from "@/lib/indexing"
import { listActiveCities } from "@/lib/places"
import { listLiveSalons } from "@/lib/salons"
import { cn } from "@/lib/utils"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const query = parseDiscovery(await searchParams)
  const title = query.q ? `${query.q} salons` : query.place ? `Salons near ${query.place}` : "Search salons"
  return {
    title,
    robots: robotsForListing(false, true),
    alternates: { canonical: "/search" },
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const query = parseDiscovery(sp)
  const cities = await listActiveCities()
  const listed = await listLiveSalons({
    text: query.q,
    category: query.category || undefined,
    gender: query.gender,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    open: query.open,
    sort: discoverySort(query),
    page: query.page,
    pageSize: 12,
    pageMode: "offset",
    near: query.near,
    timeZone: cities[0]?.timezone,
  })
  const heading = query.q
    ? `Results for “${query.q}”`
    : query.place
      ? `Salons near ${query.place}`
      : "Salons"
  const previous = query.page > 1 ? discoveryPath({ ...query, page: query.page - 1 }) : ""
  const next = listed.hasMore ? discoveryPath({ ...query, page: query.page + 1 }) : ""

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-heading text-3xl sm:text-4xl">{heading}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {listed.total === 1 ? "1 salon" : `${listed.total} salons`}
        {query.place ? ` · ${query.place}` : ""}
      </p>
      <div className="mt-4">
        <OmniSearch initial={query.q} />
      </div>
      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchFilters query={query} />
          <FilterChips query={query} />
        </div>
        <div className="min-w-0">
          {listed.salons.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-card px-4 py-12 text-center shadow-card ring-1 ring-border">
              <p className="font-heading text-2xl">No salons match</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {query.near?.km
                  ? "Nothing is inside this radius. Widen it, or clear a filter."
                  : "Try a service name, a neighbourhood, or fewer filters."}
              </p>
              {query.near?.km ? (
                <Link href={widenNearHref("/search", sp, query.near)} className={cn(buttonVariants(), "mt-4 h-11 px-4")}>
                  Widen radius
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {listed.salons.map((salon, index) => (
                <SalonCard
                  key={salon.id}
                  salon={salon}
                  distanceKm={salon.distanceKm}
                  className={`rise rise-${Math.min(index, 5)}`}
                />
              ))}
            </ul>
          )}
          {previous || next ? (
            <div className="mt-6 flex justify-between gap-3">
              {previous ? (
                <Link href={previous} className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}>
                  Previous
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link href={next} className={cn(buttonVariants(), "h-11 px-4")}>
                  Next
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
