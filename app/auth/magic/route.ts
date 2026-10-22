import { redirect } from "next/navigation"
import { signInFromMagicToken } from "@/app/auth/actions"

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? ""
  const user = await signInFromMagicToken(token)
  if (!user) {
    redirect("/login?error=" + encodeURIComponent("That sign-in link is invalid or expired."))
  }
  redirect(user.role === "ADMIN" ? "/admin" : "/dashboard")
}
