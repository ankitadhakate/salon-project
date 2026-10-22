import { redirect } from "next/navigation"

export default async function DashboardRedirect({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>
}) {
  const sp = await searchParams
  const params = new URLSearchParams()
  if (sp.notice) params.set("notice", sp.notice)
  if (sp.error) params.set("error", sp.error)
  const query = params.toString()
  redirect(query ? `/partner?${query}` : "/partner")
}
