import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { EarlyPartnerBadge, SampleBadge } from "@/components/badges"
import { ContactActions } from "@/components/contact-actions"
import { SalonFallback } from "@/components/salon-fallback"
import { WhatsAppShare } from "@/components/whatsapp-share"
import { SERVICE_CATEGORIES, DAYS } from "@/lib/constants"
import {
  formatDay,
  formatDuration,
  formatPhone,
  formatTime,
  genderLabel,
  inr,
  isOpenNow,
  statusLabel,
  todayHoursLabel,
} from "@/lib/format"
import { robotsFor } from "@/lib/indexing"
import { getSessionUser } from "@/lib/auth"
import { getSalonBySlug, viewerCanSee } from "@/lib/salons"
import { siteName } from "@/lib/site"
import { appUrl } from "@/lib/urls"

type Props = { params: Promise<{ city: string; locality: string; salon: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, locality: areaSlug, salon: slug } = await params
  const salon = await getSalonBySlug(citySlug, areaSlug, slug)
  const place = salon ? `${salon.locality?.name ?? areaSlug}, ${salon.city?.name ?? citySlug}` : ""
  if (!salon || salon.status !== "LIVE") {
    return { title: "Salon", robots: robotsFor(false) }
  }
  const title = `${salon.name} in ${place}`
  const price = salon.startingPrice != null ? ` Services from ${inr(salon.startingPrice)}.` : ""
  const description = `${salon.name} is a ${genderLabel(salon.gender).toLowerCase()} salon in ${place}.${price} ${salon.description}`.slice(0, 180)
  const path = `/${citySlug}/${areaSlug}/${salon.slug}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website" },
    robots: robotsFor(!salon.isDemo),
  }
}

export default async function SalonPage({ params }: Props) {
  const { city: citySlug, locality: areaSlug, salon: slug } = await params
  const salon = await getSalonBySlug(citySlug, areaSlug, slug)
  if (!salon?.city || !salon.locality) notFound()
  const viewer = await getSessionUser()
  const access = viewerCanSee(salon, viewer)
  if (!access.visible) notFound()

  const groups = new Map<string, typeof salon.services>()
  for (const category of SERVICE_CATEGORIES) groups.set(category, [])
  for (const service of salon.services) {
    const list = groups.get(service.category) ?? []
    list.push(service)
    groups.set(service.category, list)
  }
  const timeZone = salon.city.timezone
  const open = isOpenNow(salon.hours, timeZone)
  const place = `${salon.locality.name}, ${salon.city.name}`
  const path = `/${salon.citySlug}/${salon.areaSlug}/${salon.slug}`
  const pageUrl = appUrl(path)
  const brand = siteName()
  const priceUpdated = salon.services.reduce<Date | null>((latest, service) => {
    if (!latest || service.updatedAt > latest) return service.updatedAt
    return latest
  }, null)
  const shareMessage =
    salon.startingPrice != null
      ? `${salon.name} in ${place}, from ${inr(salon.startingPrice)}: ${pageUrl}`
      : `${salon.name} in ${place}: ${pageUrl}`
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: salon.name,
    description: salon.description,
    url: pageUrl,
    image: salon.photos.map((photo) => (photo.url.startsWith("http") ? photo.url : appUrl(photo.url))),
    telephone: salon.phone ? `+${salon.city.dialCode}${salon.phone}` : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: salon.address,
      addressLocality: salon.locality.name,
      addressRegion: salon.city.name,
      addressCountry: salon.city.countryCode,
    },
    priceRange: salon.startingPrice != null ? `From ${inr(salon.startingPrice)}` : undefined,
    openingHoursSpecification: salon.hours
      .filter((hour) => !hour.closed)
      .map((hour) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAYS[hour.dayOfWeek],
        opens: hour.openTime,
        closes: hour.closeTime,
      })),
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-36 lg:pb-12">
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
            <Link href={`/${salon.citySlug}`} className="hover:text-foreground">
              {salon.city.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${salon.citySlug}/${salon.areaSlug}`} className="hover:text-foreground">
              {salon.locality.name}
            </Link>
          </li>
        </ol>
      </nav>

      {access.preview ? (
        <p className="mt-4 rounded-xl bg-secondary px-3 py-2 text-sm">
          Preview only. This listing is {statusLabel(salon.status).toLowerCase()} and is not on the public list.
        </p>
      ) : null}
      {salon.isDemo ? (
        <p className="mt-4 rounded-xl border border-border bg-card px-3 py-2 text-sm">
          Sample listing for development. Not a real salon. Remove samples with{" "}
          <span className="font-medium">npm run db:clear-demo</span> before you rely on this data.
        </p>
      ) : null}

      <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
        <div>
          {salon.photos.length ? (
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto">
              {salon.photos.map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={photo.id}
                  src={photo.url}
                  alt={photo.alt || `${salon.name} in ${place}`}
                  className="h-64 w-[86%] shrink-0 snap-center rounded-2xl object-cover sm:h-96 sm:w-full"
                />
              ))}
            </div>
          ) : (
            <div className="h-56 overflow-hidden rounded-2xl sm:h-80">
              <SalonFallback name={salon.name} place={place} />
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {salon.isEarlyPartner ? <EarlyPartnerBadge /> : null}
            {salon.isDemo ? <SampleBadge /> : null}
            <span className="text-sm text-muted-foreground">{genderLabel(salon.gender)}</span>
            <span className="text-sm font-medium">{open ? "Open now" : "Closed now"}</span>
          </div>
          <h1 className="mt-2 font-heading text-4xl text-balance sm:text-5xl">{salon.name}</h1>
          <div className="mt-3">
            <WhatsAppShare message={shareMessage} />
          </div>
          <p className="mt-3 text-muted-foreground">
            {salon.address}
            <span className="block">{place}</span>
          </p>
          {salon.startingPrice != null ? (
            <p className="mt-3 text-lg font-medium">Services from {inr(salon.startingPrice)}</p>
          ) : null}
          {salon.description ? <p className="mt-4 max-w-2xl leading-relaxed">{salon.description}</p> : null}
          {salon.isEarlyPartner ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Early partner — joined during the free launch.
            </p>
          ) : null}

          <h2 className="mt-10 font-heading text-3xl">Price list</h2>
          {salon.services.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Prices aren&apos;t listed yet.</p>
          ) : (
            [...groups.entries()]
              .filter(([, services]) => services.length > 0)
              .map(([category, services]) => (
                <section key={category} className="mt-5">
                  <h3 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                    {category}
                  </h3>
                  <ul className="mt-1 divide-y divide-border">
                    {services.map((service) => (
                      <li key={service.id} className="flex items-baseline justify-between gap-4 py-3">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{formatDuration(service.durationMin)}</p>
                        </div>
                        <p className="font-medium tabular-nums">{inr(service.priceInr)}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
          )}
          {priceUpdated ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Prices updated {formatDay(priceUpdated, timeZone)}
            </p>
          ) : null}

          <h2 className="mt-10 font-heading text-3xl">Opening hours</h2>
          <p className="mt-1 text-sm text-muted-foreground">{todayHoursLabel(salon.hours, timeZone)} · local time</p>
          <ul className="mt-3 divide-y divide-border">
            {DAYS.map((day, index) => {
              const row = salon.hours.find((hour) => hour.dayOfWeek === index)
              return (
                <li key={day} className="flex items-center justify-between py-2 text-sm">
                  <span>{day}</span>
                  <span className="tabular-nums">
                    {!row || row.closed ? "Closed" : `${formatTime(row.openTime)} – ${formatTime(row.closeTime)}`}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <aside className="mt-8 hidden lg:block">
          <div className="sticky top-24 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <p className="font-heading text-2xl">Contact {salon.name}</p>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              {open ? "Open now" : "Closed now"}. {todayHoursLabel(salon.hours, timeZone)}.
            </p>
            <ContactActions
              name={salon.name}
              phone={salon.phone}
              whatsapp={salon.whatsapp}
              address={salon.address}
              demo={salon.isDemo}
              place={place}
              dialCode={salon.city.dialCode}
            />
            <p className="mt-4 text-xs text-muted-foreground">
              {brand} doesn&apos;t take the booking or a fee. You&apos;re messaging the salon
              {salon.whatsapp ? ` at ${formatPhone(salon.whatsapp, salon.city.dialCode)}` : ""}.
            </p>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto max-w-lg">
          <ContactActions
            name={salon.name}
            phone={salon.phone}
            whatsapp={salon.whatsapp}
            address={salon.address}
            demo={salon.isDemo}
            place={place}
            dialCode={salon.city.dialCode}
            layout="bar"
          />
        </div>
      </div>
    </div>
  )
}
