"use client"

import { useEffect, useRef } from "react"
import type * as Leaflet from "leaflet"
import type { Map as LeafletMap } from "leaflet"
import { mapTileAttribution, mapTileUrl } from "@/lib/map-config"
import "leaflet/dist/leaflet.css"

export function SalonMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number
  longitude: number
  label: string
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    let cancelled = false
    const frame = frameRef.current
    if (!frame) return
    ;(async () => {
      const loaded = await import("leaflet")
      const L = (loaded as { default?: typeof Leaflet }).default ?? (loaded as unknown as typeof Leaflet)
      if (cancelled || mapRef.current) return
      const map = L.map(frame, { scrollWheelZoom: false }).setView([latitude, longitude], 16)
      L.tileLayer(mapTileUrl(), { attribution: mapTileAttribution(), maxZoom: 19 }).addTo(map)
      L.marker([latitude, longitude], { icon: L.divIcon({
        className: "leaflet-div-icon salon-pin",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }), title: label, keyboard: false }).addTo(map)
      mapRef.current = map
      window.setTimeout(() => map.invalidateSize(), 150)
    })()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [label, latitude, longitude])

  return (
    <div
      ref={frameRef}
      role="img"
      aria-label={`Map showing ${label}`}
      className="salon-map h-64 overflow-hidden rounded-2xl shadow-card ring-1 ring-border"
    />
  )
}
