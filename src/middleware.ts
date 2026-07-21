import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/portal-auth";

const PUBLIC_PATHS = ["/login"];
const PUBLIC_API = ["/api/auth/login", "/api/auth/logout", "/api/auth/me"];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (PUBLIC_API.some((p) => pathname === p)) return true;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg")
  ) {
    return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    if (pathname === "/login") {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      if (verifySessionToken(token)) {
        return NextResponse.redirect(new URL("/clientes", request.url));
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
