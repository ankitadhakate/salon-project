"use client"

import { useEffect, useRef, useState } from "react"
import type * as Leaflet from "leaflet"
import type { Map as LeafletMap, Marker } from "leaflet"
import { mapTileAttribution, mapTileUrl } from "@/lib/map-config"
import "leaflet/dist/leaflet.css"

type Hit = { label: string; latitude: number; longitude: number }

function pinIcon(L: typeof Leaflet) {
  return L.divIcon({
    className: "leaflet-div-icon salon-pin",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

export function PinPicker({
  latitude,
  longitude,
  mapsUrl = null,
}: {
  latitude: number | null
  longitude: number | null
  mapsUrl?: string | null
}) {
  const [lat, setLat] = useState<number | null>(latitude)
  const [lng, setLng] = useState<number | null>(longitude)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Hit[]>([])
  const [status, setStatus] = useState("")
  const [link, setLink] = useState(mapsUrl ?? "")
  const [acceptedUrl, setAcceptedUrl] = useState(mapsUrl ?? "")
  const [linkMessage, setLinkMessage] = useState("")
  const [linkError, setLinkError] = useState(false)
  const [linkBusy, setLinkBusy] = useState(false)
  const [hereBusy, setHereBusy] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const pendingRef = useRef<[number, number] | null>(null)

  useEffect(() => {
    let cancelled = false
    const frame = frameRef.current
    if (!frame) return
    ;(async () => {
      const loaded = await import("leaflet")
      const L = (loaded as { default?: typeof Leaflet }).default ?? (loaded as unknown as typeof Leaflet)
      if (cancelled || mapRef.current) return
      const hasPin = latitude != null && longitude != null
      const start: [number, number] = pendingRef.current ?? (hasPin ? [latitude, longitude] : [20.5937, 78.9629])
      const map = L.map(frame, { scrollWheelZoom: false }).setView(start, hasPin || pendingRef.current ? 16 : 4)
      L.tileLayer(mapTileUrl(), { attribution: mapTileAttribution(), maxZoom: 19 }).addTo(map)
      const marker = L.marker(start, { draggable: true, icon: pinIcon(L), autoPan: true }).addTo(map)
      if (!hasPin && !pendingRef.current) marker.setOpacity(0)
      marker.on("dragend", () => {
        const point = marker.getLatLng()
        marker.setOpacity(1)
        setLat(point.lat)
        setLng(point.lng)
      })
      mapRef.current = map
      markerRef.current = marker
      window.setTimeout(() => map.invalidateSize(), 150)
    })()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [latitude, longitude])

  function movePin(nextLat: number, nextLng: number) {
    setLat(nextLat)
    setLng(nextLng)
    pendingRef.current = [nextLat, nextLng]
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    marker.setOpacity(1)
    marker.setLatLng([nextLat, nextLng])
    map.setView([nextLat, nextLng], 16)
  }

  async function search(text: string) {
    const trimmed = text.trim()
    if (trimmed.length < 3) {
      setStatus("Type a street and a city.")
      return
    }
    setStatus("Searching…")
    setResults([])
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`)
    const data = (await response.json()) as { results?: Hit[]; error?: string }
    const hits = data.results ?? []
    setResults(hits)
    if (data.error) setStatus(data.error)
    else if (!hits.length) setStatus("No matches. Try the street and city, or drag the pin.")
    else {
      setStatus("")
      movePin(hits[0].latitude, hits[0].longitude)
    }
  }

  async function applyMapsLink() {
    const trimmed = link.trim()
    if (!trimmed) {
      setAcceptedUrl("")
      setLinkError(true)
      setLinkMessage("Paste a Google Maps link, or search the address.")
      return
    }
    setLinkBusy(true)
    setLinkError(false)
    setLinkMessage("Opening that Maps link…")
    try {
      const response = await fetch("/api/maps-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = (await response.json()) as {
        latitude?: number
        longitude?: number
        mapsUrl?: string
        placeName?: string | null
        error?: string
      }
      if (!response.ok || data.latitude == null || data.longitude == null) {
        setLinkError(true)
        setLinkMessage(data.error || "That Maps link didn't open. Paste the full link, or search the address.")
        return
      }
      setAcceptedUrl(data.mapsUrl || "")
      if (data.mapsUrl) setLink(data.mapsUrl)
      setLinkError(false)
      setLinkMessage(
        data.placeName
          ? `Pin dropped at ${data.placeName}. Drag it if the door is a little off.`
          : "Pin dropped. Drag it if the door is a little off.",
      )
      movePin(data.latitude, data.longitude)
    } catch {
      setLinkError(true)
      setLinkMessage("That Maps link didn't open. Paste the full link, or search the address.")
    } finally {
      setLinkBusy(false)
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLinkError(true)
      setLinkMessage("This browser can't share a location. Paste a Maps link, or search the address.")
      return
    }
    setHereBusy(true)
    setLinkError(false)
    setLinkMessage("Finding your location…")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHereBusy(false)
        setAcceptedUrl("")
        setLinkError(false)
        setLinkMessage("Using your current location. Drag the pin to the door.")
        movePin(position.coords.latitude, position.coords.longitude)
      },
      () => {
        setHereBusy(false)
        setLinkError(true)
        setLinkMessage("Location access is off. Paste a Maps link, or search the address.")
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    )
  }

  function searchWrittenAddress() {
    const address = (document.getElementById("address") as HTMLInputElement | null)?.value ?? ""
    const city = (document.getElementById("citySlug") as HTMLSelectElement | null)?.selectedOptions[0]?.text ?? ""
    const area = (document.getElementById("areaSlug") as HTMLSelectElement | null)?.selectedOptions[0]?.text ?? ""
    const text = [address, area, city].filter((part) => part && part !== "Choose a locality").join(", ")
    setQuery(text)
    void search(text)
  }

  const pinState = linkError ? "error" : /^(Pin dropped|Using your current location)/.test(linkMessage) ? "dropped" : "empty"

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <label htmlFor="maps-link" className="text-sm font-medium">
          Paste your Google Maps link
        </label>
        <p id="maps-link-hint" className="text-sm text-muted-foreground">
          Open the salon in Google Maps, tap Share, and paste the link here.
        </p>
        <input
          id="maps-link"
          value={link}
          onChange={(event) => {
            setLink(event.target.value)
            if (acceptedUrl && event.target.value.trim() !== acceptedUrl) setAcceptedUrl("")
          }}
          placeholder="https://maps.app.goo.gl/…"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={linkError || undefined}
          aria-describedby="maps-link-hint maps-link-status"
          className="h-12 w-full rounded-lg border border-input bg-card px-3 text-base"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void applyMapsLink()}
            disabled={linkBusy || hereBusy}
            className="h-12 flex-1 rounded-lg border border-border px-3 text-sm font-medium disabled:opacity-60"
          >
            {linkBusy ? "Opening…" : "Use this link"}
          </button>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={linkBusy || hereBusy}
            className="h-12 flex-1 rounded-lg border border-border px-3 text-sm font-medium disabled:opacity-60"
          >
            {hereBusy ? "Finding you…" : "Use my current location"}
          </button>
        </div>
        <p
          id="maps-link-status"
          data-pin-state={pinState}
          role={linkError ? "alert" : linkMessage ? "status" : undefined}
          className={
            linkError
              ? "rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
              : pinState === "dropped"
                ? "rounded-lg bg-sage/40 px-3 py-2 text-sm font-medium text-foreground"
                : "text-sm text-muted-foreground"
          }
        >
          {linkMessage}
        </p>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="map-search" className="text-sm font-medium">
          Find the salon on the map
        </label>
        <div className="flex gap-2">
          <input
            id="map-search"
            data-field="latitude"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Street, locality, city"
            className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-base"
          />
          <button
            type="button"
            onClick={() => void search(query)}
            className="h-12 shrink-0 rounded-lg border border-border px-3 text-sm font-medium"
          >
            Search
          </button>
        </div>
        <button type="button" onClick={searchWrittenAddress} className="text-left text-sm font-medium text-sage-ink">
          Search the address above
        </button>
      </div>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      {results.length > 1 ? (
        <ul className="grid gap-1">
          {results.map((hit) => (
            <li key={`${hit.latitude}-${hit.longitude}-${hit.label}`}>
              <button
                type="button"
                onClick={() => movePin(hit.latitude, hit.longitude)}
                className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary"
              >
                {hit.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div ref={frameRef} className="salon-map h-64 overflow-hidden rounded-2xl shadow-card ring-1 ring-border" />
      <p className="text-sm text-muted-foreground">
        {lat != null && lng != null
          ? "Drag the pin to the door."
          : "Search, then drag the pin to the door."}
      </p>
      <input type="hidden" name="latitude" value={lat ?? ""} />
      <input type="hidden" name="longitude" value={lng ?? ""} />
      <input type="hidden" name="mapsUrl" value={acceptedUrl} />
    </div>
  )
}
