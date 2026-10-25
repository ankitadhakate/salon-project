"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const STORAGE_KEY = "saj-near"

export function NearMe({
  citySlug,
  localities,
}: {
  citySlug: string
  localities: { slug: string; name: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [denied, setDenied] = useState(false)
  const [pending, setPending] = useState(false)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const km = searchParams.get("km")
  const active = Boolean(lat && lng)

  useEffect(() => {
    if (lat && lng) return
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (!saved) return
    const [savedLat, savedLng, savedKm] = saved.split(",")
    if (!savedLat || !savedLng) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("lat", savedLat)
    params.set("lng", savedLng)
    if (savedKm) params.set("km", savedKm)
    router.replace(`${pathname}?${params.toString()}`)
  }, [lat, lng, pathname, router, searchParams])

  function write(next: URLSearchParams) {
    const query = next.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setDenied(true)
      return
    }
    setPending(true)
    setDenied(false)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLat = position.coords.latitude.toFixed(5)
        const nextLng = position.coords.longitude.toFixed(5)
        const nextKm = km && ["2", "5", "10"].includes(km) ? km : "5"
        sessionStorage.setItem(STORAGE_KEY, `${nextLat},${nextLng},${nextKm}`)
        const params = new URLSearchParams(searchParams.toString())
        params.set("lat", nextLat)
        params.set("lng", nextLng)
        params.set("km", nextKm)
        setPending(false)
        write(params)
      },
      () => {
        setPending(false)
        setDenied(true)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }

  function setRadius(nextKm: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextKm) params.set("km", nextKm)
    else params.delete("km")
    const storedLat = params.get("lat")
    const storedLng = params.get("lng")
    if (storedLat && storedLng) {
      sessionStorage.setItem(STORAGE_KEY, `${storedLat},${storedLng},${nextKm}`)
    }
    write(params)
  }

  function stop() {
    sessionStorage.removeItem(STORAGE_KEY)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("lat")
    params.delete("lng")
    params.delete("km")
    setDenied(false)
    write(params)
  }

  return (
    <div className="mt-4 grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useLocation}
          disabled={pending}
          className="inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Finding you…" : active ? "Update my location" : "Use my location"}
        </button>
        {active ? (
          <button type="button" onClick={stop} className="h-11 rounded-full px-3 text-sm font-medium text-primary">
            Stop using my location
          </button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        {active
          ? "Sorted by distance. This stays in this browser tab only. It is not saved on an account."
          : "Optional. Salons with a map pin can be sorted by how far they are."}
      </p>
      {active ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Distance">
          {[
            ["2", "2 km"],
            ["5", "5 km"],
            ["10", "10 km"],
            ["", "Any distance"],
          ].map(([value, label]) => {
            const selected = value ? km === value : !km || !["2", "5", "10"].includes(km)
            return (
              <button
                key={label}
                type="button"
                onClick={() => setRadius(value)}
                aria-pressed={selected}
                className={
                  selected
                    ? "h-10 rounded-full bg-foreground px-3 text-sm font-medium text-background"
                    : "h-10 rounded-full border border-border bg-card px-3 text-sm"
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      ) : null}
      {denied ? (
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm font-medium">Location stays off in this browser.</p>
          <p className="mt-1 text-sm text-muted-foreground">Pick a locality instead.</p>
          {localities.length ? (
            <label className="mt-3 grid gap-1.5 text-sm font-medium">
              Locality
              <select
                className="h-12 rounded-lg border border-input bg-card px-3 text-base font-normal"
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) router.push(`/${citySlug}/${event.target.value}`)
                }}
              >
                <option value="" disabled>
                  Choose a locality
                </option>
                {localities.map((area) => (
                  <option key={area.slug} value={area.slug}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
