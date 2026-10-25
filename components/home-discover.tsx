import Image from "next/image"
import Link from "next/link"
import { Scissors, Sparkles } from "lucide-react"

/**
 * Category photos are Unsplash-licensed illustrations, not salon listings.
 * Haircut 1595476108010, beard 1503951914875, facial 1570172619644,
 * colour 1562322140, spa 1544161515, nails 1604654894610,
 * bridal 1487412947147, waxing 1516975080664.
 * Collections: 1521590832167, 1562322140, 1560066984, 1522337360788.
 */
const SERVICES = [
  { label: "Haircut", href: "/search?category=Hair", src: "/brand/services/haircut.jpg" },
  { label: "Beard", href: "/search?category=Grooming", src: "/brand/services/beard.jpg" },
  { label: "Facial", href: "/search?category=Skin", src: "/brand/services/facial.jpg" },
  { label: "Hair colour", href: "/search?category=Hair&q=colour", src: "/brand/services/colour.jpg" },
  { label: "Spa", href: "/search?category=Spa", src: "/brand/services/spa.jpg" },
  { label: "Nails", href: "/search?category=Nails", src: "/brand/services/nails.jpg" },
  { label: "Bridal", href: "/search?category=Makeup", src: "/brand/services/bridal.jpg" },
  { label: "Waxing", href: "/search?category=Waxing", src: "/brand/services/waxing.jpg" },
] as const

const COLLECTIONS = [
  { title: "Under ₹300", href: "/search?price=under-300", src: "/brand/collections/budget.jpg" },
  { title: "Premium", href: "/search?price=5000-plus", src: "/brand/collections/premium.jpg" },
  { title: "Unisex", href: "/search?gender=UNISEX", src: "/brand/collections/unisex.jpg" },
  { title: "Open now", href: "/search?open=1", src: "/brand/collections/open.jpg" },
] as const

export function PopularServices() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">Popular services</h2>
          <Scissors className="size-6 text-primary" aria-hidden />
        </div>
        <ul className="mt-8 flex gap-4 overflow-x-auto pb-2 sm:gap-6">
          {SERVICES.map((service) => (
            <li key={service.label} className="w-24 shrink-0 snap-start sm:w-28">
              <Link href={service.href} className="group block text-center">
                <span className="relative mx-auto block size-24 overflow-hidden rounded-full ring-2 ring-transparent transition group-hover:ring-primary sm:size-28">
                  <Image
                    src={service.src}
                    alt=""
                    fill
                    sizes="112px"
                    className="img-zoom object-cover"
                  />
                </span>
                <span className="mt-3 block text-sm font-semibold">{service.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Collections() {
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">Collections</h2>
            <p className="mt-2 text-muted-foreground">Real filters. Same salons, a quicker way in.</p>
          </div>
          <Sparkles className="size-6 text-primary" aria-hidden />
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {COLLECTIONS.map((item) => (
            <li key={item.title}>
              <Link href={item.href} className="card-lift group relative block aspect-[4/3] overflow-hidden rounded-2xl">
                <Image src={item.src} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="img-zoom object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-4 font-heading text-xl text-white sm:text-2xl">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function ListBand() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:py-20 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div>
          <p className="text-sm font-semibold tracking-wide uppercase">For salon owners</p>
          <h2 className="mt-2 font-heading text-4xl tracking-tight text-balance sm:text-5xl">List your salon free</h2>
          <p className="mt-4 max-w-lg text-base text-white/90">
            Add your services, your prices, and the door on the map. Customers message you on WhatsApp.
          </p>
          <Link
            href="/partner"
            className="press mt-6 inline-flex h-12 items-center rounded-full bg-white px-6 text-base font-semibold text-ink"
          >
            List your salon free
          </Link>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
          {/* Unsplash License. Photo 1633681926022-84c23e8cb2d6. */}
          <Image src="/brand/list-band.jpg" alt="A stylist working at a salon station" fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
        </div>
      </div>
    </section>
  )
}
