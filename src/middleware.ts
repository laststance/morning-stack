import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Auth middleware that protects /bookmarks and /settings routes.
 * Unauthenticated users are redirected to /login with a callbackUrl
 * so they return after signing in.
 */
export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/bookmarks/:path*", "/settings/:path*"],
};
