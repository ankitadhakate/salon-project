const BLOCKED_PASSWORDS = new Set([
  "admin-dev-pass",
  "demo-owner-dev",
  "password",
  "changeme",
  "admin",
])

const BLOCKED_SECRETS = new Set([
  "dev-secret-change-before-any-real-deploy",
  "replace-with-a-long-random-string",
  "build-time-placeholder-not-a-real-secret",
])

export function isProduction() {
  return process.env.NODE_ENV === "production"
}

/** Throws when a production process is using development defaults. */
export function assertProductionRuntime() {
  if (!isProduction()) return
  if (process.env.NEXT_PHASE === "phase-production-build") return

  const secret = process.env.AUTH_SECRET ?? ""
  if (secret.length < 32 || BLOCKED_SECRETS.has(secret)) {
    throw new Error("Set AUTH_SECRET to a unique random string of at least 32 characters.")
  }

  const databaseUrl = process.env.DATABASE_URL ?? ""
  if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
    throw new Error("Production DATABASE_URL must be a Postgres connection string.")
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? ""
  if (!origin.startsWith("https://")) {
    throw new Error("Set NEXT_PUBLIC_APP_URL to the public https origin, with no trailing path.")
  }

  if ((process.env.IMAGE_DRIVER ?? "") !== "s3") {
    throw new Error("Set IMAGE_DRIVER=s3 in production so uploaded photos are not stored on the app disk.")
  }

  const email = process.env.ADMIN_EMAIL?.trim() ?? ""
  const password = process.env.ADMIN_PASSWORD ?? ""
  if (!email.includes("@")) {
    throw new Error("Set ADMIN_EMAIL. The admin account is created from this address on first boot.")
  }
  if (password.length < 12 || BLOCKED_PASSWORDS.has(password)) {
    throw new Error(
      "Set ADMIN_PASSWORD to a unique password of at least 12 characters. The development password is rejected.",
    )
  }
}
