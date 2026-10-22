import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { AreaGrid } from "@/components/area-grid"
import { SalonCard } from "@/components/salon-card"
import { SearchForm } from "@/components/search-form"
import { getArea } from "@/lib/areas"
import { describeFilters, parseFilters, type SearchParams } from "@/lib/filters"
import { countLiveByArea, listLiveSalons } from "@/lib/salons"

export const metadata: Metadata = {
  title: "Salons in Pune",
  description:
    "Browse salons across Pune by locality, service, price, and who they're for. Prices are published by each salon.",
  alternates: { canonical: "/pune" },
}

export default async function PunePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const areaValue = typeof sp.area === "string" ? sp.area : ""
  if (areaValue && getArea(areaValue)) {
    const params = new URLSearchParams()
    for (const key of ["service", "gender", "price"] as const) {
      const value = sp[key]
      const single = Array.isArray(value) ? value[0] : value
      if (single && single !== "ANY") params.set(key, single)
    }
    const query = params.toString()
    redirect(query ? `/pune/${areaValue}?${query}` : `/pune/${areaValue}`)
  }

  const filters = parseFilters(sp)
  const [salons, counts] = await Promise.all([
    listLiveSalons(filters),
    countLiveByArea(),
  ])
  const described = describeFilters(filters)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-heading text-4xl sm:text-5xl">Salons in Pune</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Every listing is written by the salon. Filter by what you want done, and what you want to spend.
      </p>
      <div className="mt-6 rounded-3xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        <SearchForm defaults={{ service: filters.service, gender: filters.gender, price: filters.price || "ANY" }} />
      </div>
      <div className="mt-8 mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-heading text-2xl">
          {salons.length === 1 ? "1 salon" : `${salons.length} salons`}
          {described.length ? <span className="text-muted-foreground"> · {described.join(" · ")}</span> : null}
        </h2>
        {described.length ? (
          <Link href="/pune" className="text-sm font-medium text-primary">
            Clear filters
          </Link>
        ) : null}
      </div>
      {salons.length === 0 ? (
        <p className="rounded-2xl bg-card px-4 py-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
          Nothing matches that yet. Try another service, or{" "}
          <Link href="/for-salons" className="font-medium text-primary">
            list your salon
          </Link>{" "}
          if you work in Pune.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {salons.map((salon) => (
            <SalonCard key={salon.id} salon={salon} />
          ))}
        </ul>
      )}
      <h2 className="mt-12 mb-4 font-heading text-3xl">Localities</h2>
      <AreaGrid counts={counts} />
    </div>
  )
}
