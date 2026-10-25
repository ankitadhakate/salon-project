import { getSessionUser } from "@/lib/auth"
import { searchPlaces } from "@/lib/geocode"
import { MAPS_LINK_ERRORS, resolveMapsLink } from "@/lib/maps-link"
import { limitMapsLink } from "@/lib/rate-limit"
import { clientIpFromRequest, originAllowed } from "@/lib/request-guards"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ error: "Sign in to paste a Maps link." }, { status: 401 })
  }
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    return Response.json({ error: "Only a salon owner can paste a Maps link." }, { status: 403 })
  }
  if (!originAllowed(request)) {
    return Response.json({ error: "Open this page on the site and try the link again." }, { status: 403 })
  }

  const allowed = await limitMapsLink(clientIpFromRequest(request), user.id)
  if (!allowed) {
    return Response.json(
      { error: "Too many Maps links just now. Wait a few minutes, or search the address." },
      { status: 429 },
    )
  }

  let body: { url?: unknown }
  try {
    body = (await request.json()) as { url?: unknown }
  } catch {
    return Response.json({ error: MAPS_LINK_ERRORS.notMaps }, { status: 400 })
  }
  const url = typeof body.url === "string" ? body.url : ""
  const resolved = await resolveMapsLink(url)
  if (!resolved.ok) return Response.json({ error: resolved.error }, { status: 400 })

  if (resolved.kind === "coords") {
    return Response.json({
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      mapsUrl: resolved.mapsUrl,
    })
  }

  if (resolved.kind !== "place") {
    return Response.json({ error: MAPS_LINK_ERRORS.noPin }, { status: 400 })
  }

  const found = await searchPlaces(resolved.placeQuery)
  if (found.error) {
    return Response.json(
      { error: "Address search is unavailable right now. Search the street, or drag the pin." },
      { status: 502 },
    )
  }
  const hit = found.results[0]
  if (!hit) {
    return Response.json(
      { error: "No place matched that Maps link. Search the street and city, or drag the pin." },
      { status: 400 },
    )
  }
  return Response.json({
    latitude: hit.latitude,
    longitude: hit.longitude,
    mapsUrl: resolved.mapsUrl,
  })
}
