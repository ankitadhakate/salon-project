import assert from "node:assert/strict"
import test from "node:test"
import { directionsHref } from "./format"
import { MAPS_LINK_ERRORS, parseMapsUrl, resolveMapsLink, sanitizeMapsUrl } from "./maps-link"

test("reads coordinates from @, place pin, query params, and country TLDs", () => {
  const at = parseMapsUrl("https://www.google.com/maps/@18.5204,73.8567,15z")
  assert.equal(at.ok && at.kind === "coords" && at.latitude, 18.5204)
  assert.equal(at.ok && at.kind === "coords" && at.longitude, 73.8567)

  const india = parseMapsUrl("https://www.google.co.in/maps/@18.5204,73.8567,15z")
  assert.equal(india.ok && india.kind === "coords" && india.latitude, 18.5204)

  const germany = parseMapsUrl("https://www.google.de/maps/@52.52,13.405,12z")
  assert.equal(germany.ok && germany.kind === "coords" && germany.longitude, 13.405)

  const pin = parseMapsUrl(
    "https://www.google.com/maps/place/Saffron+Atelier/@18.5204,73.8567,17z/data=!3m1!4b1!8m2!3d18.5362!4d73.8939",
  )
  assert.equal(pin.ok && pin.kind === "coords" && pin.latitude, 18.5362)
  assert.equal(pin.ok && pin.kind === "coords" && pin.longitude, 73.8939)
  assert.equal(pin.ok && pin.kind === "coords" && pin.placeName, "Saffron Atelier")

  const query = parseMapsUrl("https://www.google.com/maps/search/?api=1&query=18.52,73.85")
  assert.equal(query.ok && query.kind === "coords" && query.latitude, 18.52)
  assert.equal(query.ok && query.kind === "coords" && query.longitude, 73.85)

  const q = parseMapsUrl("https://www.google.com/maps?q=18.5204,73.8567")
  assert.equal(q.ok && q.kind === "coords" && q.latitude, 18.5204)

  const ll = parseMapsUrl("https://maps.google.com/maps?ll=18.50,73.80&z=15")
  assert.equal(ll.ok && ll.kind === "coords" && ll.latitude, 18.5)
  assert.equal(ll.ok && ll.kind === "coords" && ll.longitude, 73.8)

  const destination = parseMapsUrl("https://www.google.com/maps/dir/?api=1&destination=18.559,73.7868")
  assert.equal(destination.ok && destination.kind === "coords" && destination.latitude, 18.559)
  assert.equal(destination.ok && destination.kind === "coords" && destination.longitude, 73.7868)

  const destinationOverAt = parseMapsUrl("https://www.google.com/maps/@10,10,15z?destination=18.5,73.8")
  assert.equal(destinationOverAt.ok && destinationOverAt.kind === "coords" && destinationOverAt.latitude, 18.5)

  const pinOverDestination = parseMapsUrl(
    "https://www.google.com/maps/place/X/@10,10,15z/data=!3d18.5!4d73.8?destination=1,1",
  )
  assert.equal(pinOverDestination.ok && pinOverDestination.kind === "coords" && pinOverDestination.latitude, 18.5)
  assert.equal(pinOverDestination.ok && pinOverDestination.kind === "coords" && pinOverDestination.longitude, 73.8)
})

test("falls back to a place name from q= or /place/ and rejects bad coordinates", () => {
  const named = parseMapsUrl("https://www.google.com/maps?q=Koregaon+Park+Pune")
  assert.equal(named.ok && named.kind === "place" && named.placeQuery, "Koregaon Park Pune")

  const place = parseMapsUrl("https://www.google.co.in/maps/place/Saffron+Atelier/")
  assert.equal(place.ok && place.kind === "place" && place.placeQuery, "Saffron Atelier")

  const address = parseMapsUrl("https://www.google.com/maps/dir/?api=1&destination=Koregaon+Park+Pune")
  assert.equal(address.ok && address.kind === "place" && address.placeQuery, "Koregaon Park Pune")

  const island = parseMapsUrl("https://www.google.com/maps/@0,0,15z")
  assert.equal(island.ok, false)
  assert.equal(island.ok ? "" : island.error, MAPS_LINK_ERRORS.nullIsland)

  const off = parseMapsUrl("https://www.google.com/maps/@91,10,15z")
  assert.equal(off.ok, false)
  assert.equal(off.ok ? "" : off.error, MAPS_LINK_ERRORS.offMap)

  const bare = parseMapsUrl("https://www.google.com/maps")
  assert.equal(bare.ok, false)
  assert.equal(bare.ok ? "" : bare.error, MAPS_LINK_ERRORS.noPin)
})

test("accepts short links and stores only allowlisted https Maps URLs", () => {
  const app = parseMapsUrl("https://maps.app.goo.gl/abc123")
  assert.equal(app.ok && app.kind, "short")
  const legacy = parseMapsUrl("https://goo.gl/maps/abc123")
  assert.equal(legacy.ok && legacy.kind, "short")
  assert.equal(parseMapsUrl("https://goo.gl/notmaps").ok, false)
  assert.equal(parseMapsUrl("http://www.google.com/maps/@18.5,73.8,15z").ok, false)
  assert.equal(parseMapsUrl("https://example.com/maps/@18.5,73.8,15z").ok, false)
  assert.equal(parseMapsUrl("https://user:pass@www.google.com/maps/@18.5,73.8,15z").ok, false)
  assert.equal(parseMapsUrl("https://8.8.8.8/maps/@18.5,73.8,15z").ok, false)

  const stored = sanitizeMapsUrl("https://www.google.com/maps/@18.5,73.8,15z#street")
  assert.equal(stored?.includes("#"), false)
  assert.equal(stored?.includes("@18.5,73.8"), true)
  assert.equal(sanitizeMapsUrl("https://evil.example/maps"), null)
  assert.equal(
    directionsHref(18.5, 73.8, "Lane", "Pune", "https://www.google.com/maps/@18.5,73.8,15z"),
    "https://www.google.com/maps/dir/?api=1&destination=18.5,73.8",
  )
  assert.equal(
    directionsHref(null, null, "Lane", "Pune", "https://www.google.com/maps/place/Saffron+Atelier/"),
    "https://www.google.com/maps/place/Saffron+Atelier/",
  )
  assert.equal(
    directionsHref(18.5, 73.8, "Lane", "Pune", "https://evil.example/phish"),
    "https://www.google.com/maps/dir/?api=1&destination=18.5,73.8",
  )
})

test("resolver rejects non-allowlisted hosts and redirects", async () => {
  let calls = 0
  const fetchImpl: typeof fetch = async (input, init) => {
    calls += 1
    assert.equal(init?.redirect, "manual")
    const url = String(input)
    if (url === "https://maps.app.goo.gl/ok") {
      return new Response(null, {
        status: 302,
        headers: { location: "https://www.google.com/maps/@18.5362,73.8939,17z" },
      })
    }
    if (url === "https://maps.app.goo.gl/evil") {
      return new Response(null, { status: 302, headers: { location: "https://evil.example/phish" } })
    }
    if (url === "https://maps.app.goo.gl/ip") {
      return new Response(null, { status: 302, headers: { location: "https://8.8.8.8/maps/@18.5,73.8,15z" } })
    }
    if (url === "https://maps.app.goo.gl/http") {
      return new Response(null, {
        status: 302,
        headers: { location: "http://www.google.com/maps/@18.5,73.8,15z" },
      })
    }
    if (url === "https://goo.gl/maps/loop" || url === "https://maps.app.goo.gl/loop") {
      return new Response(null, { status: 302, headers: { location: "https://maps.app.goo.gl/loop" } })
    }
    if (url === "https://maps.app.goo.gl/de") {
      return new Response(null, {
        status: 302,
        headers: { location: "https://www.google.de/maps/@52.52,13.405,12z" },
      })
    }
    if (url === "https://maps.app.goo.gl/html") {
      return new Response(
        '<a href="https://www.google.com/maps/place/Saffron+Atelier/@18.52,73.85,17z/data=!3d18.5362!4d73.8939">open</a>',
        { status: 200, headers: { "content-type": "text/html" } },
      )
    }
    if (url === "https://maps.app.goo.gl/meta") {
      return new Response(
        '<meta http-equiv="refresh" content="0;url=https://www.google.co.in/maps/@18.5,73.8,15z">',
        { status: 200 },
      )
    }
    if (url === "https://maps.app.goo.gl/body") {
      return new Response('<a href="https://evil.example/steal">x</a> !3d18.51!4d73.81', { status: 200 })
    }
    if (url === "https://maps.app.goo.gl/huge") {
      return new Response(null, {
        status: 302,
        headers: {
          location: "https://www.google.com/maps/@18.5,73.8,15z",
          "content-length": "70000",
        },
      })
    }
    throw new Error(`unexpected fetch ${url}`)
  }

  const direct = await resolveMapsLink("https://www.google.co.in/maps/@18.52,73.85,15z", { fetch: fetchImpl })
  assert.equal(direct.ok && direct.kind === "coords" && direct.latitude, 18.52)
  assert.equal(calls, 0)

  const blocked = await resolveMapsLink("https://evil.example/maps/@18.5,73.8,15z", { fetch: fetchImpl })
  assert.equal(blocked.ok, false)
  assert.equal(blocked.ok ? "" : blocked.error, MAPS_LINK_ERRORS.notMaps)
  assert.equal(calls, 0)

  const ip = await resolveMapsLink("https://127.0.0.1/maps/@18.5,73.8", { fetch: fetchImpl })
  assert.equal(ip.ok, false)
  assert.equal(calls, 0)

  const germany = await resolveMapsLink("https://maps.app.goo.gl/de", { fetch: fetchImpl })
  assert.equal(germany.ok && germany.kind === "coords" && germany.latitude, 52.52)

  const html = await resolveMapsLink("https://maps.app.goo.gl/html", { fetch: fetchImpl })
  assert.equal(html.ok && html.kind === "coords" && html.latitude, 18.5362)
  assert.equal(html.ok && html.kind === "coords" && html.placeName, "Saffron Atelier")

  const meta = await resolveMapsLink("https://maps.app.goo.gl/meta", { fetch: fetchImpl })
  assert.equal(meta.ok && meta.kind === "coords" && meta.longitude, 73.8)

  const embedded = await resolveMapsLink("https://maps.app.goo.gl/body", { fetch: fetchImpl })
  assert.equal(embedded.ok && embedded.kind === "coords" && embedded.latitude, 18.51)
  assert.equal(embedded.ok && embedded.kind === "coords" && embedded.longitude, 73.81)

  const followed = await resolveMapsLink("https://maps.app.goo.gl/ok", { fetch: fetchImpl })
  assert.equal(followed.ok && followed.kind === "coords" && followed.latitude, 18.5362)
  assert.equal(followed.ok && followed.kind === "coords" && followed.mapsUrl.includes("maps.app.goo.gl/ok"), true)

  const evil = await resolveMapsLink("https://maps.app.goo.gl/evil", { fetch: fetchImpl })
  assert.equal(evil.ok, false)
  assert.equal(evil.ok ? "" : evil.error, MAPS_LINK_ERRORS.leftGoogle)

  const literal = await resolveMapsLink("https://maps.app.goo.gl/ip", { fetch: fetchImpl })
  assert.equal(literal.ok, false)
  assert.equal(literal.ok ? "" : literal.error, MAPS_LINK_ERRORS.leftGoogle)

  const insecure = await resolveMapsLink("https://maps.app.goo.gl/http", { fetch: fetchImpl })
  assert.equal(insecure.ok, false)
  assert.equal(insecure.ok ? "" : insecure.error, MAPS_LINK_ERRORS.leftGoogle)

  const beforeLoop = calls
  const loop = await resolveMapsLink("https://goo.gl/maps/loop", { fetch: fetchImpl })
  assert.equal(loop.ok, false)
  assert.equal(loop.ok ? "" : loop.error, MAPS_LINK_ERRORS.tooMany)
  assert.equal(calls - beforeLoop, 5)

  const huge = await resolveMapsLink("https://maps.app.goo.gl/huge", { fetch: fetchImpl })
  assert.equal(huge.ok, false)
  assert.equal(huge.ok ? "" : huge.error, MAPS_LINK_ERRORS.tooLarge)

  const consent = await resolveMapsLink(
    "https://consent.google.com/m?continue=" +
      encodeURIComponent("https://www.google.com/maps/@18.5,73.8,15z"),
    { fetch: fetchImpl },
  )
  assert.equal(consent.ok && consent.kind === "coords" && consent.latitude, 18.5)

  const consentOff = await resolveMapsLink(
    "https://consent.google.com/m?continue=" + encodeURIComponent("https://evil.example/maps"),
    { fetch: fetchImpl },
  )
  assert.equal(consentOff.ok, false)
  assert.equal(consentOff.ok ? "" : consentOff.error, MAPS_LINK_ERRORS.leftGoogle)
})

test("rejects a consent.google.com continue URL that leaves Google", async () => {
  const off = await resolveMapsLink(
    "https://consent.google.com/m?continue=" + encodeURIComponent("https://evil.example/maps/@18.5,73.8,15z"),
  )
  assert.equal(off.ok, false)
  assert.equal(off.ok ? "" : off.error, MAPS_LINK_ERRORS.leftGoogle)

  const lookalike = await resolveMapsLink(
    "https://consent.google.com/m?continue=" +
      encodeURIComponent("https://google.com.evil.example/maps/@18.5,73.8,15z"),
  )
  assert.equal(lookalike.ok, false)
  assert.equal(lookalike.ok ? "" : lookalike.error, MAPS_LINK_ERRORS.leftGoogle)
})
