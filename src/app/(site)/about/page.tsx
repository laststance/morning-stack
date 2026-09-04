import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// ─── Metadata ───────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about MorningStack — a next-generation news aggregation service for tech professionals delivering curated news twice daily.",
};

// ─── Data Sources ───────────────────────────────────────────────────

const DATA_SOURCES = [
  { name: "Hacker News", desc: "Top stories from the tech community", icon: "🔶" },
  { name: "GitHub", desc: "Trending repositories and open source projects", icon: "🐙" },
  { name: "Reddit", desc: "Hot posts from r/programming, r/webdev, and more", icon: "🤖" },
  { name: "Tech RSS", desc: "Curated articles from The Verge, Ars Technica, TechCrunch", icon: "📰" },
  { name: "Hatena Bookmark", desc: "Popular entries from the Japanese tech community", icon: "📌" },
  { name: "Bluesky", desc: "Trending discussions from the decentralized social network", icon: "🦋" },
  { name: "YouTube", desc: "Trending tech and science videos", icon: "🎬" },
  { name: "Product Hunt", desc: "Today's top product launches", icon: "🚀" },
] as const;

const KEY_FEATURES = [
  { title: "Twice-Daily Editions", desc: "Morning and evening editions curated automatically so you never miss what matters." },
  { title: "Multi-Source Aggregation", desc: "Eight active platforms spanning code, community, social, video, and product launches." },
  { title: "Smart Scoring", desc: "Normalized engagement scores surface the most impactful stories across all sources." },
  { title: "Personalization", desc: "Bookmark articles, hide sources or topics, and tailor your feed over time." },
  { title: "Weather & Markets", desc: "At-a-glance weather and stock index widgets to start your day informed." },
  { title: "Dark-First Design", desc: "Built for comfort with a dark-first theme and full light mode support." },
] as const;

// ─── Page Component ─────────────────────────────────────────────────

/**
 * Renders the static product vision, active source list, team details, and primary CTA for `/about`.
 * @returns The server-rendered About page without database or client-state dependencies.
 * @example
 * <AboutPage />
 */
export default function AboutPage() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8">
      {/* ── Hero / Vision ─────────────────────────────────── */}
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ms-text-primary sm:text-4xl">
          Your morning briefing, curated.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ms-text-secondary">
          MorningStack is a next-generation news aggregation service for tech
          professionals. We deliver curated news twice daily — a morning edition
          to start your day and an evening edition to catch up — from the
          sources that matter most.
        </p>
      </section>

      {/* ── Key Features ──────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="text-center text-2xl font-bold text-ms-text-primary">
          Key Features
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {KEY_FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-ms-border bg-ms-bg-secondary p-6"
            >
              <h3 className="text-base font-semibold text-ms-text-primary">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ms-text-secondary">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Data Sources ──────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="text-center text-2xl font-bold text-ms-text-primary">
          Data Sources
        </h2>
        <p className="mt-2 text-center text-sm text-ms-text-secondary">
          We aggregate content from eight active platforms to give you the full picture.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DATA_SOURCES.map((s) => (
            <div
              key={s.name}
              className="flex items-start gap-3 rounded-lg border border-ms-border bg-ms-bg-secondary p-4"
            >
              <span className="text-2xl" role="img" aria-hidden="true">
                {s.icon}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ms-text-primary">
                  {s.name}
                </h3>
                <p className="mt-0.5 text-xs text-ms-text-muted">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Team ──────────────────────────────────────────── */}
      <section className="mt-16 text-center">
        <h2 className="text-2xl font-bold text-ms-text-primary">Team</h2>
        <p className="mt-2 text-sm leading-relaxed text-ms-text-secondary">
          MorningStack is built by{" "}
          <a
            href="https://github.com/laststance"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ms-accent underline underline-offset-4 hover:text-ms-accent/80"
          >
            Laststance.io
          </a>{" "}
          — a small team passionate about developer experience and information
          design. We believe staying informed shouldn&apos;t feel like a chore.
        </p>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="mt-16 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="cursor-pointer">
          <Link href="/">Go to Home Page</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="cursor-pointer">
          <Link href="/login">Sign Up</Link>
        </Button>
      </section>
    </main>
  );
}
