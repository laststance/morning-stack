"use client";

import type { Session } from "next-auth";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * Seeds Auth.js client context from a server-resolved session whenever a route-group layout renders shared account controls.
 * @param props - Provider props passed by the Home page or shared site layout.
 * @param props.children - Client and server-rendered descendants that consume Auth.js context.
 * @param props.session - Server-resolved session, or null for a confirmed signed-out or unavailable auth state.
 * @returns Auth.js context that avoids a redundant client session request on first render.
 * @example
 * <SessionProvider session={null}><Header /></SessionProvider>
 */
export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    /* The server snapshot remains authoritative until an explicit sign-in/out action refreshes the route. */
    <NextAuthSessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </NextAuthSessionProvider>
  );
}
