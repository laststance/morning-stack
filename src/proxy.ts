import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Protects only bookmarks/settings at the Next 16 Proxy boundary so public current/historical Home requests never require auth.
 * @param request - Auth.js-decorated protected-route request.
 * @returns Login redirect preserving the full protected URL, or continuation for authenticated users.
 * @example
 * proxy(request)
 */
export const proxy = auth((request) => {
  if (!request.auth) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/bookmarks/:path*", "/settings/:path*"],
};
