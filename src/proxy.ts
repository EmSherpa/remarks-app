import { NextRequest, NextResponse } from "next/server";

// No real auth system for an MVP of one. A single shared password, checked
// against a cookie. Replace with proper auth if this ever becomes multi-user.
export function proxy(req: NextRequest) {
  const auth = req.cookies.get("app_auth")?.value;
  if (auth === process.env.APP_PASSWORD) return NextResponse.next();

  if (req.nextUrl.pathname === "/login") return NextResponse.next();

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};