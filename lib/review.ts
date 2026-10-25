import { prisma } from "@/lib/db"
import { sendContactChangeMail, smtpConfigured } from "@/lib/mail"

export const OWNER_REVIEW_MS = 30 * 24 * 60 * 60 * 1000

const CONTACT_FIELDS = new Set(["phone", "whatsapp"])

export function reviewNotice(base: string, queued: boolean) {
  if (!queued) return base
  return `${base} It is in review, so customers will not see the listing until it is approved.`
}

export async function auditListing(opts: {
  salonId: string
  actorId: string
  status: string
  sensitive: boolean
  changes: { field: string; oldValue: string; newValue: string }[]
}) {
  const changed = opts.changes.filter((row) => row.oldValue !== row.newValue)
  if (!changed.length) return { queued: false }

  await prisma.listingAudit.createMany({
    data: changed.map((row) => ({
      salonId: opts.salonId,
      actorId: opts.actorId,
      field: row.field.slice(0, 40),
      oldValue: row.oldValue.slice(0, 4000),
      newValue: row.newValue.slice(0, 4000),
    })),
  })

  const contactChanges = changed.filter(
    (row) => CONTACT_FIELDS.has(row.field) && row.oldValue.trim() !== "",
  )
  if (contactChanges.length && smtpConfigured()) {
    const [actor, salon] = await Promise.all([
      prisma.user.findUnique({ where: { id: opts.actorId }, select: { email: true } }),
      prisma.salon.findUnique({ where: { id: opts.salonId }, select: { name: true } }),
    ])
    if (actor?.email && salon) {
      const lines = contactChanges.map((row) => {
        const label = row.field === "whatsapp" ? "WhatsApp" : "Phone"
        return row.newValue.trim()
          ? `${label} is now ${row.newValue.trim()}.`
          : `${label} was removed.`
      })
      try {
        await sendContactChangeMail(actor.email, salon.name, lines)
      } catch (error) {
        console.error(error)
      }
    }
  }

  const actor = await prisma.user.findUnique({
    where: { id: opts.actorId },
    select: { createdAt: true },
  })
  const early = Boolean(actor && Date.now() - actor.createdAt.getTime() < OWNER_REVIEW_MS)
  const queued = opts.status === "LIVE" && (opts.sensitive || early)
  if (queued) {
    await prisma.salon.update({ where: { id: opts.salonId }, data: { status: "PENDING" } })
  }
  return { queued }
}
