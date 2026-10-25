import { appBaseUrl } from "@/lib/urls"

/** Trusted proxies appended on the right of X-Forwarded-For. Default 2: Firebase Hosting and the Google Front End. */
export function trustProxyHops() {
  const raw = process.env.TRUST_PROXY_HOPS
  if (raw === undefined || raw.trim() === "") return 2
  const hops = Number(raw)
  if (!Number.isInteger(hops) || hops < 0 || hops > 10) return 2
  return hops
}

function clipIp(value: string) {
  const trimmed = value.trim()
  return trimmed.slice(0, 80) || "unknown"
}

export function clientIpFromHeaders(headerStore: { get(name: string): string | null }) {
  const hops = trustProxyHops()
  const forwarded = headerStore.get("x-forwarded-for")
  if (forwarded && hops > 0) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean)
    // The rightmost `hops` entries are proxies we trust. The client is the address just to their left.
    // When the list is only those hops, that client slot is missing and the leftmost trusted hop is used.
    // Fewer entries than that are not a full trusted suffix, so the leftmost value is ignored.
    if (parts.length > hops) return clipIp(parts[parts.length - hops - 1] ?? "")
    if (parts.length === hops) return clipIp(parts[0] ?? "")
  }
  return clipIp(headerStore.get("x-real-ip") || "unknown")
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
