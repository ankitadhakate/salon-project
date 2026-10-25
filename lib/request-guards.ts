import { appBaseUrl } from "@/lib/urls"

export function clientIpFromHeaders(headerStore: { get(name: string): string | null }) {
  const forwarded = headerStore.get("x-forwarded-for")
  const raw = forwarded
    ? forwarded.split(",")[0]!.trim()
    : headerStore.get("x-real-ip") || "unknown"
  return raw.slice(0, 80) || "unknown"
}

export function clientIpFromRequest(request: Request) {
  return clientIpFromHeaders(request.headers)
}

/** Same-origin only. A missing Origin is rejected so a random site cannot post stats. */
export function originAllowed(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return false
  let host = ""
  try {
    host = new URL(origin).host
  } catch {
    return false
  }
  try {
    if (new URL(appBaseUrl()).host === host) return true
  } catch {
    // Ignore a malformed public origin and fall through to the request host.
  }
  const requestHost = request.headers.get("x-forwarded-host") || request.headers.get("host")
  return Boolean(requestHost && requestHost.split(",")[0]!.trim() === host)
}

export function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? ""
  for (const part of header.split(";")) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(`${name}=`)) continue
    try {
      return decodeURIComponent(trimmed.slice(name.length + 1))
    } catch {
      return ""
    }
  }
  return ""
}
