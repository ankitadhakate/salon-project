import { NextResponse, type NextRequest } from "next/server"
import { allowIndexing } from "@/lib/indexing"
import { readSessionToken, SESSION_COOKIE } from "@/lib/session-token"

function withRobots(response: NextResponse) {
  if (!allowIndexing()) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  }
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const gated = pathname.startsWith("/dashboard") || pathname.startsWith("/admin")
  if (!gated) return withRobots(NextResponse.next())

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const login = new URL("/login", request.url)
  login.searchParams.set("next", pathname)

  if (!token) return withRobots(NextResponse.redirect(login))

  try {
    const session = await readSessionToken(token)
    if (!session) {
      const response = NextResponse.redirect(login)
      response.cookies.delete(SESSION_COOKIE)
      return withRobots(response)
    }
    if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
      return withRobots(NextResponse.redirect(new URL("/", request.url)))
    }
    return withRobots(NextResponse.next())
  } catch {
    const response = NextResponse.redirect(login)
    response.cookies.delete(SESSION_COOKIE)
    return withRobots(response)
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|uploads/|demo/).*)"],
}
