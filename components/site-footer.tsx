import Link from "next/link"
import { SERVICE_CATEGORIES } from "@/lib/constants"
import { listActiveCities } from "@/lib/places"
import { siteName } from "@/lib/site"

export async function SiteFooter() {
  const cities = await listActiveCities()
  const name = siteName()
  return (
    <footer className="mt-auto bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-heading text-3xl tracking-tight">{name}</p>
          <p className="mt-3 max-w-xs text-sm text-white/75">
            A free salon list. Customers browse. Salon owners publish their own prices, photos, and
            WhatsApp number.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide uppercase">Cities</p>
          {cities.length === 0 ? (
            <p className="mt-3 text-sm text-white/75">Cities show up here as they open.</p>
          ) : (
            <ul className="mt-3 grid gap-1 text-sm">
              {cities.map((city) => (
                <li key={city.slug}>
                  <Link href={`/${city.slug}`} className="inline-flex min-h-11 items-center text-white/80 hover:text-white">
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide uppercase">Services</p>
          <ul className="mt-3 grid gap-1 text-sm">
            {SERVICE_CATEGORIES.filter((category) => category !== "Other").map((category) => (
              <li key={category}>
                <Link
                  href={`/search?category=${encodeURIComponent(category)}`}
                  className="inline-flex min-h-11 items-center text-white/80 hover:text-white"
                >
                  {category}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold tracking-wide uppercase">Owners</p>
          <ul className="mt-3 grid gap-1">
            <li>
              <Link href="/for-salons" className="inline-flex min-h-11 items-center text-white/80 hover:text-white">
                List your salon free
              </Link>
            </li>
            <li>
              <Link href="/partner/join" className="inline-flex min-h-11 items-center text-white/80 hover:text-white">
                Create an account
              </Link>
            </li>
            <li>
              <Link href="/partner/login" className="inline-flex min-h-11 items-center text-white/80 hover:text-white">
                Owner login
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-white/70">
          {name} doesn&apos;t take bookings or payments. You talk to the salon directly.
        </p>
      </div>
    </footer>
  )
}