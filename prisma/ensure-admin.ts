import bcrypt from "bcryptjs"
import { loadEnv } from "./load-env"

loadEnv()

async function main() {
  const { assertProductionRuntime, isProduction } = await import("../lib/production")
  if (isProduction()) assertProductionRuntime()
  const { prisma } = await import("../lib/db")
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || ""
  if (!adminEmail.includes("@") || adminPassword.length < 8) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD. This script creates the admin only. It does not load sample salons.")
  }
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: process.env.ADMIN_NAME || "Admin",
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: "ADMIN",
      },
    })
    console.log(`Created admin ${adminEmail}`)
  } else if (existing.role !== "ADMIN") {
    throw new Error(
      `Refusing to change ${adminEmail} into an admin. That email already has a ${existing.role} account.`,
    )
  } else {
    console.log(`Admin ${adminEmail} already exists. The password was not changed.`)
  }
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  process.exit(1)
})
