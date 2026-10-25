import assert from "node:assert/strict"
import test from "node:test"
import { nearestKnownLabel } from "./area"

test("reverse geocode prefers a nearby area, then the city", () => {
  const places = [
    { lat: 18.56, lng: 73.77, area: "Baner", city: "Pune" },
    { lat: 18.52, lng: 73.86, area: "Koregaon Park", city: "Pune" },
  ]
  assert.equal(nearestKnownLabel(18.559, 73.787, places), "Baner")
  assert.equal(nearestKnownLabel(18.7, 73.8, places), "Pune")
  assert.equal(nearestKnownLabel(12.97, 77.59, places), null)
})
