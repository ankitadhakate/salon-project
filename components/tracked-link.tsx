"use client"

export function TrackedLink({
  salonId,
  kind,
  href,
  className,
  children,
  external = false,
}: {
  salonId: string
  kind: "calls" | "whatsapps" | "directions"
  href: string
  className?: string
  children: React.ReactNode
  external?: boolean
}) {
  return (
    <a
      href={href}
      className={className}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={() => {
        if (!salonId) return
        const body = JSON.stringify({ salonId, kind })
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/salon-stats", new Blob([body], { type: "application/json" }))
          return
        }
        void fetch("/api/salon-stats", {
          method: "POST",
          body,
          keepalive: true,
          headers: { "content-type": "application/json" },
        })
      }}
    >
      {children}
    </a>
  )
}
