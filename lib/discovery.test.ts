import assert from "node:assert/strict"
import test from "node:test"
import {
  clearDiscoveryFilters,
  defaultCity,
  locationAfterGeoError,
  nextLocationStep,
  discoveryToQuery,
  parseDiscovery,
  parseSavedPlace,
  serializePlace,
} from "./discovery"
import { clampPriceInr } from "./filters"
import { boundingBox, clampRadiusKm, formatDistance, haversineKm } from "./geo"
import { groupSuggestions, type SuggestHit } from "./suggest"

test("bounding box contains the point and drops a salon past the radius", () => {
  const box = boundingBox(18.52, 73.85, 5)
  assert.ok(18.52 >= box.minLat && 18.52 <= box.maxLat)
  assert.ok(73.85 >= box.minLng && 73.85 <= box.maxLng)
  const farLat = 18.52 + 5 / 111 + 0.02
  assert.ok(farLat > box.maxLat)
  const inside = haversineKm(18.52, 73.85, 18.53, 73.855)
  assert.ok(inside < 5)
  const outside = haversineKm(18.52, 73.85, farLat, 73.85)
  assert.ok(outside > 5)
})

test("formats a short distance as kilometres with one decimal", () => {
  assert.equal(formatDistance(1.2), "1.2 km")
  assert.equal(formatDistance(0.4), "400 m")
})

test("the saved place stays in a JSON blob and rejects a bad payload", () => {
  const raw = serializePlace({ lat: 18.52012, lng: 73.85671, label: "Pune", km: 5 })
  const place = parseSavedPlace(raw)
  assert.equal(place?.label, "Pune")
  assert.equal(place?.km, 5)
  assert.equal(place?.lat, 18.52012)
  assert.equal(parseSavedPlace("not-json"), null)
  assert.equal(parseSavedPlace(JSON.stringify({ lat: 0, lng: 0, label: "Nowhere", km: 5 })), null)
  assert.equal(parseSavedPlace(null), null)
})

test("Pune is the default city when it is on the list", () => {
  const cities = [
    { slug: "mumbai", name: "Mumbai" },
    { slug: "pune", name: "Pune" },
  ]
  assert.equal(defaultCity(cities)?.slug, "pune")
  assert.equal(defaultCity([{ slug: "goa", name: "Goa" }])?.slug, "goa")
  assert.equal(defaultCity([]), null)
})

test("search filters round-trip through the shareable URL", () => {
  const parsed = parseDiscovery({
    q: "haircut",
    category: "Hair",
    gender: "WOMEN",
    price: "under-500",
    open: "1",
    sort: "relevance",
    km: "5",
    lat: "18.52000",
    lng: "73.85000",
    place: "Pune",
    page: "2",
  })
  assert.equal(parsed.q, "haircut")
  assert.equal(parsed.category, "Hair")
  assert.equal(parsed.gender, "WOMEN")
  assert.equal(parsed.price, "under-500")
  assert.equal(parsed.maxPrice, 500)
  assert.equal(parsed.open, true)
  assert.equal(parsed.sort, "relevance")
  assert.equal(parsed.near?.km, 5)
  assert.equal(parsed.place, "Pune")
  assert.equal(parsed.page, 2)
  const again = parseDiscovery(Object.fromEntries(new URLSearchParams(discoveryToQuery(parsed).slice(1))))
  assert.equal(again.q, "haircut")
  assert.equal(again.category, "Hair")
  assert.equal(again.gender, "WOMEN")
  assert.equal(again.open, true)
  assert.equal(again.sort, "relevance")
  assert.equal(again.near?.km, 5)
  assert.equal(again.page, 2)
  const cleared = clearDiscoveryFilters(parsed)
  assert.equal(cleared.category, "")
  assert.equal(cleared.gender, "")
  assert.equal(cleared.price, "")
  assert.equal(cleared.open, false)
  assert.equal(cleared.near?.km, null)
  assert.equal(cleared.q, "haircut")
})

test("suggestions group places, salons, and services", () => {
  const hits: SuggestHit[] = [
    { kind: "city", label: "Pune", hint: "City", href: "/" },
    { kind: "area", label: "Baner", hint: "Pune", href: "/" },
    { kind: "salon", label: "Aundh House", hint: "Aundh, Pune", href: "/pune/aundh/aundh-house" },
    { kind: "service", label: "Haircut", hint: "Hair", href: "/search?q=Haircut" },
  ]
  const groups = groupSuggestions(hits)
  assert.equal(groups.places.length, 2)
  assert.equal(groups.salons.length, 1)
  assert.equal(groups.services[0]?.label, "Haircut")
})

test("location is requested on load unless permission is denied", () => {
  assert.equal(nextLocationStep({ ask: false, permission: "granted" }), "request")
  assert.equal(nextLocationStep({ ask: false, permission: "prompt" }), "request")
  assert.equal(nextLocationStep({ ask: false, permission: "unknown" }), "request")
  assert.equal(nextLocationStep({ ask: false, permission: "denied" }), "enter")
  assert.equal(nextLocationStep({ ask: true, permission: "granted" }), "enter")
  assert.equal(nextLocationStep({ ask: true, permission: "prompt" }), "enter")
  assert.equal(locationAfterGeoError(), "enter")
})

test("a huge page, query, radius, and price are clamped", () => {
  const parsed = parseDiscovery({
    q: "h".repeat(200),
    page: "100000",
    lat: "18.52000",
    lng: "73.85000",
    km: "100000",
    price: "under-500",
  })
  assert.equal(parsed.page, 20)
  assert.equal(parsed.q.length, 80)
  assert.equal(parsed.near?.km, 20)
  assert.equal(parsed.maxPrice, 500)
  assert.equal(parseDiscovery({ page: "0" }).page, 1)
  assert.equal(clampRadiusKm(0.1), 2)
  assert.equal(clampRadiusKm(Number.NaN), null)
  assert.equal(clampPriceInr(1e12), 100_000)
  assert.equal(clampPriceInr(-40), 0)
})

test("an unknown category and a rating param are ignored", () => {
  const parsed = parseDiscovery({ category: "Rating", rating: "5", sort: "stars" })
  assert.equal(parsed.category, "")
  assert.equal(parsed.sort, "")
  assert.equal("rating" in parsed, false)
})
