"use client"

import { useCallback, useEffect, useId, useState } from "react"
import { useRouter } from "next/navigation"
import { MapPin } from "lucide-react"
import { OmniSearch } from "@/components/omni-search"
import {
  PLACE_STORAGE_KEY,
  heroLocationChrome,
  nextLocationStep,
  parseSavedPlace,
  serializePlace,
  type GeoPermission,
  type HeroChrome,
  type SavedPlace,
  type SearchRadius,
} from "@/lib/discovery"
import type { SuggestHit } from "@/lib/suggest"

type Center = { lat: number; lng: number; label: string }
type Mode = "locating" | "enter" | "ready"

async function readPermission(): Promise<GeoPermission> {
  if (!navigator.permissions?.query) return "unknown"
  try {
    const status = await Promise.race([
      navigator.permissions.query({ name: "geolocation" }),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 250)),
    ])
    if (!status) return "unknown"
    if (status.state === "granted" || status.state === "prompt" || status.state === "denied") return status.state
    return "unknown"
  } catch {
    return "unknown"
  }
}

function storePlace(place: SavedPlace) {
  localStorage.setItem(PLACE_STORAGE_KEY, serializePlace(place))
  window.dispatchEvent(new Event("letstrim-place"))
}

async function areaLabel(lat: number, lng: number) {
  try {
    const response = await fetch(`/api/area?lat=${lat}&lng=${lng}`)
    if (!response.ok) return "Near you"
    const body = (await response.json()) as { label?: string | null }
    return body.label?.trim().slice(0, 80) || "Near you"
  } catch {
    return "Near you"
  }
}

export function HeroFinder({
  active,
  ask,
  defaultPlace,
}: {
  active: boolean
  ask: boolean
  placeLabel: string
  defaultPlace: Center | null
}) {
  const router = useRouter()
  const listId = useId()
  const [mode, setMode] = useState<Mode>(ask ? "enter" : active ? "ready" : "locating")
  const [checked, setChecked] = useState(active || ask)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [q, setQ] = useState("")
  const [places, setPlaces] = useState<SuggestHit[]>([])
  const [remote, setRemote] = useState<{ label: string; lat: number; lng: number }[]>([])
  const [focused, setFocused] = useState(false)

  const requestPosition = useCallback(
    (fromGesture: boolean) => {
      if (!navigator.geolocation) {
        setError("This browser can't share a location. Enter an area or city.")
        setMode("enter")
        return
      }
      setPending(true)
      setError("")
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          void areaLabel(lat, lng).then((label) => {
            setPending(false)
            const place: SavedPlace = { lat, lng, label, km: 5 }
            storePlace(place)
            router.push(placeHref(place))
          })
        },
        (failure) => {
          setPending(false)
          const saved = parseSavedPlace(localStorage.getItem(PLACE_STORAGE_KEY))
          if (saved && !fromGesture) {
            router.replace(placeHref(saved))
            return
          }
          setError(
            failure.code === 3
              ? "Finding you took too long. Enter an area or city."
              : "Location access is off. Enter an area or city.",
          )
          setMode("enter")
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
      )
    },
    [router],
  )

  useEffect(() => {
    if (ask) {
      setMode("enter")
      setChecked(true)
      return
    }
    if (active) {
      setMode("ready")
      setChecked(true)
      return
    }
    const saved = parseSavedPlace(localStorage.getItem(PLACE_STORAGE_KEY))
    if (saved) {
      setMode("ready")
      setChecked(true)
      router.replace(placeHref(saved))
      return
    }
    let cancelled = false
    setChecked(true)
    ;(async () => {
      const permission = await readPermission()
      if (cancelled) return
      const step = nextLocationStep({ ask, permission })
      if (step === "enter") {
        setMode("enter")
        setError("Location access is off. Enter an area or city.")
        return
      }
      setMode("locating")
      requestPosition(false)
    })()
    return () => {
      cancelled = true
    }
  }, [active, ask, requestPosition, router])

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
    storePlace(place)
    router.push(placeHref(place))
  }

  const savedKnown = mode === "ready" || (active && !ask)
  const chrome: HeroChrome = checked
    ? heroLocationChrome({
        known: savedKnown,
        ask,
        status: mode === "ready" ? "granted" : mode === "enter" ? "failed" : "detecting",
      })
    : "search"
  const suggestionsOpen =
    chrome === "field" &&
    (focused || q.trim().length > 0) &&
    (places.length > 0 || remote.length > 0 || Boolean(defaultPlace))

  return (
    <div className="mx-auto mt-8 w-full max-w-3xl text-left text-foreground">
      <div
        className={`overflow-visible rounded-2xl bg-white shadow-[0_18px_50px_rgb(0_0_0/0.28)] ${
          chrome === "field" ? "flex flex-col sm:flex-row" : ""
        }`}
      >
        {chrome === "field" ? (
        <div className="relative border-b border-border sm:w-72 sm:border-r sm:border-b-0">
            <div>
              <label htmlFor={listId} className="sr-only">
                Area or city
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-sage-ink" aria-hidden />
                <input
                  id={listId}
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => window.setTimeout(() => setFocused(false), 150)}
                  placeholder={defaultPlace?.label ?? "Area or city"}
                  autoComplete="off"
                  className="h-14 w-full bg-transparent pr-3 pl-10 text-sm outline-none"
                />
              </div>
            </div>
          {suggestionsOpen ? (
            <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-2xl bg-white p-2 shadow-card ring-1 ring-border sm:w-80" aria-label="Location suggestions">
              {defaultPlace ? (
                <li>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center rounded-xl px-2 text-left text-sm font-medium hover:bg-blush"
                    onClick={() => remember({ ...defaultPlace, km: 10 })}
                  >
                    {defaultPlace.label}
                  </button>
                </li>
              ) : null}
              {places.map((place) => (
                <li key={`${place.kind}-${place.label}`}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-2 text-left hover:bg-blush"
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
                    className="flex min-h-11 w-full items-center rounded-xl px-2 text-left text-sm hover:bg-blush"
                    onClick={() => remember({ lat: place.lat, lng: place.lng, label: place.label.slice(0, 80), km: 5 })}
                  >
                    {place.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <OmniSearch embedded />
        </div>
      </div>
      {chrome === "detecting" ? (
        <p className="mt-3 text-center text-sm text-white/80" role="status">
          Detecting your location…
        </p>
      ) : null}
      {chrome === "field" ? (
        <button
          type="button"
          onClick={() => requestPosition(true)}
          disabled={pending}
          className="mt-3 text-sm font-semibold text-white underline decoration-white/70 underline-offset-4 disabled:opacity-70"
        >
          {pending ? "Finding you…" : "Use my location"}
        </button>
      ) : null}
      {chrome === "field" && error ? (
        <p className="mt-3 rounded-xl bg-white/95 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}
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
