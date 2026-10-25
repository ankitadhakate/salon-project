"use client"

import { useEffect, useId, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MapPin, Navigation } from "lucide-react"
import {
  PLACE_STORAGE_KEY,
  parseSavedPlace,
  serializePlace,
  type SavedPlace,
  type SearchRadius,
} from "@/lib/discovery"
import type { SuggestHit } from "@/lib/suggest"

type Center = { lat: number; lng: number; label: string }

export function LocationPrompt({
  active,
  ask,
  defaultPlace,
}: {
  active: boolean
  ask: boolean
  defaultPlace: Center | null
}) {
  const router = useRouter()
  const listId = useId()
  const [mode, setMode] = useState<"choose" | "enter">(ask ? "enter" : "choose")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [q, setQ] = useState("")
  const [places, setPlaces] = useState<SuggestHit[]>([])
  const [remote, setRemote] = useState<{ label: string; lat: number; lng: number }[]>([])

  useEffect(() => {
    if (active || ask) return
    const saved = parseSavedPlace(localStorage.getItem(PLACE_STORAGE_KEY))
    if (!saved) return
    router.replace(placeHref(saved))
  }, [active, ask, router])

  useEffect(() => {
    if (mode !== "enter") return
    const term = q.trim()
    if (term.length < 2) {
      setPlaces([])
      setRemote([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { hits: [] }))
        .then(async (body: { hits?: SuggestHit[] }) => {
          const hits = (body.hits ?? []).filter((hit) => hit.kind === "city" || hit.kind === "area")
          setPlaces(hits)
          if (hits.length > 0 || term.length < 3) {
            setRemote([])
            return
          }
          const geo = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, { signal: controller.signal })
          if (!geo.ok) return
          const found = (await geo.json()) as { results?: { label: string; latitude: number; longitude: number }[] }
          setRemote(
            (found.results ?? []).slice(0, 5).map((row) => ({
              label: row.label,
              lat: row.latitude,
              lng: row.longitude,
            })),
          )
        })
        .catch(() => {})
    }, 450)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [q, mode])

  function remember(place: SavedPlace) {
    localStorage.setItem(PLACE_STORAGE_KEY, serializePlace(place))
    router.push(placeHref(place))
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setError("This browser can't share a location. Enter a neighbourhood instead.")
      setMode("enter")
      return
    }
    setPending(true)
    setError("")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPending(false)
        remember({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "Near you",
          km: 5,
        })
      },
      (failure) => {
        setPending(false)
        setMode("enter")
        if (failure.code === 1) {
          setError("Location access is off. Enter a neighbourhood instead.")
        } else if (failure.code === 3) {
          setError("Finding you took too long. Enter a neighbourhood instead.")
        } else {
          setError("We couldn't read your location. Enter a neighbourhood instead.")
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }

  if (active && !ask) return null

  return (
    <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-card p-4 shadow-card ring-1 ring-border sm:p-6">
      {mode === "choose" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={useLocation}
            disabled={pending}
            className="press inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-base font-semibold text-primary-foreground disabled:opacity-70"
          >
            {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Navigation className="size-5" aria-hidden />}
            {pending ? "Finding you…" : "Use my location"}
          </button>
          <button
            type="button"
            onClick={() => setMode("enter")}
            className="press inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-secondary px-4 text-base font-semibold text-secondary-foreground"
          >
            <MapPin className="size-5" aria-hidden />
            Enter location
          </button>
        </div>
      ) : (
        <div>
          <label htmlFor={listId} className="text-sm font-medium">
            Neighbourhood or city
          </label>
          <input
            id={listId}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={defaultPlace ? defaultPlace.label : "Start typing"}
            autoComplete="off"
            className="mt-2 h-12 w-full rounded-full bg-background px-4 ring-1 ring-border"
          />
          {defaultPlace ? (
            <button
              type="button"
              className="mt-3 inline-flex h-10 items-center rounded-full bg-mustard px-3 text-sm font-semibold text-foreground"
              onClick={() => remember({ ...defaultPlace, km: 10 })}
            >
              {defaultPlace.label}
            </button>
          ) : null}
          <ul className="mt-2 grid" aria-label="Location suggestions">
            {places.map((place) => (
              <li key={`${place.kind}-${place.label}`}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-left hover:bg-blush"
                  onClick={() => {
                    if (place.lat == null || place.lng == null) {
                      router.push(place.href)
                      return
                    }
                    remember({
                      lat: place.lat,
                      lng: place.lng,
                      label: place.hint && place.kind === "area" ? `${place.label}, ${place.hint}` : place.label,
                      km: place.kind === "city" ? 10 : 5,
                    })
                  }}
                >
                  <span className="font-medium">{place.label}</span>
                  <span className="text-sm text-muted-foreground">{place.hint}</span>
                </button>
              </li>
            ))}
            {remote.map((place) => (
              <li key={place.label}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center rounded-xl px-2 text-left hover:bg-blush"
                  onClick={() => remember({ lat: place.lat, lng: place.lng, label: place.label.slice(0, 80), km: 5 })}
                >
                  {place.label}
                </button>
              </li>
            ))}
          </ul>
          {mode === "enter" ? (
            <button type="button" className="mt-2 h-11 text-sm font-medium text-sage-ink" onClick={() => setMode("choose")}>
              Back
            </button>
          ) : null}
        </div>
      )}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function placeHref(place: { lat: number; lng: number; label: string; km: SearchRadius }) {
  const params = new URLSearchParams({
    lat: place.lat.toFixed(5),
    lng: place.lng.toFixed(5),
    km: String(place.km),
    place: place.label,
  })
  return `/?${params.toString()}`
}
