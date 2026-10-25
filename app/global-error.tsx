"use client"

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: '"Plus Jakarta Sans", "Avenir Next", "Segoe UI", sans-serif', color: "#2b2a2a", padding: "4rem 1.5rem", background: "#f7ede2" }}>
        <h1>This site is having trouble loading</h1>
        <p>Try again in a moment.</p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  )
}
