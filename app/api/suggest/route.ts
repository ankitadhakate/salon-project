import { searchSuggestions } from "@/lib/suggest"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? ""
  const hits = await searchSuggestions(query)
  return Response.json({ hits })
}
