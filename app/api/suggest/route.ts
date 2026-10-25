import { SUGGEST_CACHE } from "@/lib/cache-control"
import { searchSuggestions } from "@/lib/suggest"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80)
  const headers = { "Cache-Control": SUGGEST_CACHE }
  if (query.length < 2) return Response.json({ hits: [] }, { headers })
  const hits = await searchSuggestions(query)
  return Response.json({ hits }, { headers })
}
