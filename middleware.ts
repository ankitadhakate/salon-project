import { NextResponse, type NextRequest } from "next/server"
import { readSessionToken, SESSION_COOKIE } from "@/lib/session-token"

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const login = new URL("/login", request.url)
  login.searchParams.set("next", request.nextUrl.pathname)

  if (!token) return NextResponse.redirect(login)

  try {
    const session = await readSessionToken(token)
    if (!session) {
      const response = NextResponse.redirect(login)
      response.cookies.delete(SESSION_COOKIE)
      return response
    }
    if (request.nextUrl.pathname.startsWith("/admin") && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(login)
    response.cookies.delete(SESSION_COOKIE)
    return response
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
}
