import { searchPlaces } from "@/lib/geocode"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? ""
  const found = await searchPlaces(query)
  if (found.error) {
    return Response.json({ results: [], error: found.error }, { status: found.status })
  }
  return Response.json({ results: found.results })
}
