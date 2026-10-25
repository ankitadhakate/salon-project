import { NextResponse } from "next/server"
import { isStatKind, recordPublicStat } from "@/lib/stats"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let body: { salonId?: unknown; kind?: unknown }
  try {
    body = (await request.json()) as { salonId?: unknown; kind?: unknown }
  } catch {
    return new Response(null, { status: 400 })
  }
  const salonId = typeof body.salonId === "string" ? body.salonId : ""
  const kind = typeof body.kind === "string" ? body.kind : ""
  if (!isStatKind(kind)) return new Response(null, { status: 400 })
  const result = await recordPublicStat(request, salonId, kind)
  return new NextResponse(null, {
    status: result.status,
    headers: { "Cache-Control": "private, no-store" },
  })
}
