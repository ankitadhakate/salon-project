import Image from "next/image"
import Link from "next/link"
import { HeroFinder } from "@/components/hero-finder"
import { Collections, ListBand, PopularServices } from "@/components/home-discover"
import { SalonCard } from "@/components/salon-card"
import { buttonVariants } from "@/components/ui/button"
import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { defaultCity, parseDiscovery } from "@/lib/discovery"
import { hasActiveQuery, searchParam, type SearchParams } from "@/lib/filters"
import { parseNear, widenNearHref } from "@/lib/geo"
import { robotsForListing } from "@/lib/indexing"
import { listActiveCities } from "@/lib/places"
import { listLiveSalons, publicSalonWhere } from "@/lib/salons"
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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const near = parseNear(sp)
  const discovery = parseDiscovery(sp)
  const ask = searchParam(sp, "change") === "1"
  const cities = await listActiveCities()
  const preferred = defaultCity(cities)
  const listed = await listLiveSalons({
    near: near ?? undefined,
    pageSize: 12,
    sort: near ? "nearest" : "",
    timeZone: preferred?.timezone,
  })
  const center = preferred
    ? await prisma.salon.aggregate({
        where: { ...publicSalonWhere(), citySlug: preferred.slug, latitude: { not: null } },
        _avg: { latitude: true, longitude: true },
      })
    : null
  const name = siteName()
  const defaultPlace =
    preferred && center?._avg.latitude != null && center._avg.longitude != null
      ? { label: preferred.name, lat: center._avg.latitude, lng: center._avg.longitude }
      : null
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: appUrl("/"),
    description: "Salon discovery. Owners list their own services and prices.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${appUrl("/search")}?q={query}`,
      "query-input": "required name=query",
    },
  }
  const emptyNear = Boolean(near && listed && listed.total === 0)

  return (
    <div className="home-hero">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="relative isolate flex min-h-[34rem] items-center sm:min-h-[38rem]">
        <div className="hero-fade absolute inset-0 overflow-hidden">
          {/* Unsplash License. Photos 1521590832167, 1560066984, 1522337360788, 1633681926022. */}
          {[
            ["/brand/hero-1.jpg", "Styling chairs and mirrors in a salon"],
            ["/brand/hero-2.jpg", "A stylist washing hair at a salon basin"],
            ["/brand/hero-3.jpg", "Hands styling long hair in a salon"],
            ["/brand/hero-4.jpg", "A bright salon interior with mirrors"],
          ].map(([src, alt], index) => (
            <div key={src} className="hero-slide">
              <Image src={src} alt={alt} fill priority={index === 0} sizes="100vw" className="object-cover" />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" aria-hidden />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/75 to-transparent" aria-hidden />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-16 text-center text-white">
          <h1 className="font-heading text-5xl leading-[0.95] font-extrabold tracking-tight text-balance sm:text-7xl">
            Find your next salon
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white sm:text-2xl">
            {preferred ? `${preferred.name}’s best salons, prices upfront` : "Prices upfront, from the salon"}
          </p>
          <HeroFinder active={Boolean(near)} ask={ask} placeLabel={discovery.place} defaultPlace={defaultPlace} />
        </div>
      </section>

      {emptyNear ? (
        <section className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-card ring-1 ring-border">
            <p className="font-heading text-3xl">No salons nearby</p>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Nothing with a map pin is inside {near?.km ?? "this"} km. Widen the radius and look again.
            </p>
            <Link href={widenNearHref("/", sp, near!)} className={cn(buttonVariants(), "mt-6 h-12 px-5")}>
              Widen radius
            </Link>
          </div>
        </section>
      ) : listed.salons.length > 0 ? (
        <section className="bg-blush-soft">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">
              {discovery.place ? `Top salons in ${discovery.place}` : near ? "Salons near you" : "Salons on LetsTrim"}
            </h2>
            <ul className="mt-8 flex snap-x gap-4 overflow-x-auto pb-4">
              {listed.salons.map((salon, index) => (
                <SalonCard
                  key={salon.id}
                  salon={salon}
                  distanceKm={salon.distanceKm}
                  layout="rail"
                  className={`rise rise-${Math.min(index, 5)}`}
                />
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <PopularServices />
      <Collections />
      <ListBand />
    </div>
  )
}
