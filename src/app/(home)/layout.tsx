import { Noto_Serif_JP } from "next/font/google";
import type { ReactNode } from "react";

const editorialDisplayFont = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

/**
 * Scopes the bilingual display font to Home whenever the App Router renders the editorial briefing group.
 * @param props - Home route-group layout props supplied by Next.js.
 * @param props.children - Home briefing chrome and content that may use the display font variable.
 * @returns Home content with its route-local editorial font variable.
 * @example
 * <HomeLayout><main>Briefing</main></HomeLayout>
 */
export default function HomeLayout({ children }: { children: ReactNode }) {
  return <div className={editorialDisplayFont.variable}>{children}</div>;
}
