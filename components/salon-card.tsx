import Link from "next/link"
import { EarlyPartnerBadge, SampleBadge } from "@/components/badges"
import { SalonFallback } from "@/components/salon-fallback"
import { formatDistance } from "@/lib/geo"
import { genderLabel, inr, isOpenNow } from "@/lib/format"
import type { SalonCard as SalonCardData } from "@/lib/salons"

function priceLabel(prices: number[], starting: number | null) {
  const values = prices.filter((price) => price > 0)
  if (values.length === 0) {
    return starting != null ? `from ${inr(starting)}` : "Price list coming soon"
  }
  const low = Math.min(...values)
  const high = Math.max(...values)
  if (low === high) return inr(low)
  return `${inr(low)}–${inr(high)}`
}

export function SalonCard({
  salon,
  className,
  distanceKm = null,
}: {
  salon: SalonCardData
  className?: string
  distanceKm?: number | null
}) {
  const photo = salon.photos[0]
  const href = `/${salon.citySlug}/${salon.areaSlug}/${salon.slug}`
  const area = salon.locality?.name || salon.areaSlug
  const place = [salon.locality?.name, salon.city?.name].filter(Boolean).join(", ")
  const open = salon.hours.length
    ? isOpenNow(salon.hours, salon.city?.timezone || "Asia/Kolkata")
    : null
  const prices = salon.services.map((service) => service.priceInr)
  const priced = prices.some((price) => price > 0) || salon.startingPrice != null
  return (
    <li className={className}>
      <Link
        href={href}
        className="card-lift group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-blush-soft">
          {photo ? (
            // Owner uploads and sample SVGs. next/image does not allow SVG.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt={photo.alt || `${salon.name} in ${place || "the city"}`}
              width={640}
              height={400}
              className="img-zoom h-full w-full object-cover"
            />
          ) : (
            <SalonFallback name={salon.name} place={place} />
          )}
          {salon.isDemo ? (
            <span className="absolute top-3 left-3">
              <SampleBadge />
            </span>
          ) : null}
          {priced ? (
            <span className="absolute top-3 right-3 inline-flex h-7 max-w-[68%] items-center truncate rounded-full bg-mustard px-2.5 text-xs font-semibold text-foreground">
              {priceLabel(prices, salon.startingPrice)}
            </span>
          ) : null}
          {distanceKm != null ? (
            <span className="absolute bottom-3 left-3 inline-flex h-7 items-center rounded-full bg-card/95 px-2.5 text-xs font-semibold text-foreground">
              {formatDistance(distanceKm)}
            </span>
          ) : null}
          {open === true ? (
            <span className="absolute right-3 bottom-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-card/95 px-2.5 text-xs font-semibold text-foreground">
              <span className="size-2 rounded-full bg-sage-ink" aria-hidden />
              Open
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <h3 className="font-heading text-lg leading-tight group-hover:text-sage-ink">{salon.name}</h3>
          <p className="text-sm text-muted-foreground">
            {area}
            {` · ${genderLabel(salon.gender)}`}
          </p>
          {open === false ? <p className="text-sm font-medium text-muted-foreground">Closed</p> : null}
          {salon.isEarlyPartner ? (
            <div className="mt-auto pt-2">
              <EarlyPartnerBadge />
            </div>
          ) : null}
        </div>
      </Link>
    </li>
  )
}
