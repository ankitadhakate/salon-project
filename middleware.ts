import { NextResponse, type NextRequest } from "next/server"
import { cacheControlFor } from "@/lib/cache-control"
import { allowIndexing } from "@/lib/indexing"
import { readSessionToken, SESSION_COOKIE } from "@/lib/session-token"

function withRobots(response: NextResponse, request: NextRequest) {
  if (!allowIndexing()) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  }
  const preview = request.nextUrl.searchParams.get("preview") === "1"
  response.headers.set(
    "Cache-Control",
    cacheControlFor({
      method: request.method,
      pathname: request.nextUrl.pathname,
      hasSession: Boolean(request.cookies.get(SESSION_COOKIE)?.value),
      preview,
    }),
  )
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const gated = pathname.startsWith("/admin") || pathname.startsWith("/partner/edit")
  if (!gated) return withRobots(NextResponse.next(), request)

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const login = new URL("/partner/login", request.url)
  login.searchParams.set("next", pathname)

  if (!token) return withRobots(NextResponse.redirect(login), request)

  try {
    const session = await readSessionToken(token)
    if (!session) {
      const response = NextResponse.redirect(login)
      response.cookies.delete(SESSION_COOKIE)
      return withRobots(response, request)
    }
    if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
      return withRobots(NextResponse.redirect(new URL("/", request.url)), request)
    }
    return withRobots(NextResponse.next(), request)
  } catch {
    const response = NextResponse.redirect(login)
    response.cookies.delete(SESSION_COOKIE)
    return withRobots(response, request)
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|uploads/|demo/).*)"],
}
