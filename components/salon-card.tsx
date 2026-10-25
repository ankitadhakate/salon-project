import Link from "next/link"
import { EarlyPartnerBadge, SampleBadge } from "@/components/badges"
import { SalonFallback } from "@/components/salon-fallback"
import { formatDistance } from "@/lib/geo"
import { genderLabel, inr, isOpenNow } from "@/lib/format"
import type { SalonCard as SalonCardData } from "@/lib/salons"

function fromPrice(prices: number[], starting: number | null) {
  const values = prices.filter((price) => price > 0)
  const low = values.length > 0 ? Math.min(...values) : starting
  if (low == null || low <= 0) return null
  return `from ${inr(low)}`
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
  const price = fromPrice(
    salon.services.map((service) => service.priceInr),
    salon.startingPrice,
  )
  return (
    <li className={className}>
      <Link
        href={href}
        className="card-lift group flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-card ring-1 ring-black/5"
      >
        <div className="relative aspect-[3/2] overflow-hidden bg-blush-soft">
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
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-heading text-xl leading-tight group-hover:text-sage-ink">{salon.name}</h3>
            {open === true ? (
              <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 text-sm font-medium">
                <span className="size-2 rounded-full bg-sage-ink" aria-hidden />
                Open
              </span>
            ) : open === false ? (
              <span className="mt-1 shrink-0 text-sm text-muted-foreground">Closed</span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {area}
            {distanceKm != null ? ` · ${formatDistance(distanceKm)}` : ""}
            {` · ${genderLabel(salon.gender)}`}
          </p>
          {price ? <p className="text-sm font-semibold">{price}</p> : null}
          {salon.isEarlyPartner ? (
            <div className="mt-auto pt-1">
              <EarlyPartnerBadge />
            </div>
          ) : null}
        </div>
      </Link>
    </li>
  )
}
