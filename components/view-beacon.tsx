"use client"

import { useEffect } from "react"

export function ViewBeacon({ salonId }: { salonId: string }) {
  useEffect(() => {
    const body = JSON.stringify({ salonId, kind: "views" })
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
  }, [salonId])
  return null
}
