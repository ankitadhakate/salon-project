"use client"

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: "Georgia, serif", padding: "4rem 1.5rem", background: "#f4efe6" }}>
        <h1>Saj is having trouble loading</h1>
        <p>Try again in a moment.</p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  )
}
