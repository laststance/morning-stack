# MorningStack

MorningStack is a twice-daily tech briefing for developers. It collects high-signal engineering news, repositories, pull requests, social posts, and launch data into a morning/evening edition, then lets signed-in users bookmark or hide content to personalize their feed.

## Production

| Key | Value |
| --- | --- |
| Production URL | https://morning-stack.vercel.app/ |
| GitHub Repo | https://github.com/laststance/morning-stack |
| Vercel Team | Laststance |
| Vercel Project ID | `prj_Vz9ktJheiReGK5XcVBHRJkgQh3IC` |

## Core Product Spec

- Public visitors can read the latest published Morning or Evening edition.
- The home page chooses the current edition by Asia/Tokyo time: before 12:00 JST shows Morning, 12:00+ JST shows Evening.
- If today's matching edition does not exist yet, the app falls back to the latest published edition.
- Historical editions are addressable by `?date=YYYY-MM-DD&edition=morning|evening` and render persisted articles only, without live weather, stocks, or ticker data.
- Dates earlier than the archive redirect to its earliest published date while preserving the requested Morning or Evening edition.
- Signed-in users can bookmark articles, hide specific articles, hide entire sources, and hide topic keywords.
- The Settings page lets signed-in users view account information, manage hidden items, choose display preferences, and sign out.
- Auth is optional for reading. Public feed rendering should continue even if personalization is unavailable.

## Update Schedule

MorningStack uses Vercel Cron Jobs in `vercel.json`. Vercel cron schedules are written in UTC, while MorningStack editions are dated and selected in JST.

| Edition | Vercel Path | UTC Schedule | JST Time | Purpose |
| --- | --- | --- | --- | --- |
| Morning | `/api/cron/collect/morning` | `0 21 * * *` | 06:00 JST daily | Publish the morning briefing for the new JST day. |
| Evening | `/api/cron/collect/evening` | `0 8 * * *` | 17:00 JST daily | Publish the evening briefing for the same JST day. |

Manual collection is also available through the cron endpoints when authorized with `CRON_SECRET`.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://morning-stack.vercel.app/api/cron/collect/morning

curl -H "Authorization: Bearer $CRON_SECRET" \
  https://morning-stack.vercel.app/api/cron/collect/evening
```

The collector is idempotent for already published editions. A second run for the same edition/date returns `skipped` instead of duplicating articles.

## News Sources

The collector fetches sources in parallel, normalizes source-specific scores to a 0-100 scale, keeps the top N items per source, and publishes them into an `editions` row with related `articles`.

| Source ID | Surface | What It Collects | Count |
| --- | --- | --- | --- |
| `hackernews` | Hacker News section | Front-page Hacker News stories via HN Algolia. | 5 |
| `github` | GitHub section | GitHub repositories created in the last 7 days, sorted by stars. | 5 |
| `github_prs` | GitHub Pull Requests section | Recent open or merged PRs from `facebook/react` and `vercel/next.js`. | 10 |
| `reddit` | Reddit section | Hot posts from `r/programming`, `r/webdev`, `r/javascript`, and `r/typescript`. | 5 |
| `tech_rss` | Tech News section | Recent RSS items from The Verge, Ars Technica, and TechCrunch. | 5 |
| `hatena` | Hatena Bookmark section | Hot technology entries from Hatena Bookmark. | 5 |
| `bluesky` | SNS section | Top Bluesky posts matching broad tech/programming terms. | 3 |
| `youtube` | SNS section | Most popular US Science & Technology videos from YouTube Data API v3. | 3 |
| `producthunt` | Collected data source | Today's top Product Hunt launches by votes. | 5 |
| `world_news` | Reserved UI/source type | Type and UI support exist, but no active collector is wired yet. | 5 target |

Widget data is collected alongside editions:

| Widget | Source | Notes |
| --- | --- | --- |
| Weather | Open-Meteo Forecast API | No API key required. Cached in Redis when configured and persisted to Supabase `weather_cache`. |
| Stocks | Yahoo Finance chart endpoint | Fetches Nikkei 225, S&P 500, and NASDAQ. Cached in Redis when configured and persisted to Supabase `stock_cache`. |

## Data Flow

1. Vercel Cron calls one fixed edition endpoint.
2. The route checks `CRON_SECRET` when configured.
3. The collector computes the JST date and target edition type.
4. Existing published editions are skipped.
5. Failed draft editions are reused after clearing partial articles.
6. External sources are fetched in parallel.
7. Scores are normalized and top items are selected.
8. Articles are inserted into Supabase Postgres through Drizzle.
9. The edition is marked `published`.
10. Weather and stock widget data is cached through Upstash Redis when available and persisted to Supabase widget cache tables as a durable fallback.

## Auth And Personalization

MorningStack uses Auth.js v5 with the Drizzle adapter and Supabase Postgres tables for users, accounts, sessions, and verification tokens.

OAuth provider buttons are shown only when the matching credential pair is configured:

| Provider | Required Environment Variables |
| --- | --- |
| GitHub | `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` |
| Google | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` |

When no provider is configured, `/login` shows a temporary unavailable state instead of broken sign-in buttons.

Signed-in features:

- Bookmark or unbookmark any article.
- Open `/bookmarks` to see saved articles.
- Hide a single article.
- Hide all articles from a source.
- Hide articles whose title matches a topic keyword.
- Open `/settings` to unhide items and manage display preferences.

## Tech Stack

- Next.js 16 App Router, React 19, TypeScript 5.9
- Tailwind CSS v4, shadcn/ui, Radix UI, lucide-react
- Auth.js v5, Drizzle ORM, Supabase Postgres
- Upstash Redis for source/widget caching
- Redux Toolkit for client UI state
- Playwright for browser tests
- pnpm and Turbopack dev server

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Required | Supabase Postgres connection string used by Drizzle and Auth.js. |
| `AUTH_SECRET` | Required | Auth.js session/signing secret. |
| `AUTH_TRUST_HOST` | Required on Vercel | Allows Auth.js to trust the Vercel host/proxy environment. |
| `CRON_SECRET` | Strongly recommended | Protects manual and scheduled cron collection endpoints. |
| `AUTH_GITHUB_ID` | Optional provider pair | Enables GitHub OAuth when paired with `AUTH_GITHUB_SECRET`. |
| `AUTH_GITHUB_SECRET` | Optional provider pair | Enables GitHub OAuth when paired with `AUTH_GITHUB_ID`. |
| `AUTH_GOOGLE_ID` | Optional provider pair | Enables Google OAuth when paired with `AUTH_GOOGLE_SECRET`. |
| `AUTH_GOOGLE_SECRET` | Optional provider pair | Enables Google OAuth when paired with `AUTH_GOOGLE_ID`. |
| `UPSTASH_REDIS_REST_URL` | Optional | Enables Redis cache reads/writes. |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Authenticates Upstash Redis REST requests. |
| `GITHUB_TOKEN` | Optional | Raises GitHub API rate limits for PR collection. |
| `YOUTUBE_API_KEY` | Optional | Enables YouTube Science & Technology video collection. |
| `PRODUCTHUNT_API_TOKEN` | Optional | Enables Product Hunt launch collection. |

Sources that require optional API keys degrade gracefully by returning cached data or an empty result.

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the development server on port 3199:

```bash
pnpm dev
```

Before starting the server during agent work, clear the port first:

```bash
kill-port 3199
```

Database tasks:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:push
```

Quality gates:

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run test:e2e
```

## Main Routes

| Route | Access | Description |
| --- | --- | --- |
| `/` | Public | Current or exact historical Morning/Evening briefing; live widgets appear only for the current view. |
| `/about` | Public | Product overview. |
| `/login` | Public | OAuth sign-in entry point or unavailable state when providers are not configured. |
| `/bookmarks` | Signed in | Saved articles. |
| `/settings` | Signed in | Account, hidden items, and display preferences. |
| `/api/cron/collect` | Secret-protected when configured | Manual current-edition collector based on JST time. |
| `/api/cron/collect/morning` | Secret-protected when configured | Fixed Morning collector for Vercel Cron. |
| `/api/cron/collect/evening` | Secret-protected when configured | Fixed Evening collector for Vercel Cron. |

## Persistence Model

- `editions`: one unique Morning/Evening row per JST date, with draft or published status.
- `articles`: normalized external content linked to an edition.
- `users`, `accounts`, `sessions`, `verification_tokens`: Auth.js persistence.
- `bookmarks`: user-to-article saved items.
- `hidden_items`: user-specific article/source/topic filters.
- `weather_cache`, `stock_cache`: widget cache tables, with Redis used for latest widget payloads.
