"use client"

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="font-heading text-4xl">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">
        The page didn&apos;t load. Try again, or go back to the Pune list.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Try again
      </button>
    </div>
  )
}
