import Link from "next/link"
import { listActiveCities } from "@/lib/places"
import { siteName } from "@/lib/site"

export async function SiteFooter() {
  const cities = await listActiveCities()
  const name = siteName()
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-heading text-2xl">{name}</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            A free salon list. Customers browse. Salon owners publish their own prices, photos, and
            WhatsApp number.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Cities</p>
          {cities.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Cities show up here as they open.</p>
          ) : (
            <ul className="mt-2 grid gap-y-1 text-sm text-muted-foreground">
              {cities.map((city) => (
                <li key={city.slug}>
                  <Link href={`/${city.slug}`} className="hover:text-foreground">
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="text-sm">
          <p className="font-medium">Owners</p>
          <ul className="mt-2 grid gap-1 text-muted-foreground">
            <li>
              <Link href="/for-salons" className="hover:text-foreground">
                List your salon free
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-foreground">
                Create an account
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-foreground">
                Owner login
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            {name} doesn&apos;t take bookings or payments. You talk to the salon directly.
          </p>
        </div>
      </div>
    </footer>
  )
}
