import { redirect } from "next/navigation"

export default async function LoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const sp = await searchParams
  const params = new URLSearchParams()
  if (sp.next) params.set("next", sp.next)
  if (sp.error) params.set("error", sp.error)
  const query = params.toString()
  redirect(query ? `/partner/login?${query}` : "/partner/login")
}
