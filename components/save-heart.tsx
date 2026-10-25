"use client"

import { useEffect, useState } from "react"
import { Heart } from "lucide-react"

const KEY = "letstrim.saved"

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]") as unknown
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

/** A local save toggle. It stays in this browser and is not a rating. */
export function SaveHeart({ salonId }: { salonId: string }) {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(readSaved().includes(salonId))
  }, [salonId])

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved salons" : "Save this salon"}
      onClick={() => {
        const next = new Set(readSaved())
        if (next.has(salonId)) next.delete(salonId)
        else next.add(salonId)
        localStorage.setItem(KEY, JSON.stringify([...next]))
        setSaved(next.has(salonId))
      }}
      className="absolute top-3 right-3 z-10 inline-flex size-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm hover:bg-black/50"
    >
      <Heart className={saved ? "size-5 fill-primary text-primary" : "size-5"} aria-hidden />
    </button>
  )
}
