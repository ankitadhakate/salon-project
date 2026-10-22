export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { assertProductionRuntime } = await import("@/lib/production")
  assertProductionRuntime()
}
