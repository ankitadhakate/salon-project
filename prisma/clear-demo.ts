import { rm } from "node:fs/promises"
import path from "node:path"
import { loadEnv } from "./load-env"

loadEnv()

async function main() {
  const { prisma } = await import("../lib/db")
  const salons = await prisma.salon.deleteMany({ where: { isDemo: true } })
  const users = await prisma.user.deleteMany({ where: { isDemo: true } })
  await rm(path.join(process.cwd(), "public", "demo"), { recursive: true, force: true })
  console.log(`Removed ${salons.count} sample listings and ${users.count} sample users.`)
  console.log("Localities, real owner accounts, and the admin account were left in place.")
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
