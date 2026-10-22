import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 font-heading text-4xl">That page isn&apos;t on Saj</h1>
      <p className="mt-3 text-muted-foreground">
        The area or salon may have moved. Try a Pune locality, or list your own salon.
      </p>
      <div className="mt-6 flex justify-center gap-4 text-sm font-medium">
        <Link href="/pune" className="text-primary">
          Browse Pune
        </Link>
        <Link href="/for-salons" className="text-primary">
          For salons
        </Link>
      </div>
    </div>
  )
}
