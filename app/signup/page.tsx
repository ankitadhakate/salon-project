import { redirect } from "next/navigation"

export default async function SignupRedirect({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string }>
}) {
  const sp = await searchParams
  const params = new URLSearchParams()
  params.set("step", "account")
  if (sp.ref && /^[A-Za-z0-9-]{1,32}$/.test(sp.ref)) params.set("ref", sp.ref)
  if (sp.error) params.set("error", sp.error)
  redirect(`/partner/setup?${params.toString()}`)
}
