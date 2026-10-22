export function appBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3847"
  try {
    return new URL(raw).origin
  } catch {
    return "http://127.0.0.1:3847"
  }
}

export function appUrl(path: string) {
  const base = appBaseUrl()
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

export function safeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return ""
  }
  return value
}
