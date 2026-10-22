import { redirect } from "next/navigation"

export default async function PartnerJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; error?: string }>
}) {
  const sp = await searchParams
  const ref = sp.ref?.trim() ?? ""
  const params = new URLSearchParams()
  if (/^[A-Za-z0-9-]{1,32}$/.test(ref)) params.set("ref", ref)
  if (sp.error) params.set("error", sp.error.slice(0, 200))
  const query = params.toString()
  redirect(query ? `/partner/setup?${query}` : "/partner/setup")
}
