import { prisma } from "@/lib/db"

export async function getRequireApproval() {
  const row = await prisma.siteSetting.findUnique({
    where: { key: "requireApproval" },
  })
  if (!row) return process.env.AUTO_APPROVE_LISTINGS !== "true"
  return row.value !== "false"
}

export async function setRequireApproval(required: boolean) {
  await prisma.siteSetting.upsert({
    where: { key: "requireApproval" },
    create: { key: "requireApproval", value: required ? "true" : "false" },
    update: { value: required ? "true" : "false" },
  })
}
