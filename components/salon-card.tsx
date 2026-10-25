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
  return (
    <li className={className}>
      <Link
        href={href}
        className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-sage"
      >
        <div className="relative aspect-[16/10] bg-blush-soft">
          {photo ? (
            // Owner uploads and sample SVGs. next/image does not allow SVG.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt={photo.alt || `${salon.name} in ${place || "the city"}`}
              width={640}
              height={400}
              className="h-full w-full object-cover"
            />
          ) : (
            <SalonFallback name={salon.name} place={place} />
          )}
          {salon.isDemo ? (
            <span className="absolute top-3 left-3">
              <SampleBadge />
            </span>
          ) : null}
          {open === true ? (
            <span className="absolute right-3 bottom-3 inline-flex h-7 items-center rounded-full bg-sage px-2.5 text-xs font-semibold text-foreground">
              Open now
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <h3 className="font-heading text-lg leading-tight group-hover:text-sage-ink">{salon.name}</h3>
          <p className="text-sm text-muted-foreground">
            {area}
            {distanceKm != null ? ` · ${formatDistance(distanceKm)} away` : ""}
            {` · ${genderLabel(salon.gender)}`}
          </p>
          <p className="text-sm font-semibold tabular-nums">{priceLabel(salon.services.map((service) => service.priceInr), salon.startingPrice)}</p>
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
