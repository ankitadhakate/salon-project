"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { setRequireApproval } from "@/lib/settings"

async function requireAdmin() {
  const user = await getSessionUser()
  if (!user) redirect("/login?next=/admin")
  if (user.role !== "ADMIN") redirect("/")
  return user
}

function adminRedirect(opts: { notice?: string; error?: string }): never {
  const params = new URLSearchParams()
  if (opts.notice) params.set("notice", opts.notice)
  if (opts.error) params.set("error", opts.error)
  redirect(`/admin?${params.toString()}`)
}

export async function setListingStatus(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const status = String(formData.get("status") ?? "")
  if (status !== "LIVE" && status !== "HIDDEN" && status !== "PENDING") {
    adminRedirect({ error: "Unknown status." })
  }
  const salon = await prisma.salon.findUnique({ where: { id } })
  if (!salon) adminRedirect({ error: "That listing no longer exists." })
  await prisma.salon.update({ where: { id }, data: { status } })
  revalidatePath("/")
  revalidatePath("/pune")
  revalidatePath(`/pune/${salon.areaSlug}`)
  revalidatePath(`/pune/${salon.areaSlug}/${salon.slug}`)
  revalidatePath("/admin")
  revalidatePath("/sitemap.xml")
  const notice =
    status === "LIVE" ? "Listing is live." : status === "HIDDEN" ? "Listing hidden." : "Marked pending."
  adminRedirect({ notice })
}

export async function updateApprovalMode(formData: FormData) {
  await requireAdmin()
  const required = formData.get("requireApproval") === "on"
  await setRequireApproval(required)
  revalidatePath("/admin")
  adminRedirect({
    notice: required
      ? "New submissions wait for approval."
      : "New submissions go live as soon as the owner submits.",
  })
}
