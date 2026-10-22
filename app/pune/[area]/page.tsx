import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SalonCard } from "@/components/salon-card"
import { SearchForm } from "@/components/search-form"
import { AREAS, getArea } from "@/lib/areas"
import { describeFilters, parseFilters, type SearchParams } from "@/lib/filters"
import { listLiveSalons } from "@/lib/salons"
import { appUrl } from "@/lib/urls"

type Props = {
  params: Promise<{ area: string }>
  searchParams: Promise<SearchParams>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area: slug } = await params
  const area = getArea(slug)
  if (!area) return { title: "Area" }
  const title = `Salons in ${area.name}, Pune`
  const description = `Find salons in ${area.name}, Pune. Compare haircut, facial, bridal makeup, and other services with prices published by each salon.`
  return {
    title,
    description,
    alternates: { canonical: `/pune/${area.slug}` },
    openGraph: { title, description, url: `/pune/${area.slug}` },
  }
}

export default async function AreaPage({ params, searchParams }: Props) {
  const { area: slug } = await params
  const area = getArea(slug)
  if (!area) notFound()
  const filters = parseFilters(await searchParams)
  const salons = await listLiveSalons({ ...filters, areaSlug: area.slug })
  const described = describeFilters(filters)
  const index = AREAS.findIndex((item) => item.slug === area.slug)
  const nearby = [...AREAS.slice(index + 1), ...AREAS.slice(0, index)].slice(0, 6)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Salons in ${area.name}, Pune`,
    itemListElement: salons.map((salon, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: salon.name,
      url: appUrl(`/pune/${area.slug}/${salon.slug}`),
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
            <Link href="/pune" className="hover:text-foreground">
              Pune
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{area.name}</li>
        </ol>
      </nav>
      <h1 className="mt-3 font-heading text-4xl text-balance sm:text-5xl">Salons in {area.name}</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Listings in {area.name}, Pune, with prices set by the salon. Message them on WhatsApp when you want to book.
      </p>
      <div className="mt-6 rounded-3xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        <SearchForm
          defaults={{
            area: area.slug,
            service: filters.service,
            gender: filters.gender,
            price: filters.price || "ANY",
          }}
        />
      </div>
      <div className="mt-8 mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-heading text-2xl">
          {salons.length === 1 ? "1 salon" : `${salons.length} salons`}
          {described.length ? <span className="text-muted-foreground"> · {described.join(" · ")}</span> : null}
        </h2>
        {described.length ? (
          <Link href={`/pune/${area.slug}`} className="text-sm font-medium text-primary">
            Clear filters
          </Link>
        ) : null}
      </div>
      {salons.length === 0 ? (
        <div className="rounded-2xl bg-card px-4 py-8 ring-1 ring-foreground/10">
          <p className="font-heading text-2xl">No salons in {area.name} match that yet</p>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            The early partner program is free. If you run a salon here, your page would live at a
            link like /pune/{area.slug}/your-salon.
          </p>
          <Link href="/for-salons" className="mt-3 inline-block text-sm font-medium text-primary">
            List your salon
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {salons.map((salon) => (
            <SalonCard key={salon.id} salon={salon} />
          ))}
        </ul>
      )}
      <h2 className="mt-12 mb-3 font-heading text-2xl">Other areas</h2>
      <ul className="flex flex-wrap gap-2">
        {nearby.map((item) => (
          <li key={item.slug}>
            <Link href={`/pune/${item.slug}`} className="inline-flex h-9 items-center rounded-full border border-border px-3 text-sm">
              {item.name}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/pune" className="inline-flex h-9 items-center rounded-full border border-border px-3 text-sm">
            All of Pune
          </Link>
        </li>
      </ul>
    </div>
  )
}
