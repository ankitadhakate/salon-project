import { getSessionUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

/** Session chrome for the header. Never cache this: the public HTML must not contain it. */
export async function GET() {
  const user = await getSessionUser()
  return Response.json(
    { user: user ? { role: user.role } : null },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
