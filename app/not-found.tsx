import type { Metadata } from "next"
import Link from "next/link"
import { listActiveCities } from "@/lib/places"
import { siteName } from "@/lib/site"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
}

export default async function NotFound() {
  let cities: { slug: string; name: string }[] = []
  try {
    const listed = await listActiveCities()
    cities = listed.map((city) => ({ slug: city.slug, name: city.name }))
  } catch {
    cities = []
  }
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 font-heading text-4xl">That page isn&apos;t on {siteName()}</h1>
      <p className="mt-3 text-muted-foreground">
        The city, area, or salon may have moved. Pick a city, or list your own salon.
      </p>
      {cities.length > 0 ? (
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {cities.map((city) => (
            <li key={city.slug}>
              <Link
                href={`/${city.slug}`}
                className="inline-flex h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium"
              >
                {city.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className="inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">
          Home
        </Link>
        <Link href="/for-salons" className="inline-flex h-11 items-center rounded-full border border-border px-4 text-sm font-medium">
          For salons
        </Link>
      </div>
    </div>
  )
}
