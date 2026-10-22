import Link from "next/link"
import { SalonFallback } from "@/components/salon-fallback"
import { formatDuration, genderLabel, inr, statusLabel } from "@/lib/format"
import type { OwnerSalon } from "@/lib/salons"

export function CustomerPreview({ salon }: { salon: OwnerSalon }) {
  const place = [salon.locality?.name, salon.city?.name].filter(Boolean).join(", ")
  const photo = salon.photos[0]
  const href = `/${salon.citySlug}/${salon.areaSlug}/${salon.slug}`
  const services = salon.services.slice(0, 4)
  const live = salon.status === "LIVE"
  return (
    <section id="customer-preview" className="mt-10">
      <h2 className="font-heading text-3xl">See how customers see your listing</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {live
          ? "This is the public page, narrowed to a phone. Opening it while you are logged in does not add a view."
          : `Customers cannot open this yet (${statusLabel(salon.status).toLowerCase()}). The frame below is what the page will look like.`}
      </p>
      <div className="mx-auto mt-4 w-full max-w-[390px] overflow-hidden rounded-[2rem] bg-card ring-1 ring-foreground/15">
        <div className="relative aspect-[16/10] bg-muted">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt={photo.alt || salon.name} className="h-full w-full object-cover" />
          ) : (
            <SalonFallback name={salon.name} place={place} />
          )}
        </div>
        <div className="grid gap-3 p-4">
          <div>
            <p className="font-heading text-2xl leading-tight">{salon.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {place || salon.areaSlug} · {genderLabel(salon.gender)}
            </p>
          </div>
          <p className="text-sm font-medium tabular-nums">
            {salon.startingPrice != null ? `from ${inr(salon.startingPrice)}` : "Price list coming soon"}
          </p>
          {services.length ? (
            <ul className="grid gap-2 text-sm">
              {services.map((service) => (
                <li key={service.id} className="flex items-baseline justify-between gap-3">
                  <span>
                    {service.name}
                    <span className="text-muted-foreground"> · {formatDuration(service.durationMin)}</span>
                  </span>
                  <span className="tabular-nums">{inr(service.priceInr)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No services yet.</p>
          )}
          <p className="text-sm text-muted-foreground">{salon.address}</p>
        </div>
      </div>
      <p className="mt-3 text-center text-sm">
        <Link href={href} className="font-medium text-primary">
          Open the customer page
        </Link>
      </p>
    </section>
  )
}
