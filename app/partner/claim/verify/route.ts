import { NextResponse } from "next/server"
import { createSession } from "@/lib/auth"
import { ClaimError, completeClaimByToken } from "@/lib/claim"
import { actionClientIp, limitClaim } from "@/lib/rate-limit"
import { appUrl } from "@/lib/urls"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? ""
  const allowed = await limitClaim(await actionClientIp(), token || "invalid")
  if (!allowed) {
    return NextResponse.redirect(
      appUrl("/partner/login?error=" + encodeURIComponent("Too many attempts. Wait an hour and try again.")),
    )
  }
  try {
    const user = await completeClaimByToken(token)
    await createSession(user.userId, user.role)
  } catch (error) {
    const message = error instanceof ClaimError ? error.message : "This confirmation link is not valid."
    return NextResponse.redirect(appUrl("/partner/login?error=" + encodeURIComponent(message)))
  }
  return NextResponse.redirect(
    appUrl("/partner?notice=" + encodeURIComponent("You claimed the listing. Edit it, then submit it for review.")),
  )
}
