import { Header } from "@/components/layout/header";
import { TickerWrapper } from "@/components/layout/ticker-wrapper";
import { SessionProvider } from "@/components/session-provider";
import { auth } from "@/lib/auth";

/**
 * Keeps normal live chrome on public/account pages after HomePage takes ownership of date-dependent ticker visibility.
 * @param props - Route-group layout props supplied by Next.js.
 * @param props.children - About, login, bookmarks, or settings page content.
 * @returns Site page content below the live stock ticker and standard Header.
 * @example
 * <SiteLayout><main>About</main></SiteLayout>
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Public site pages stay readable when optional personalization is unavailable.
  const session = await auth().catch(() => {
    console.error("[SiteLayout] Session unavailable");
    return null;
  });

  return (
    <SessionProvider session={session}>
      <TickerWrapper />
      <Header />
      {children}
    </SessionProvider>
  );
}
