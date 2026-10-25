import { Prisma } from "@prisma/client"
import { hashMagicToken } from "@/lib/auth"
import { prisma } from "@/lib/db"

export class ClaimError extends Error {}

async function completeClaimProof(proofId: string) {
  const proof = await prisma.claimProof.findUnique({
    where: { id: proofId },
    include: { invite: true },
  })
  if (!proof || proof.usedAt || proof.expiresAt < new Date()) {
    throw new ClaimError("That code has expired. Request a new one.")
  }
  if (proof.invite.usedAt || proof.invite.revokedAt || proof.invite.expiresAt < new Date()) {
    throw new ClaimError("This claim link has expired or was replaced. Ask for a new link.")
  }

  let userId = proof.userId ?? ""
  let role = "OWNER"

  try {
    await prisma.$transaction(async (tx) => {
      if (!userId) {
        if (proof.name.trim().length < 2 || !proof.passwordHash) {
          throw new ClaimError("Add your name and a password, then request a new code.")
        }
        const created = await tx.user.create({
          data: {
            name: proof.name,
            email: proof.email,
            passwordHash: proof.passwordHash,
            role: "OWNER",
          },
        })
        userId = created.id
        role = created.role
      } else {
        const user = await tx.user.findUnique({ where: { id: userId } })
        if (!user || user.role !== "OWNER") {
          throw new ClaimError("This email belongs to a different kind of account.")
        }
        const owned = await tx.salon.findUnique({ where: { ownerId: user.id } })
        if (owned) throw new ClaimError("This account already has a listing.")
        role = user.role
      }

      const now = new Date()
      const inviteResult = await tx.claimInvite.updateMany({
        where: {
          id: proof.inviteId,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      })
      const salonResult = await tx.salon.updateMany({
        where: { id: proof.invite.salonId, ownerId: null },
        data: { ownerId: userId },
      })
      const proofResult = await tx.claimProof.updateMany({
        where: { id: proof.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      })
      if (inviteResult.count !== 1 || salonResult.count !== 1 || proofResult.count !== 1) {
        throw new ClaimError("This listing was just claimed. Log in if it was you.")
      }
    })
  } catch (error) {
    if (error instanceof ClaimError) throw error
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ClaimError(
        "That email is already registered. Request a new code and use that account's password.",
      )
    }
    throw new ClaimError("This listing was just claimed. Log in if it was you.")
  }

  return { userId, role }
}

export async function completeClaimByToken(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw new ClaimError("This confirmation link is not valid.")
  }
  const proof = await prisma.claimProof.findUnique({
    where: { tokenHash: hashMagicToken(token) },
    select: { id: true },
  })
  if (!proof) throw new ClaimError("This confirmation link is not valid.")
  return completeClaimProof(proof.id)
}

export async function completeClaimByCode(inviteId: string, code: string) {
  if (!/^\d{6}$/.test(code)) {
    throw new ClaimError("Enter the 6-digit code from the email.")
  }
  const proof = await prisma.claimProof.findFirst({
    where: {
      inviteId,
      codeHash: hashMagicToken(code),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })
  if (!proof) {
    throw new ClaimError("That code doesn't match. Check the email or request a new one.")
  }
  return completeClaimProof(proof.id)
}
