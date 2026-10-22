import { redirect } from "next/navigation"
import { signInFromMagicToken } from "@/app/auth/actions"
import { getOwnerSalon } from "@/lib/salons"

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? ""
  const user = await signInFromMagicToken(token)
  if (!user) {
    redirect("/partner/login?error=" + encodeURIComponent("That sign-in link is invalid or expired."))
  }
  if (user.role === "ADMIN") redirect("/admin")
  const salon = await getOwnerSalon(user.id)
  redirect(salon ? "/partner" : "/partner/setup?step=salon")
}
