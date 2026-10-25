"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { PLACE_STORAGE_KEY, parseSavedPlace, serializePlace } from "@/lib/discovery"

const PLACE_EVENT = "letstrim-place"

export function AreaPill() {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function read() {
      const saved = parseSavedPlace(localStorage.getItem(PLACE_STORAGE_KEY))
      if (!saved) {
        if (!cancelled) setLabel(null)
        return
      }
      if (!cancelled) setLabel(saved.label)
      if (saved.label !== "Near you") return
      try {
        const response = await fetch(`/api/area?lat=${saved.lat}&lng=${saved.lng}`)
        if (!response.ok) return
        const body = (await response.json()) as { label?: string | null }
        const next = body.label?.trim()
        if (!next || cancelled) return
        const place = { ...saved, label: next.slice(0, 80) }
        localStorage.setItem(PLACE_STORAGE_KEY, serializePlace(place))
        if (!cancelled) setLabel(place.label)
      } catch {
        /* The coordinates stay labelled Near you. */
      }
    }
    void read()
    window.addEventListener(PLACE_EVENT, read)
    window.addEventListener("storage", read)
    return () => {
      cancelled = true
      window.removeEventListener(PLACE_EVENT, read)
      window.removeEventListener("storage", read)
    }
  }, [])

  const text = label ?? "Set location"
  return (
    <Link
      href="/?change=1"
      className="area-pill inline-flex h-8 max-w-full min-w-0 items-center gap-1 rounded-full px-2 text-xs font-semibold sm:px-2.5 sm:text-sm"
    >
      <MapPin className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{text}</span>
      <span className="sr-only">{label ? "Change location" : "Set your location"}</span>
    </Link>
  )
}
