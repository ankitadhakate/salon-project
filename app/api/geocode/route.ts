import { appBaseUrl } from "@/lib/urls"
import { siteName } from "@/lib/site"

export const dynamic = "force-dynamic"

type NominatimRow = { display_name?: string; lat?: string; lon?: string }

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (query.length < 3 || query.length > 160) {
    return Response.json({ results: [] })
  }
  const endpoint = process.env.GEOCODER_URL || "https://nominatim.openstreetmap.org/search"
  const url = new URL(endpoint)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("limit", "5")
  url.searchParams.set("q", query)
  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": `${siteName()} salon directory (${appBaseUrl()})`,
      },
      next: { revalidate: 60 * 60 },
    })
  } catch {
    return Response.json({ results: [], error: "Address search is unavailable right now." }, { status: 502 })
  }
  if (!response.ok) {
    return Response.json({ results: [], error: "Address search is unavailable right now." }, { status: 502 })
  }
  const rows = (await response.json()) as NominatimRow[]
  const results = rows
    .map((row) => ({
      label: (row.display_name ?? "").slice(0, 180),
      latitude: Number(row.lat),
      longitude: Number(row.lon),
    }))
    .filter((row) => row.label && Number.isFinite(row.latitude) && Number.isFinite(row.longitude))
  return Response.json({ results })
}
