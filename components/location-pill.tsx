"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { PLACE_STORAGE_KEY, parseSavedPlace } from "@/lib/discovery"

export function LocationPill({ label }: { label?: string }) {
  const [saved, setSaved] = useState(label ?? "")

  useEffect(() => {
    if (label) return
    const place = parseSavedPlace(localStorage.getItem(PLACE_STORAGE_KEY))
    if (place) setSaved(place.label)
  }, [label])

  return (
    <Link
      href="/?change=1"
      aria-label={saved ? `Change location, ${saved}` : "Change location"}
      className="inline-flex h-10 max-w-[9.5rem] items-center gap-1 rounded-full bg-card px-3 text-sm font-medium shadow-card ring-1 ring-border sm:max-w-[14rem]"
    >
      <MapPin className="size-4 shrink-0 text-sage-ink" aria-hidden />
      <span className="truncate">{saved || "Change location"}</span>
    </Link>
  )
}
