import type { Metadata } from "next"
import Link from "next/link"
import { siteName } from "@/lib/site"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 font-heading text-4xl">That page isn&apos;t on {siteName()}</h1>
      <p className="mt-3 text-muted-foreground">
        The city, area, or salon may have moved. Try the home page, or list your own salon.
      </p>
      <div className="mt-6 flex justify-center gap-4 text-sm font-medium">
        <Link href="/" className="text-primary">
          Home
        </Link>
        <Link href="/for-salons" className="text-primary">
          For salons
        </Link>
      </div>
    </div>
  )
}
