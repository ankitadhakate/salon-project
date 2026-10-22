import Link from "next/link"
import { AreaGrid } from "@/components/area-grid"
import { SalonCard } from "@/components/salon-card"
import { SearchForm } from "@/components/search-form"
import { buttonVariants } from "@/components/ui/button"
import { countLiveByArea, listLiveSalons } from "@/lib/salons"
import { appUrl } from "@/lib/urls"
import { cn } from "@/lib/utils"

const quickServices = ["Haircut", "Facial", "Bridal makeup", "Beard trim", "Hair colour", "Manicure"]

export default async function HomePage() {
  const [salons, counts] = await Promise.all([listLiveSalons(), countLiveByArea()])
  const preview = salons.slice(0, 6)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Saj",
    url: appUrl("/"),
    description: "Salon discovery for Pune. Owners list their own services and prices.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${appUrl("/pune")}?service={query}`,
      "query-input": "required name=query",
    },
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="px-4 pt-8 pb-4 sm:pt-14">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-medium tracking-wide text-primary">Pune · Early access</p>
          <h1 className="mt-2 max-w-2xl font-heading text-4xl leading-[1.05] text-balance sm:text-6xl">
            Find a salon near you, with the price written down.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Search by locality and service — haircut, facial, bridal makeup. Free for you. Salon
            owners publish the page themselves.
          </p>
          <div className="mt-6 rounded-3xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
            <SearchForm />
          </div>
          <ul className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {quickServices.map((service) => (
              <li key={service}>
                <Link
                  href={`/pune?service=${encodeURIComponent(service.toLowerCase())}`}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3 text-sm whitespace-nowrap"
                >
                  {service}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-heading text-3xl">Salons on Saj</h2>
          {salons.length > preview.length ? (
            <Link href="/pune" className="text-sm font-medium text-primary">
              See all {salons.length}
            </Link>
          ) : null}
        </div>
        {preview.length === 0 ? (
          <div className="rounded-2xl bg-card px-4 py-10 text-center ring-1 ring-foreground/10">
            <p className="font-heading text-2xl">No public listings yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Owners add themselves. If you run a salon in Pune, the early partner page is free.
            </p>
            <Link href="/for-salons" className={cn(buttonVariants(), "mt-4 h-11 px-4")}>
              List your salon
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((salon) => (
              <SalonCard key={salon.id} salon={salon} />
            ))}
          </ul>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-4 pb-12">
        <h2 className="font-heading text-3xl">Browse by area</h2>
        <p className="mt-2 mb-4 max-w-xl text-sm text-muted-foreground">
          Thirty localities for the Pune launch, from Baner and Kothrud to Kharadi and Hadapsar.
        </p>
        <AreaGrid counts={counts} />
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
          {[
            ["Pick a locality", "Baner, Koregaon Park, Hinjewadi, or anywhere else we list in Pune."],
            ["Compare the price list", "Each salon writes its own services, prices, and how long they take."],
            ["Message them", "WhatsApp or call. Saj doesn't sit in the middle of the booking."],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="font-heading text-2xl">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
