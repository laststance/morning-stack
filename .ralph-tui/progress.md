# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Tailwind v4 CSS-first config**: Design tokens are defined in `src/app/globals.css` using `@theme inline` and CSS custom properties with OKLCH color model. No `tailwind.config.ts` exists.
- **shadcn/ui v3.8+**: Uses `components.json` at root, components go in `src/components/ui/`. CSS path is `src/app/globals.css`. Import utils from `@/lib/utils`.
- **ESLint 9 flat config**: Configuration in `eslint.config.mjs` using `defineConfig()` from `eslint/config`. Includes `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`, and `eslint-config-prettier`.
- **Dark-first theme**: `<html className="dark">` in `src/app/layout.tsx`. Dark theme uses PRD palette (#0D0D0D bg, #FF6B35 accent). Light theme retains shadcn neutral defaults.
- **PRD custom tokens**: Available as `ms-bg-primary`, `ms-bg-secondary`, `ms-bg-tertiary`, `ms-text-primary`, `ms-text-secondary`, `ms-text-muted`, `ms-accent`, `ms-border` in Tailwind classes.
- **Fonts**: Inter (latin, `--font-inter`) + Noto Sans JP (japanese, `--font-noto-sans-jp`) via `next/font/google`. Font CSS var mapped to `--font-sans` in globals.css.
- **Quality gates**: `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`
- **Drizzle ORM**: Schema in `src/lib/db/schema.ts`, connection in `src/lib/db/index.ts`. Uses `drizzle-orm/neon-http` with `@neondatabase/serverless`. Config at `drizzle.config.ts`. Migrations output to `supabase/migrations/`.
- **DB scripts**: `pnpm db:generate` (create migration SQL), `pnpm db:migrate` (apply), `pnpm db:push` (dev push without migration files).
- **Auth.js v5**: Config in `src/lib/auth.ts`, exports `{ handlers, auth, signIn, signOut }`. Uses `@auth/drizzle-adapter` with custom table mappings. Route handler at `src/app/api/auth/[...nextauth]/route.ts`. Middleware at `src/middleware.ts` protects `/bookmarks` and `/settings`. `SessionProvider` in `src/components/session-provider.tsx` wraps root layout. Login page at `src/app/login/page.tsx`. Env vars: `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`.
- **DB connection fallback**: `src/lib/db/index.ts` uses placeholder URL when `DATABASE_URL` is unset to prevent build-time failures during static page generation.
- **Redux Toolkit**: Store factory in `src/lib/store.ts` (`makeStore()`), typed hooks in `src/lib/hooks.ts` (`useAppDispatch`, `useAppSelector`, `useAppStore`). Slices in `src/lib/features/`. `StoreProvider` in `src/components/store-provider.tsx` wraps root layout (outside `SessionProvider`). Uses `useState(makeStore)` pattern instead of `useRef` to avoid React Compiler's `react-hooks/refs` lint error.
- **Upstash Redis cache**: `src/lib/cache.ts` exports `cacheGet<T>(key)` and `cacheSet(key, value, ttl)`. Conditional Redis init (null stub when env vars missing) for build-time safety. All source modules use cache key prefix `source:` (e.g. `source:hackernews`).
- **Data source modules**: Each source in `src/lib/sources/{name}.ts` exports a single `fetch{Name}Articles(): Promise<Article[]>` function. Uses cache-first + stale-cache-fallback pattern. Returns `Article[]` from `@/types/article`.
- **Article type**: `src/types/article.ts` defines shared `Article` interface and `ArticleSource` union type. Decoupled from Drizzle schema — fetch layer produces plain objects.
- **Cron collection**: `src/app/api/cron/collect/route.ts` handles edition building. Vercel Cron (UTC) fires at `0 21 * * *` (06:00 JST morning) and `0 8 * * *` (17:00 JST evening). Auth via `CRON_SECRET` Bearer token. Idempotent — skips if edition already exists for that type+date. Scores normalized to 0–100 using fixed source ranges.
- **Edition query layer**: `src/lib/queries/edition.ts` exports `getEdition(type, date)`, `getLatestEdition()`, `getWidgetData()`. Queries DB for published editions with linked articles, returns `EditionData` with `articlesBySource: Map<ArticleSource, Article[]>`. Widget data from Redis `edition:widgets` key.
- **Home page architecture**: Async Server Component (`page.tsx`) with `force-dynamic` + Suspense. Delegates to `EditionContent` async sub-component for data fetching. Passes serialized data (Map→Record conversion) to `HomeContent` client component which composes all section components.
- **Playwright E2E**: Config in `playwright.config.ts` with 3 projects (chromium, mobile-chrome, tablet). Tests in `e2e/` directory. Shared fixtures in `e2e/fixtures.ts` (mock data, `waitForPageReady`, `isMobileViewport`, `openMobileMenu`). Tests are viewport-aware — branch logic for mobile hamburger menu vs desktop nav. `pnpm test:e2e` runs all, `pnpm test:e2e:ui` opens UI mode. CI via `.github/workflows/e2e.yml`.

---

## 2026-02-06 - US-001
- What was implemented: Full project foundation with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Inter + Noto Sans JP fonts, ESLint 9 + Prettier, and PRD design tokens
- Files changed:
  - `package.json` - Project config with all dependencies
  - `tsconfig.json` - TypeScript config with `@/*` path alias
  - `eslint.config.mjs` - ESLint 9 flat config with Prettier
  - `.prettierrc` - Prettier config with Tailwind plugin
  - `postcss.config.mjs` - PostCSS with @tailwindcss/postcss
  - `next.config.ts` - Next.js config
  - `components.json` - shadcn/ui config
  - `src/app/globals.css` - Tailwind v4 design tokens with PRD palette (OKLCH)
  - `src/app/layout.tsx` - Root layout with fonts and dark class
  - `src/app/page.tsx` - Placeholder home page
  - `src/lib/utils.ts` - shadcn cn() utility
  - `.gitignore` - Added CLAUDE.md
  - Created dirs: `src/components/ui/`, `src/types/`, `supabase/migrations/`, `tests/`
- **Learnings:**
  - `create-next-app@latest` (Feb 2026) generates Next.js 16.1.6, not 15. PRD says "15" but latest is 16. Used latest.
  - shadcn init with `--base-color neutral` moves `src/app/` to `app/` at root. Must move back to `src/app/` after init.
  - `components.json` CSS path must be updated to `src/app/globals.css` after moving app dir back.
  - Tailwind v4 uses OKLCH color model for CSS variables. PRD hex values converted: `#0D0D0D` → `oklch(0.159 0 0)`, `#FF6B35` → `oklch(0.705 0.193 39.231)`.
  - `--style` flag removed from shadcn CLI in v3.8+; new-york is the default.
  - ESLint 9 uses `defineConfig()` and `globalIgnores()` from `eslint/config`.
  - `--no-react-compiler` flag needed for non-interactive create-next-app.
---

## 2026-02-06 - US-002
- What was implemented: Complete Drizzle ORM schema with 7 tables (users, editions, articles, bookmarks, hidden_items, weather_cache, stock_cache), 5 PostgreSQL enums, typed relations, Neon HTTP database connection, and migration generation
- Files changed:
  - `src/lib/db/schema.ts` - All table definitions, enums, and relations with JSDoc
  - `src/lib/db/index.ts` - Drizzle instance with Neon HTTP driver and schema binding
  - `drizzle.config.ts` - Drizzle Kit config pointing to schema and supabase/migrations output
  - `package.json` - Added `db:generate`, `db:migrate`, `db:push` scripts; added `drizzle-kit` devDep
  - `supabase/migrations/0000_nifty_blob.sql` - Generated initial migration with all tables, enums, FKs, and unique index
  - `supabase/migrations/meta/` - Drizzle Kit snapshot and journal metadata
- **Learnings:**
  - Drizzle v0.45+ uses `drizzle-orm/neon-http` adapter with `neon()` from `@neondatabase/serverless` for HTTP-mode connections (one HTTP request per query, no persistent connection pool — ideal for Vercel serverless).
  - `pgEnum` values must be defined before table references. Drizzle handles ordering in generated SQL.
  - `uuid().defaultRandom()` maps to `gen_random_uuid()` in PostgreSQL — built-in, no extension needed.
  - `date()` with `{ mode: "string" }` stores as PostgreSQL `date` type but returns `string` in TypeScript (e.g., "2026-02-06"), avoiding timezone issues.
  - Bookmarks unique constraint uses `uniqueIndex()` in the third-arg callback of `pgTable` — Drizzle v0.45 uses array syntax `(table) => [...]`.
  - `drizzle-kit generate` creates migration SQL + snapshot JSON. The `out` config must match where migrations are stored.
---

## 2026-02-06 - US-003
- What was implemented: Full Auth.js v5 (NextAuth) integration with Google and GitHub OAuth providers, Drizzle adapter for database session persistence, login page, auth middleware, SessionProvider wrapper, and header with auth state display
- Files changed:
  - `src/lib/auth.ts` - Auth.js v5 config with Google/GitHub providers, Drizzle adapter with custom table mappings, `/login` as custom signIn page
  - `src/lib/db/schema.ts` - Added `accounts`, `sessions`, `verificationTokens` tables for Auth.js; changed `users.id` from `uuid` to `text` for Auth.js compatibility; renamed `avatarUrl` → `image`, added `emailVerified`; updated `bookmarks.userId` and `hiddenItems.userId` from `uuid` to `text`; added `accountsRelations` and `sessionsRelations`
  - `src/lib/db/index.ts` - Added placeholder DATABASE_URL fallback for build-time safety
  - `src/app/api/auth/[...nextauth]/route.ts` - Auth.js catch-all route handler
  - `src/middleware.ts` - Auth middleware protecting `/bookmarks` and `/settings`, redirects to `/login` with `callbackUrl`
  - `src/components/session-provider.tsx` - Client-side SessionProvider wrapper
  - `src/app/login/page.tsx` - Login page with GitHub and Google OAuth buttons, styled with PRD tokens
  - `src/components/layout/header.tsx` - Server Component header with user avatar/name when logged in, Login button when not, sign-out action
  - `src/app/layout.tsx` - Added `SessionProvider` wrapper and `Header` component
  - `src/components/ui/button.tsx` - shadcn/ui button component (added via CLI)
  - `package.json` - Added `@auth/core` and `@auth/drizzle-adapter` dependencies
  - `supabase/migrations/0000_cold_morbius.sql` - Regenerated migration with all Auth.js tables
- **Learnings:**
  - Auth.js v5 Drizzle adapter requires `text` PKs on the `users` table (not `uuid`). It also expects `image` (not `avatarUrl`) and `emailVerified` columns. Custom table mappings via `usersTable`, `accountsTable`, `sessionsTable`, `verificationTokensTable` options.
  - Auth.js v5 auto-detects env vars by convention: `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` for GitHub, `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` for Google. No need to pass `clientId`/`clientSecret` manually.
  - `NextAuth()` is called at module top level, which eagerly initializes the Drizzle adapter. If `DATABASE_URL` is missing at build time, `neon()` throws. Solution: provide a placeholder URL fallback in `db/index.ts` — it's never actually queried during build, only satisfies the constructor.
  - `drizzle-kit generate` is interactive when detecting column renames (e.g., `avatar_url` → `image`). Cleanest workaround: delete old migrations and regenerate from scratch if schema shape changes significantly.
  - Next.js 16 shows deprecation warning for `middleware.ts` — it recommends `proxy` convention instead. However, Auth.js v5 still uses `middleware.ts` and it works fine; the warning is non-blocking.
  - Server Actions (`"use server"` inside form actions) work well for OAuth sign-in/sign-out — no client-side JS needed for the OAuth redirect.
---

## 2026-02-06 - US-004
- What was implemented: Redux Toolkit store setup with editionSlice (morning/evening type + date), uiSlice (theme, sidebar, share menu), typed hooks, and StoreProvider integrated into root layout
- Files changed:
  - `src/lib/store.ts` - Store factory with `makeStore()`, `AppStore`, `RootState`, `AppDispatch` types
  - `src/lib/hooks.ts` - Pre-typed hooks: `useAppDispatch`, `useAppSelector`, `useAppStore`
  - `src/lib/features/edition-slice.ts` - Edition type (morning/evening) and date state management
  - `src/lib/features/ui-slice.ts` - Theme, sidebar open, share menu article ID state management
  - `src/components/store-provider.tsx` - Client component wrapping app with Redux Provider
  - `src/app/layout.tsx` - Added `StoreProvider` wrapping `SessionProvider`
- **Learnings:**
  - React 19 / React Compiler's `react-hooks/refs` ESLint rule forbids accessing `ref.current` during render, even for the RTK-recommended `useRef` store pattern. The `== null` guard is accepted for initialization, but any subsequent `ref.current` access in the render body is flagged. Workaround: use `useState(makeStore)` with lazy initializer instead of `useRef`.
  - RTK's `withTypes<>()` pattern (e.g., `useDispatch.withTypes<AppDispatch>()`) is the recommended way to create typed hooks in RTK v2.x — cleaner than the old `TypedUseSelectorHook` generic.
  - `StoreProvider` wraps `SessionProvider` in the layout tree so all auth-consuming components also have access to Redux state.
---

## 2026-02-06 - US-005
- What was implemented: HackerNews data source integration with typed fetch function, Upstash Redis caching module, and shared Article type definition
- Files changed:
  - `src/types/article.ts` - Shared `Article` interface and `ArticleSource` type used by all data sources
  - `src/lib/cache.ts` - Generic `cacheGet<T>()` / `cacheSet()` wrappers around Upstash Redis with build-time safety (null stub when env vars missing)
  - `src/lib/sources/hackernews.ts` - `fetchHackerNewsArticles()` fetching top 5 front-page stories from HN Algolia API with 1-hour Redis cache and stale-cache fallback on API failure
- **Learnings:**
  - Upstash Redis JS SDK (`@upstash/redis`) uses `Redis.fromEnv()` which reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` automatically. Same env-var convention pattern as Auth.js v5.
  - Upstash SDK auto-serializes/deserializes JSON — no manual `JSON.stringify`/`JSON.parse` needed. `redis.get<T>(key)` returns typed objects directly.
  - Like the Neon DB client, Redis client must handle missing env vars during `next build`. Solution: conditional initialization (`redis = process.env.UPSTASH_REDIS_REST_URL ? Redis.fromEnv() : null`) with null-guard in cache functions.
  - HN Algolia API (`hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=5`) is public with no rate limit. Some stories (Ask HN, Show HN text posts) have `url: null` — must fallback to `news.ycombinator.com/item?id=` permalink.
  - `Article` type is intentionally decoupled from Drizzle's `InferSelectModel` — the fetch layer produces plain objects that are later persisted by the edition builder (US-015).
---

## 2026-02-06 - US-006
- What was implemented: GitHub trending repositories data source with typed fetch function, exponential backoff retry for rate limiting, Upstash Redis caching (1-hour TTL), and stale-cache fallback
- Files changed:
  - `src/lib/sources/github.ts` - `fetchGitHubArticles()` fetching top 5 trending repos (created in last 7 days, sorted by stars) from GitHub Search API with retry on 403/429 and 1-hour Redis cache
- **Learnings:**
  - GitHub has no official "trending" API. The standard workaround is the search endpoint with `q=created:>{7-days-ago}&sort=stars&order=desc` — this is what most trending aggregators use.
  - GitHub's unauthenticated search API rate limit is 10 requests/minute (stricter than the 60 req/hour general API limit). The `Retry-After` header should be honored when present before falling back to exponential backoff.
  - `Accept: application/vnd.github+json` header is recommended by GitHub docs for forward compatibility with API versioning.
  - Repo owner's `avatar_url` makes a good `thumbnailUrl` — it's always present and CDN-served.
  - Same cache-first + stale-fallback pattern as HackerNews module — keeps the architecture consistent across all data sources.
---

## 2026-02-06 - US-007
- What was implemented: Reddit data source integration fetching top 5 hot posts from r/programming, r/webdev, r/javascript, r/typescript with NSFW/removed post filtering, Upstash Redis caching (1-hour TTL), and stale-cache fallback
- Files changed:
  - `src/lib/sources/reddit.ts` - `fetchRedditArticles()` using Reddit JSON API with multi-subreddit `+` syntax, combined sorting by score, NSFW/removed filtering, and Article type mapping with metadata (subreddit, upvotes, comments, author)
- **Learnings:**
  - Reddit's public JSON API works by appending `.json` to any URL — no OAuth needed for read-only access. However, a descriptive `User-Agent` header is required or requests may get 429'd.
  - Multi-subreddit syntax (`r/A+B+C+D/hot.json`) fetches a merged listing in a single request — Reddit handles the cross-subreddit ranking server-side.
  - Reddit's `thumbnail` field uses string sentinels (`"self"`, `"default"`, `"nsfw"`, `"spoiler"`) instead of `null` when no image is available. Must check for `http://` or `https://` prefix to validate.
  - We fetch `limit=25` and filter/sort client-side to ensure we have 5 quality posts after removing NSFW, removed, and low-engagement items.
  - Same cache-first + stale-fallback + fire-and-forget `cacheSet` pattern as HackerNews and GitHub modules — architecture stays consistent.
---

## 2026-02-06 - US-008
- What was implemented: Tech News RSS feed integration aggregating articles from The Verge, Ars Technica, and TechCrunch using `rss-parser`, with Upstash Redis caching (1-hour TTL), graceful XML parsing error handling, and stale-cache fallback
- Files changed:
  - `src/lib/sources/rss.ts` - `fetchRssArticles()` fetching and aggregating top 5 articles (sorted by publish date) from 3 RSS feeds using `Promise.allSettled()` for independent failure handling, with cache-first + stale-fallback pattern
  - `package.json` - Added `rss-parser` dependency (v3.13.0)
- **Learnings:**
  - `rss-parser` (v3.13.0) ships with built-in TypeScript types (`index.d.ts`). No `@types/rss-parser` needed. The `Parser.Item` type exposes `isoDate` (ISO 8601 string) which is more reliable for sorting than `pubDate` (RFC 2822 format varies across feeds).
  - `rss-parser`'s `parseURL()` uses Node's `http/https` modules internally with its own timeout handling. The `timeout` option in the constructor is in milliseconds and applies per-feed.
  - `Promise.allSettled()` is critical for multi-feed aggregation — one feed timing out (e.g., TechCrunch) shouldn't prevent The Verge and Ars Technica articles from being returned. Individual failures are logged as warnings.
  - RSS `<enclosure>` tag is the standard way feeds include images. Check `enclosure.type?.startsWith("image/")` to filter for image enclosures vs. audio/video.
  - Context7 doesn't have `rss-parser` docs indexed — the npm package's `index.d.ts` is the best type reference.
  - Same cache-first + stale-fallback + fire-and-forget `cacheSet` pattern as all other source modules.
---

## 2026-02-06 - US-009
- What was implemented: Hatena Bookmark data source integration fetching top 5 hot technology entries from Hatena Bookmark RSS feed, with bookmark count as engagement score, Upstash Redis caching (1-hour TTL), and stale-cache fallback
- Files changed:
  - `src/lib/sources/hatena.ts` - `fetchHatenaArticles()` using `rss-parser` with custom field mapping for `hatena:bookmarkcount` and `hatena:imageurl`, sorted by bookmark count, cache-first + stale-fallback pattern
- **Learnings:**
  - Hatena Bookmark hot entries RSS is RDF 1.0 format at `https://b.hatena.ne.jp/hotentry/it.rss` (the "it" category = technology). Public, no auth needed, no rate limit documented.
  - `rss-parser`'s `customFields` option maps namespaced XML elements (e.g. `hatena:bookmarkcount`) to flat property names on item objects. Requires a generic type parameter on `Parser<Feed, Item>` to get TypeScript typing for the custom fields.
  - Hatena's `hatena:imageurl` provides a thumbnail for most entries — more reliable than trying to extract from `<enclosure>` (which Hatena's RDF feed doesn't include).
  - Entries are sorted by bookmark count (descending) rather than date — hot entries are already recent, and bookmark count is a better indicator of community interest.
  - Same cache-first + stale-fallback + fire-and-forget `cacheSet` pattern as all other source modules.
---

## 2026-02-06 - US-010
- What was implemented: Bluesky data source integration fetching top 3 trending tech posts from Bluesky's public AT Protocol API using `searchPosts` with `sort=top`, mapped to Article type with engagement metadata, Upstash Redis caching (1-hour TTL), and stale-cache fallback
- Files changed:
  - `src/lib/sources/bluesky.ts` - `fetchBlueskyArticles()` using `app.bsky.feed.searchPosts` public endpoint with tech-related query, `sort=top` for popular posts, AT URI→web URL conversion, cache-first + stale-fallback pattern
- **Learnings:**
  - Bluesky has no official "trending posts" API. The `app.bsky.unspecced.getTrends` and `getTrendingTopics` endpoints return topic names/metadata, not actual post content. Best approach for trending posts: `searchPosts` with `sort=top` and relevant keywords.
  - The public Bluesky AppView at `public.api.bsky.app` serves unauthenticated read-only requests. No API key or OAuth needed for `searchPosts`.
  - AT Protocol URIs follow `at://{did}/{collection}/{rkey}` format. To build a web-clickable URL: extract the rkey (last URI segment) and combine with author handle → `bsky.app/profile/{handle}/post/{rkey}`.
  - Bluesky posts have no separate `title` field — the post `text` (up to 300 chars) is the entire content. Truncating to ~100 chars for title and ~200 chars for excerpt provides a good card display.
  - `PostView` includes `likeCount`, `repostCount`, `replyCount` as optional integers (may be undefined if zero). Default to 0 with `?? 0`.
  - Author `avatar` URL from the API makes a serviceable `thumbnailUrl` since Bluesky posts often lack embedded images in the search response.
  - Same cache-first + stale-fallback + fire-and-forget `cacheSet` pattern as all other source modules.
---

## 2026-02-06 - US-011
- What was implemented: YouTube trending data source integration fetching top 3 trending Science & Technology videos from YouTube Data API v3, with view count as engagement score, ISO 8601 duration parsing, Upstash Redis caching (1-hour TTL), quota-exceeded detection, and stale-cache fallback
- Files changed:
  - `src/lib/sources/youtube.ts` - `fetchYouTubeArticles()` using `videos.list` with `chart=mostPopular` and `videoCategoryId=28`, maps to Article type with metadata (channel, views, likes, comments, duration), cache-first + stale-fallback pattern
- **Learnings:**
  - `videos.list` with `chart=mostPopular` costs only 1 quota unit per call, vs `search.list` at 100 units. Critical for staying within the 10,000 units/day limit — 1-hour cache means ~24 calls/day = 24 units total.
  - `videoCategoryId=28` is "Science & Technology" — YouTube category IDs are fixed numbers, not configurable strings. Full list available via `videoCategories.list` endpoint.
  - YouTube `contentDetails.duration` uses ISO 8601 format (`PT#H#M#S`). Regex parsing with optional groups handles all variants: `PT1H2M34S`, `PT12M5S`, `PT45S`.
  - `statistics` fields (`viewCount`, `likeCount`, `commentCount`) are returned as strings, not numbers. Must `Number()` convert them.
  - API key is passed as `key=` query parameter (not in headers). Missing `YOUTUBE_API_KEY` env var is handled gracefully — returns empty array without throwing, same as the Redis/DB build-time safety pattern.
  - Quota exceeded errors return HTTP 403 with `quotaExceeded` in the JSON body — detected by checking the response text before throwing.
  - Same cache-first + stale-fallback + fire-and-forget `cacheSet` pattern as all other source modules.
---

## 2026-02-06 - US-012
- What was implemented: ProductHunt data source integration fetching today's top 5 product launches via ProductHunt API v2 (GraphQL), mapped to Article type with metadata (votes, tagline, topics), Upstash Redis caching (1-hour TTL), and stale-cache fallback
- Files changed:
  - `src/lib/sources/producthunt.ts` - `fetchProductHuntArticles()` using PH GraphQL API with `posts(first: 5, order: VOTES, postedAfter: today)` query, Bearer token auth, Relay-style edge/node response mapping, cache-first + stale-fallback pattern
- **Learnings:**
  - ProductHunt API v2 is GraphQL-only at `api.producthunt.com/v2/api/graphql`. No REST endpoint for fetching posts. Requires a Developer Token (Bearer auth), obtained from the PH developer dashboard.
  - The `posts` query supports `order: VOTES` and `postedAfter: DateTime!` to fetch today's top products. `postedAfter` expects an ISO 8601 timestamp (midnight UTC today) to scope results to today's launches.
  - PH uses Relay-style pagination: `posts.edges[].node` wraps each post. Topics are nested the same way: `topics.edges[].node.name`.
  - `thumbnail` is nullable (returns `{ url: string } | null`). Some new products haven't uploaded a thumbnail yet. Using optional chaining `node.thumbnail?.url ?? undefined`.
  - Env var `PRODUCTHUNT_API_TOKEN` follows the same conditional guard pattern as YouTube's `YOUTUBE_API_KEY` — returns empty array when missing, no build-time failures.
  - Same cache-first + stale-fallback + fire-and-forget `cacheSet` pattern as all other source modules.
---

## 2026-02-06 - US-013
- What was implemented: Weather widget data source fetching current weather from OpenWeatherMap API with typed `WeatherData` interface, 30-minute Upstash Redis caching, city parameter (default: Tokyo), and graceful degradation when API key is missing
- Files changed:
  - `src/lib/sources/weather.ts` - `fetchWeather(city?)` returning `WeatherData | null` using OWM current-weather endpoint (`/data/2.5/weather`), cache-first + stale-fallback pattern with 30-minute TTL
- **Learnings:**
  - Weather module returns a dedicated `WeatherData` interface (not `Article[]`) because weather data powers a sidebar widget, not article cards. The `Article` type's fields (score, externalId, source) don't map semantically to weather data.
  - Return type is `WeatherData | null` (not `WeatherData[]`) since there's only one result. `null` lets the UI distinguish "unavailable" from "loaded" — unlike article sources where `[]` is a valid empty state.
  - OpenWeatherMap free-tier API key is passed via `appid=` query parameter. `units=metric` returns Celsius directly — no client-side conversion needed.
  - OWM's `weather` array may contain multiple conditions but [0] is the primary. Icon codes like `"01d"` / `"10n"` map to OWM's CDN: `openweathermap.org/img/wn/{icon}@2x.png`.
  - Cache TTL is 30 minutes (vs 1 hour for article sources) per PRD spec — weather changes more frequently than news rankings.
  - Same env-var guard pattern as YouTube/ProductHunt — returns `null` when `OPENWEATHERMAP_API_KEY` is unset, no build-time failures.
  - PRD also mentions caching in the `weather_cache` DB table. The current implementation caches in Redis only. DB caching will be integrated during the edition builder (US-015) when database writes are orchestrated.
---

## 2026-02-06 - US-014
- What was implemented: Stock market widget data source fetching current index data for Nikkei 225, S&P 500, and NASDAQ from Yahoo Finance v7 quote API, with market-hours-aware Upstash Redis caching (15 min during trading hours, 6 hours after close), typed `StockData` interface, and stale-cache fallback
- Files changed:
  - `src/lib/sources/stocks.ts` - `fetchStockData()` returning `StockData[]` using Yahoo Finance batch quote endpoint with 3 symbols (`^N225`, `^GSPC`, `^IXIC`), market-hours-aware TTL selection, cache-first + stale-fallback pattern
- **Learnings:**
  - Yahoo Finance's public v7 quote endpoint (`query1.finance.yahoo.com/v7/finance/quote`) supports batch symbol queries via comma-separated `symbols` parameter — all 3 indices in a single request. No API key required.
  - Alpha Vantage free tier limits to 25 calls/day and 5/min — impractical for 3 indices with 15-minute refresh. Yahoo Finance has no documented rate limit for the quote endpoint.
  - Yahoo Finance returns `regularMarketPrice`, `regularMarketChange`, `regularMarketChangePercent` as numbers (not strings like YouTube's API). No type coercion needed.
  - Market-hours-aware TTL requires checking UTC time against two timezone windows: JPX trades 09:00–15:00 JST (00:00–06:00 UTC) and NYSE/NASDAQ trades 09:30–16:00 ET (13:30–21:00 UTC covering both EST and EDT). Using a broad window avoids DST detection complexity.
  - Index symbols use caret prefix: `^N225` (Nikkei), `^GSPC` (S&P 500), `^IXIC` (NASDAQ Composite). The `shortName` field provides a readable name as fallback.
  - Like weather, stock data returns a dedicated `StockData[]` interface (not `Article[]`) since it powers a sidebar widget, not article cards. Returns `[]` (not `null`) because multiple entries is a natural array state.
  - Same cache-first + stale-fallback + fire-and-forget `cacheSet` pattern as all other source modules. PRD also mentions `stock_cache` DB table — DB persistence will be integrated during US-015 edition builder.
---

## 2026-02-06 - US-015
- What was implemented: Cron job for automated edition data collection. Creates `/api/cron/collect` GET route handler that fetches all 8 article sources + weather + stocks in parallel via `Promise.allSettled()`, normalizes scores to 0-100, creates a draft edition record, saves top-N articles per source to the database, caches widget data (weather/stocks), and marks the edition as published. Configured Vercel Cron in `vercel.json` for 06:00 and 17:00 Asia/Tokyo (21:00 UTC and 08:00 UTC).
- Files changed:
  - `src/app/api/cron/collect/route.ts` - Cron route handler with parallel fetching, score normalization, DB persistence, idempotency check, CRON_SECRET auth guard, and structured logging
  - `vercel.json` - Vercel Cron configuration with two schedules (morning/evening editions)
- **Learnings:**
  - Vercel Cron Jobs invoke endpoints via **GET** requests (not POST). Using `export async function POST()` would result in 405 when the cron fires.
  - Vercel automatically sends `CRON_SECRET` env var as `Bearer` token in the `Authorization` header. Checking `authorization !== Bearer ${CRON_SECRET}` is the standard auth guard pattern.
  - Vercel cron expressions use UTC only. Japan (Asia/Tokyo = UTC+9) doesn't observe DST, so the conversion is fixed: `06:00 JST` = `21:00 UTC` (cron: `0 21 * * *`), `17:00 JST` = `08:00 UTC` (cron: `0 8 * * *`).
  - `Intl.DateTimeFormat` with `timeZone: "Asia/Tokyo"` is the cleanest way to get current JST hour/date in a serverless environment without timezone libraries. Using `en-CA` locale for date formatting gives ISO format (`YYYY-MM-DD`) directly.
  - Score normalization uses fixed ranges per source rather than percentile-ranking within each batch. This provides stable, predictable scoring even when batch sizes vary.
  - Idempotency guard (checking for existing edition with same type+date before insert) prevents duplicate editions on Vercel cron retries.
  - Weather and stock data are widgets, not articles - they're cached in Redis under `edition:widgets` key rather than inserted into the articles table.
---

## 2026-02-07 - US-016
- What was implemented: Reusable ArticleCard client component displaying thumbnail (with Image fallback), 2-line clamped title, source brand color badge, relative time, engagement score, and hover-visible action buttons (bookmark/share/hide). Fully accessible with keyboard focus, aria labels, and proper heading hierarchy.
- Files changed:
  - `src/components/cards/article-card.tsx` - ArticleCard component with ArticleCardProps interface, source color/label maps, formatRelativeTime and formatScore helpers
- **Learnings:**
  - Stretched-link pattern (`after:absolute after:inset-0` on the title `<a>`) makes the entire card clickable while preserving native link behavior (right-click, middle-click context menu). Action buttons use `e.stopPropagation()` to intercept without conflicting.
  - Next.js `<Image>` `onError` callback fires on 404/CORS failures — paired with `useState(false)` for `imgError` to switch to a text-initial fallback. No broken image icons.
  - `Record<ArticleSource, string>` for `SOURCE_COLORS` and `SOURCE_LABELS` maps gives compile-time exhaustiveness — if a new source is added to the `ArticleSource` union type, TypeScript flags missing entries immediately.
  - `group-hover:opacity-100 group-focus-within:opacity-100` on the action button container ensures buttons appear on both mouse hover and keyboard focus traversal — covers all interaction modes.
  - Article `metadata` is `Record<string, unknown>` — the card reads `createdAt` and `publishDate` with type assertions since metadata shape varies per source. Downstream stories (US-022) may standardize this.
---

## 2026-02-07 - US-017
- What was implemented: Header component with morning/evening edition tab switcher dispatching to Redux `editionSlice`, bookmark/settings icon links, login/avatar auth display using `useSession()`, mobile hamburger menu toggling `uiSlice.sidebarOpen`, formatted edition date display, and sticky header with backdrop blur. Fully accessible with ARIA tablist, keyboard navigation, and proper label hierarchy.
- Files changed:
  - `src/components/layout/header.tsx` - Rewrote from async Server Component to `"use client"` Client Component with Redux hooks, `useSession()`, edition tabs, icon buttons, and mobile menu dropdown
- **Learnings:**
  - Converting a Server Component (`async function` calling `auth()`) to Client Component requires switching from server-side `auth()` to `useSession()` from `next-auth/react`. The `SessionProvider` already in the layout tree provides the context.
  - No changes needed to `layout.tsx` — the `Header` import stays the same since it's still a named export. The layout doesn't need to call `auth()` or pass session props; the client component reads session from context.
  - Inline SVG icon functions avoid adding a dependency like `lucide-react`. Using `aria-hidden="true"` on decorative icons and `aria-label` on icon-only buttons ensures screen reader compatibility.
  - The `role="tablist"` / `role="tab"` / `aria-selected` pattern on edition tabs follows WAI-ARIA tab pattern for accessible tab switching.
  - Mobile menu uses both `toggleSidebar()` for the hamburger button and `setSidebarOpen(false)` for menu item clicks — closing the menu on navigation prevents the overlay from persisting after route change.
  - `formatEditionDate` uses `new Date(dateStr + "T00:00:00")` to avoid timezone-offset date parsing bugs (e.g., `new Date("2026-02-07")` can shift to previous day in negative UTC offsets).
---

## 2026-02-07 - US-018
- What was implemented: Hero section component displaying 1 main featured article (large card with thumbnail, headline, 3-line excerpt, source badge, time) and 3 sub-articles in a responsive grid below. Articles auto-selected by highest score. Main card uses 3/4 width thumbnail on desktop with content panel on the right. Sub-articles reuse the existing ArticleCard component.
- Files changed:
  - `src/components/sections/hero-section.tsx` - HeroSection component with HeroMainCard internal component, score-based article selection, responsive layout (flex-col mobile / flex-row desktop), hover action buttons (bookmark/share/hide), accessible with aria labels
- **Learnings:**
  - Hero section is a presentation-only component receiving `Article[]` props — sorting by score and slicing top 4 happens inside the component so the parent page just passes all edition articles.
  - Next.js `<Image priority>` is essential on the hero card's thumbnail since it's the LCP (Largest Contentful Paint) candidate. Without it, the image loads lazily and tanks Lighthouse scores.
  - The main card uses `lg:flex-row` for side-by-side layout on desktop and `flex-col` for stacked on mobile. The thumbnail takes `lg:w-3/4` matching the PRD "3/4 width" spec, while `flex-1` on the content panel fills the remaining space.
  - `SOURCE_COLORS` and `SOURCE_LABELS` maps are duplicated from `article-card.tsx`. These should be extracted to a shared module in a future refactor when more section components need them.
  - Sub-articles reuse `ArticleCard` from US-016 unchanged — keeping the codebase DRY. The `sm:grid-cols-2 lg:grid-cols-3` grid handles the responsive 1→2→3 column layout for the sub-article row.
---

## 2026-02-07 - US-019
- What was implemented: Weather and stock market widget components using shadcn/ui Card for consistent styling, with skeleton loading placeholders for Suspense boundaries. Weather widget displays OWM icon, temperature in Celsius, city name, and condition. Stock widget lists indices with name, price, and color-coded change percentage (green for positive, red for negative). Both widgets are React Server Components (no `"use client"`).
- Files changed:
  - `src/components/widgets/weather-widget.tsx` - `WeatherWidget` (data display) + `WeatherWidgetSkeleton` (Suspense fallback), accepts `WeatherData | null` from the weather source module
  - `src/components/widgets/stock-widget.tsx` - `StockWidget` (data display) + `StockWidgetSkeleton` (Suspense fallback), accepts `StockData[]` from the stocks source module, with `StockRow` internal component
  - `src/components/ui/card.tsx` - Added via shadcn CLI (Card, CardHeader, CardTitle, CardContent, etc.)
  - `src/components/ui/skeleton.tsx` - Added via shadcn CLI (Skeleton component for loading states)
- **Learnings:**
  - Widget components are intentionally React Server Components (no `"use client"` directive) since they have no interactive state, event handlers, or browser APIs. The parent page will wrap them in `<Suspense>` with the skeleton fallbacks for streaming.
  - OWM weather icons are served from `openweathermap.org/img/wn/{icon}@2x.png`. Using native `<img>` with `eslint-disable @next/next/no-img-element` avoids configuring `next.config.ts` `images.remotePatterns` for a third-party CDN. The 2x icon is 100x100px — small enough that Next.js Image optimization provides negligible benefit.
  - shadcn/ui Card's default `bg-card` maps to `--card` which in dark mode is `oklch(0.218 0 0)` (#1A1A1A = `ms-bg-secondary`). Adding explicit `bg-ms-bg-secondary border-ms-border` overrides ensures consistent styling regardless of shadcn's theme defaults.
  - `Intl.NumberFormat` with currency-aware fraction digits (`0` for JPY, `2` for USD) handles the Nikkei 225 (¥ thousands with no decimals) vs S&P/NASDAQ ($ with 2 decimal places) display difference cleanly.
  - `tabular-nums` Tailwind class enables OpenType tabular figures, keeping digit columns aligned when numbers change — essential for financial data where `1,234.56` and `12,345.67` should share column width.
  - Skeleton components mirror the exact layout of the loaded state (same gap sizes, element counts) so there's no layout shift when data streams in. This preserves CLS (Cumulative Layout Shift) < 0.1 per PRD performance targets.
---

## 2026-02-07 - US-020
- What was implemented: Content section components for Tech, GitHub, HN, and Reddit. Built a shared `SectionHeader` (Server Component) and `ContentSection` (Client Component) base, then four thin source-specific wrappers. Responsive layout: mobile horizontal scroll (72vw cards), tablet 2-col grid, desktop single-column stacked (to sit inside the parent 4-col grid from US-022). Each section shows header (icon + title + optional "View All") and up to 5 `ArticleCard`s.
- Files changed:
  - `src/components/sections/section-header.tsx` - Shared section header with icon, title, optional "View All" link (Server Component)
  - `src/components/sections/content-section.tsx` - Generic content section layout with responsive grid/scroll and ArticleCard integration (Client Component)
  - `src/components/sections/tech-section.tsx` - Tech News section wrapper (tech_rss articles)
  - `src/components/sections/github-section.tsx` - GitHub Trending section wrapper
  - `src/components/sections/hackernews-section.tsx` - Hacker News section wrapper
  - `src/components/sections/reddit-section.tsx` - Reddit section wrapper
- **Learnings:**
  - Extracting a `ContentSection` base component avoids duplicating the responsive grid + scroll logic across 4 (and later more) section components. The source-specific sections become pure configuration wrappers passing icon, title, and articles.
  - `SectionHeader` is a Server Component (no `"use client"`) since it has no interactive state. `ContentSection` must be `"use client"` because it composes `ArticleCard` which uses `useState` for image error handling.
  - Mobile horizontal scroll uses `flex overflow-x-auto` + `w-[72vw] shrink-0` on each card wrapper — showing ~1.4 cards hints at scrollability. `sm:grid sm:grid-cols-2 sm:overflow-x-visible` switches to vertical grid at tablet breakpoint.
  - `scrollbar-none` is a built-in Tailwind v4 utility that hides scrollbars via `-webkit-` and `scrollbar-width: none` — no custom CSS needed.
  - At desktop (`lg:`), sections switch to `flex-col` to stack cards vertically within each cell of the outer 4-column grid that US-022 will create. This keeps each section column narrow and readable.
---

## 2026-02-07 - US-021
- What was implemented: SNS section (Bluesky + YouTube), Hatena Bookmark section, and World News section components. SNS section features custom card sub-components: YouTubeCard with play button overlay, duration badge, and view count; BlueskyCard with avatar, author handle, post text snippet, and engagement metrics (likes/reposts). Hatena and World News sections use the existing ContentSection/ArticleCard composition pattern. Shared `ActionButtons` sub-component keeps hover actions (bookmark/share/hide) consistent across custom cards.
- Files changed:
  - `src/components/sections/sns-section.tsx` - SnsSection with BlueskyCard, YouTubeCard, ActionButtons sub-components, takes separate blueskyArticles + youtubeArticles props, `lg:grid-cols-2` layout for desktop
  - `src/components/sections/hatena-section.tsx` - HatenaSection thin wrapper over ContentSection (5 entries, 📌 icon)
  - `src/components/sections/world-news-section.tsx` - WorldNewsSection thin wrapper over ContentSection (5 articles, 🌍 icon)
- **Learnings:**
  - YouTube and Bluesky need custom card layouts because their content differs fundamentally from the generic article card: YouTube cards need a play button overlay on the thumbnail with a duration badge, and Bluesky cards need a social-post layout (avatar + handle + text body + engagement row). Extracting `ActionButtons` as a shared internal component keeps hover actions consistent without forcing a single card layout.
  - Using native `<img>` for 32px Bluesky avatars avoids adding `cdn.bsky.app` to `next.config.ts` `images.remotePatterns`. At 32px, Next.js Image optimization provides no measurable benefit. The `eslint-disable-next-line` comment documents the intentional choice.
  - The SNS section takes two separate props (`blueskyArticles`, `youtubeArticles`) rather than a single `articles` array because it renders them in distinct sub-sections with different headers and card layouts. This differs from other sections that use a single `articles` prop with uniform rendering.
  - `lucide-react` icons (`Play`, `Heart`, `Repeat2`, `Eye`) are already available as a project dependency from the ArticleCard implementation (US-016). No additional packages needed.
  - The `world_news` source in `ArticleSource` type and `SOURCE_COLORS`/`SOURCE_LABELS` maps already exist in article-card.tsx from US-016, so WorldNewsSection works immediately with the existing ArticleCard even though no world_news data source module exists yet.
---

## 2026-02-07 - US-022
- What was implemented: Home page assembly as an async Server Component with Suspense boundary, server-side edition data fetching from Drizzle DB, Redis widget data retrieval, full section layout (Hero + Widgets → Tech/GitHub/HN/Reddit → SNS → Hatena/World News), no-edition fallback state, skeleton loading placeholder, and comprehensive page metadata (title, OGP, Twitter cards). Created a reusable edition query module and a client-side HomeContent wrapper for the interactive section composition.
- Files changed:
  - `src/app/page.tsx` - Rewrote from placeholder to async Server Component with Suspense, EditionContent async sub-component, NoEditionFallback, HomePageSkeleton, and page metadata export
  - `src/lib/queries/edition.ts` - New module: `getEdition()`, `getLatestEdition()`, `getWidgetData()` functions querying Drizzle and Redis
  - `src/components/home-content.tsx` - New client component composing all section components with article distribution by source
- **Learnings:**
  - **`force-dynamic` is required** for pages that query the DB via Drizzle. Next.js tries to statically generate pages at build time by default. The placeholder DATABASE_URL in `db/index.ts` satisfies `neon()` constructor but fails on actual queries. `export const dynamic = "force-dynamic"` forces SSR, which is correct for a news page that needs live data.
  - **Server/Client Component boundary for data passing:** `Map` objects cannot be serialized across the RSC boundary. Must convert `Map<ArticleSource, Article[]>` to a plain `Record<string, Article[]>` before passing to client components. Using a `mapToRecord()` helper keeps this explicit.
  - **Async sub-component + Suspense pattern:** The page export itself is a thin wrapper that renders `<Suspense fallback><AsyncComponent /></Suspense>`. The async sub-component (`EditionContent`) does the actual DB/Redis fetching. This lets Next.js stream the skeleton immediately while the data loads — critical for LCP performance.
  - **Edition type defaults from JST time:** Same `Intl.DateTimeFormat` pattern as the cron collector to determine morning/evening. The server picks the default; client-side Redux tab switching will re-fetch in a future story.
  - **Fallback strategy:** First tries `getEdition(type, today)` for exact match, then `getLatestEdition()` for any recent published edition. This prevents an empty page when the cron hasn't run today yet but previous editions exist.
  - **Metadata in page.tsx vs layout.tsx:** Both can export `metadata`. Page-level overrides layout-level. OGP/Twitter card fields are only in page.tsx. Layout metadata serves as fallback for other pages.
  - **Layout-aware responsive grid:** Hero + Widgets use `lg:flex-[3]` / `lg:flex-[1]` for the 3/4 + 1/4 split. Content sections use `lg:grid-cols-4`. SNS section has its own `lg:grid-cols-2`. Bottom row uses `lg:grid-cols-3`.
---

## 2026-02-07 - US-023
- What was implemented: Full bookmark feature with server actions (addBookmark, removeBookmark, getBookmarks, getBookmarkedIds), Redux bookmarks slice for optimistic UI, bookmark toggle wired through all section components via HomeContent, /bookmarks page with article grid and optimistic un-bookmark, and login redirect for unauthenticated bookmark clicks.
- Files changed:
  - `src/app/actions/bookmarks.ts` - Server actions: `addBookmark(externalId)`, `removeBookmark(externalId)`, `getBookmarks()`, `getBookmarkedIds()` with auth guard, DB lookup by externalId, idempotent add/remove
  - `src/lib/features/bookmarks-slice.ts` - Redux slice: `initializeBookmarks`, `toggleBookmark`, `revertBookmark` actions; stores `bookmarkedIds: string[]` (not Set, for serializability)
  - `src/lib/store.ts` - Added `bookmarks: bookmarksReducer` to store
  - `src/components/home-content.tsx` - Wired `handleBookmark` callback with optimistic Redux toggle + server action persistence + revert on failure; initializes bookmark state from server-passed IDs; redirects to `/login` if unauthenticated
  - `src/app/page.tsx` - Added `getBookmarkedIds()` to parallel `Promise.all` fetch; passes `bookmarkedIds` prop to HomeContent
  - `src/app/bookmarks/page.tsx` - Bookmarks page (async Server Component with Suspense), fetches via `getBookmarks()`, shows empty state or BookmarksContent
  - `src/components/bookmarks-content.tsx` - Client component for bookmarks grid with optimistic removal (local `removedIds` state + Redux toggle + `router.refresh()` on success)
- **Learnings:**
  - **`externalId` as client-server bridge**: The `bookmarks` DB table uses `articleId` (UUID FK) but client `Article` objects only have `externalId` (source-specific). Server actions resolve this by looking up the article row by `externalId` before inserting/deleting the bookmark. This keeps DB internals hidden from the client layer.
  - **Optimistic UI with Redux + Server Actions**: The pattern is: (1) `dispatch(toggleBookmark(id))` for instant UI, (2) `await addBookmark(id)` / `removeBookmark(id)` for persistence, (3) `dispatch(revertBookmark(id))` on failure. The `revertBookmark` action is identical to `toggleBookmark` — it just re-toggles — but having a separate action name improves devtools readability.
  - **Serializable Redux state**: `Set<string>` is not Redux-serializable. Using `string[]` in the slice and converting to `Set` via `useMemo` in the component gives O(1) lookup in renders while keeping the store JSON-safe. RTK would warn otherwise.
  - **Parallel server queries**: Wrapping `getEdition()`, `getWidgetData()`, and `getBookmarkedIds()` in `Promise.all` means the bookmark ID query adds zero additional latency — it runs concurrently with the edition/widget fetches.
  - **Bookmarks page optimistic removal**: Beyond Redux state, the bookmarks page needs a local `removedIds` set to immediately filter removed cards from the visible list. `router.refresh()` after success re-fetches server data to keep the list consistent across navigations.
  - **Idempotent server actions**: `addBookmark` catches unique constraint violations and returns `{ success: true }`. `removeBookmark` silently succeeds if no bookmark exists. This prevents race conditions when optimistic UI fires duplicate requests.
  - **Middleware already protects /bookmarks**: The existing `src/middleware.ts` matcher includes `/bookmarks/:path*`, so unauthenticated users are redirected to `/login?callbackUrl=` before the page even renders. The client-side redirect in `handleBookmark` is a belt-and-suspenders approach for the home page bookmark buttons.
---

## 2026-02-07 - US-024
- What was implemented: Full hide content feature with three-tier hiding (article/source/topic). Server actions (hideItem, unhideItem, getHiddenItems, getHiddenState) in `src/app/actions/hidden.ts`. Redux `hiddenSlice` for optimistic client-side filtering. Hide dropdown menu (using shadcn/ui DropdownMenu) on article card X button with three options: "Hide this article", "Hide from [source]", "Hide topic: [keyword]". Dual-layer filtering: server-side in `edition.ts` (via `applyHiddenFilters`) and client-side in `HomeContent` (via `filterHiddenArticles`). All section components updated with `HideAction` callback type. `SOURCE_COLORS` and `SOURCE_LABELS` exported from `article-card.tsx` and reused in hero/sns sections.
- Files changed:
  - `src/app/actions/hidden.ts` - New: Server actions `hideItem`, `unhideItem`, `getHiddenItems`, `getHiddenState` with auth guard, idempotent operations
  - `src/lib/features/hidden-slice.ts` - New: Redux slice with `initializeHidden`, `hideArticle/Source/Topic`, `revertHideArticle/Source/Topic` actions
  - `src/lib/store.ts` - Added `hidden: hiddenReducer` to store
  - `src/types/article.ts` - Added `HideAction` interface (`type: article|source|topic`, `targetId: string`)
  - `src/components/cards/article-card.tsx` - Added shadcn DropdownMenu on X button with 3 hide options; exported `SOURCE_COLORS` and `SOURCE_LABELS`; changed `onHide` from `(article: Article) => void` to `(action: HideAction) => void`; added `extractKeyword()` helper
  - `src/components/sections/hero-section.tsx` - Updated `onHide` type to `HideAction`; added DropdownMenu to HeroMainCard; imported `SOURCE_COLORS`/`SOURCE_LABELS` from article-card instead of duplicating
  - `src/components/sections/sns-section.tsx` - Updated `onHide` type to `HideAction` across all internal components (ActionButtons, YouTubeCard, BlueskyCard); added DropdownMenu to ActionButtons
  - `src/components/sections/content-section.tsx` - Updated `onHide` prop type to `HideAction`
  - `src/components/sections/tech-section.tsx` - Updated `onHide` prop type to `HideAction`
  - `src/components/sections/github-section.tsx` - Updated `onHide` prop type to `HideAction`
  - `src/components/sections/hackernews-section.tsx` - Updated `onHide` prop type to `HideAction`
  - `src/components/sections/reddit-section.tsx` - Updated `onHide` prop type to `HideAction`
  - `src/components/sections/hatena-section.tsx` - Updated `onHide` prop type to `HideAction`
  - `src/components/sections/world-news-section.tsx` - Updated `onHide` prop type to `HideAction`
  - `src/components/home-content.tsx` - Added `handleHide` callback with optimistic Redux + server action; added `hiddenState` prop; client-side `filterHiddenArticles` on both `allArticles` and `articlesBySource`
  - `src/app/page.tsx` - Added `getHiddenState()` to parallel `Promise.all` fetch; passes `hiddenState` prop to HomeContent
  - `src/lib/queries/edition.ts` - Added `applyHiddenFilters()` internal helper for server-side filtering of hidden articles/sources/topics
  - `src/components/ui/dropdown-menu.tsx` - Added via shadcn CLI (Radix DropdownMenu primitives)
- **Learnings:**
  - **Dual-layer filtering**: Server-side filtering (in `edition.ts`) removes hidden content before it crosses the RSC→Client boundary, saving bandwidth. Client-side filtering (in `HomeContent`) handles optimistic UI for newly-hidden items without a full page reload. Both layers use identical logic.
  - **`HideAction` typed callback vs three separate callbacks**: Using a single `onHide: (action: HideAction) => void` callback with a discriminated `type` field is cleaner than `onHideArticle` + `onHideSource` + `onHideTopic`. It propagates through the component tree as a single prop and the handler uses a `switch` statement to dispatch the right Redux action.
  - **Radix DropdownMenu + overflow-hidden cards**: ArticleCard has `overflow-hidden` but Radix's DropdownMenu portals its content to the document root by default (`<DropdownMenuContent>` uses `<DropdownMenuPrimitive.Portal>`). This means the dropdown renders outside the card's clipping boundary automatically — no z-index or overflow workarounds needed.
  - **`extractKeyword()` heuristic**: For topic-based hiding, we extract the first capitalized word (>= 3 chars) from the title, excluding common stop words (The, And, For, etc.). This gives a reasonable keyword suggestion without NLP. Users can always use the settings page (US-028) to manage hidden topics later.
  - **Idempotent hide server action**: `hideItem` checks for existing hidden entries before inserting. Unlike bookmarks which use a unique constraint, hidden items don't have a unique index on (userId, targetType, targetId) in the schema — the idempotency check is done with a `SELECT` before `INSERT`.
  - **`SOURCE_COLORS`/`SOURCE_LABELS` deduplication**: Previously duplicated in `article-card.tsx`, `hero-section.tsx`, and `sns-section.tsx`. Now exported from `article-card.tsx` and imported by the other two. This ensures consistency if a new source is added to `ArticleSource`.
---

## 2026-02-07 - US-025
- What was implemented: Expandable share menu component (`ShareMenu`) with share targets for X (Twitter), Bluesky, and Copy Link. Inline animated expansion (slide-in-from-right + fade-in), click-outside-to-close behavior, and "Copied!" toast notification via sonner. Replaced the old `onShare` callback prop pattern across all card/section components with self-contained `ShareMenu` components that manage their own expanded state locally. Added `<Toaster>` to root layout for global toast notifications.
- Files changed:
  - `src/components/cards/share-menu.tsx` - New: `ShareMenu` component with inline SVG brand icons (X, Bluesky), `navigator.clipboard` for copy, click-outside handler, and `size` prop for card-size-aware rendering
  - `src/components/cards/article-card.tsx` - Replaced `onShare` callback + plain Share2 button with `ShareMenu` component using local `shareExpanded` state; removed `onShare` from `ArticleCardProps`
  - `src/components/sections/hero-section.tsx` - Same replacement in `HeroMainCard`; removed `onShare` from `HeroSectionProps` and `HeroMainCardProps`
  - `src/components/sections/sns-section.tsx` - Same replacement in `ActionButtons`; removed `onShare` from all internal props (`SnsSectionProps`, `YouTubeCardProps`, `BlueskyCardProps`, `ActionButtonsProps`)
  - `src/components/sections/content-section.tsx` - Removed `onShare` from `ContentSectionProps`
  - `src/components/sections/tech-section.tsx` - Removed `onShare` from `TechSectionProps`
  - `src/components/sections/github-section.tsx` - Removed `onShare` from `GitHubSectionProps`
  - `src/components/sections/hackernews-section.tsx` - Removed `onShare` from `HackerNewsSectionProps`
  - `src/components/sections/reddit-section.tsx` - Removed `onShare` from `RedditSectionProps`
  - `src/components/sections/hatena-section.tsx` - Removed `onShare` from `HatenaSectionProps`
  - `src/components/sections/world-news-section.tsx` - Removed `onShare` from `WorldNewsSectionProps`
  - `src/app/layout.tsx` - Added sonner `<Toaster>` with dark theme and PRD-consistent styling
  - `package.json` - Added `sonner` dependency (v2.0.7)
- **Learnings:**
  - **Self-contained vs. callback-based share**: The PRD's share menu is an inline expandable, not a modal or parent-coordinated action. This means each card should own its expansion state locally (`useState`) rather than bubbling `onShare` up to `HomeContent`. This eliminated the `onShare` prop from the entire component tree (12 files), simplifying the architecture. The `uiSlice.shareMenuArticleId` state from US-004 remains unused — a future cleanup can remove it.
  - **`sonner` vs. shadcn/ui Toast**: Sonner v2 provides a simpler API (`toast.success("Copied!")`) with zero-config positioning and theming. shadcn/ui's Toast requires a `useToast` hook + `<Toaster>` component + toast state management. For a single "Copied!" notification, sonner is the pragmatic choice.
  - **Inline SVG brand icons**: X and Bluesky don't have icons in `lucide-react`. Using inline `<svg>` functions (~5 lines each) avoids adding a brand icon library. The `aria-hidden="true"` attribute is set since the button itself has an `aria-label`.
  - **Click-outside with `setTimeout(0)` delay**: Without the microtask delay, the same `mousedown` event that opens the menu immediately triggers the outside-click handler (the event started before the menu rendered into the DOM). `setTimeout(0)` defers the listener registration until after the current event loop.
  - **`animate-in slide-in-from-right-2 fade-in`**: These are composable Tailwind CSS utility classes from `tailwindcss-animate` (bundled with shadcn/ui). They produce a combined slide + fade entrance animation matching the PRD's "animate expand left-to-right" requirement without custom `@keyframes`.
  - **`URLSearchParams` for share URLs**: Using `new URLSearchParams({ text, url }).toString()` properly encodes special characters in article titles and URLs, preventing broken share links with ampersands, quotes, or Unicode characters.
---

## 2026-02-07 - US-026
- What was implemented: Dark/light theme toggle using `next-themes` v0.4.6. ThemeProvider wrapper configured with `attribute="class"`, `defaultTheme="dark"`, `enableSystem`, `disableTransitionOnChange`. Light theme PRD tokens (`ms-*`) defined in `:root` with dark overrides moved into `.dark {}`. Sun/moon toggle button in both desktop header and mobile hamburger menu. Theme persists via localStorage (handled by `next-themes`). System preference respected via `enableSystem`.
- Files changed:
  - `package.json` - Added `next-themes` v0.4.6 dependency
  - `src/components/theme-provider.tsx` - New: client-side ThemeProvider wrapper with `attribute="class"`, `defaultTheme="dark"`, `enableSystem`
  - `src/app/globals.css` - Made `ms-*` tokens theme-aware: light values in `:root` (#FAFAFA bg, #111111 text, #DDDDDD border), dark values in `.dark {}` (#0D0D0D bg, #FFFFFF text, #333333 border). Accent (#FF6B35) unchanged across themes.
  - `src/app/layout.tsx` - Removed hardcoded `className="dark"` from `<html>`, added `suppressHydrationWarning`, wrapped with `ThemeProvider` (outermost), changed `Toaster` theme from `"dark"` to `"system"`
  - `src/components/layout/header.tsx` - Added `useTheme()` hook from `next-themes`, sun/moon toggle button in desktop right section and mobile nav, `useSyncExternalStore` for SSR-safe mounted detection, inline `SunIcon`/`MoonIcon` SVG components
- **Learnings:**
  - **`useSyncExternalStore` for mounted detection**: React 19's `react-hooks/set-state-in-effect` ESLint rule prohibits the standard `useEffect(() => setMounted(true), [])` pattern used in next-themes docs. Workaround: `useSyncExternalStore(emptySubscribe, () => true, () => false)` — returns `false` on server (SSR), `true` on client (hydrated), with no effect or setState involved. This satisfies both the ESLint rule and the hydration-safety requirement.
  - **`ms-*` token architecture change**: Previously all `ms-*` tokens were in `:root` with hardcoded dark values. For theme switching, they must follow the same pattern as shadcn variables: light values in `:root`, dark overrides in `.dark {}`. Since all components use `ms-*` Tailwind classes (not raw hex values), no component changes were needed — the CSS custom properties resolve differently based on which theme class is active.
  - **`next-themes` ThemeProvider must be outermost**: It wraps `<StoreProvider>` and `<SessionProvider>` in the component tree. This is correct because the theme context is consumed by the header (inside Redux/session providers) and also affects the Toaster styling.
  - **`disableTransitionOnChange`**: Prevents a flash of transition when switching themes — elements would briefly animate their background/text color changes. Setting this prop adds a temporary `<style>` tag that disables all CSS transitions during the theme switch.
  - **Sonner `Toaster` theme**: Changed from `"dark"` to `"system"` so the toast notification styling automatically matches the active theme without manual state tracking.
---

## 2026-02-07 - US-027
- What was implemented: Comprehensive responsive layout refinement across all breakpoints. Ensured consistent behavior at mobile (<640px), tablet (640-1024px), desktop (1024-1440px), and wide (>1440px) viewports. Fixed touch target sizes to meet 44×44px minimum per Apple HIG. Aligned header max-width with content container. Fixed nested grid issue where content sections created over-gridded layouts at tablet. Updated skeleton loading states to match actual layout breakpoints.
- Files changed:
  - `src/components/ui/button.tsx` - Updated `icon-sm` to `size-11` (44px), `lg` size to `h-11` (44px) for touch target compliance
  - `src/components/layout/header.tsx` - Header container max-width aligned to `max-w-[1440px]` with responsive padding (`sm:px-6 lg:px-8`); mobile nav links given `min-h-11` (44px); mobile edition tab buttons given `min-h-11`
  - `src/components/sections/content-section.tsx` - Changed tablet layout from `sm:grid sm:grid-cols-2` to `sm:flex-col` to prevent nested grid over-gridding when inside parent 2-col grid
  - `src/components/sections/sns-section.tsx` - Changed internal card containers from `sm:grid sm:grid-cols-1 lg:flex lg:flex-col` to `sm:flex-col`; parent grid from `lg:grid-cols-2` to `sm:grid-cols-2` for tablet support
  - `src/app/page.tsx` - Updated SNS skeleton breakpoint from `lg:grid-cols-2` to `sm:grid-cols-2` to match actual layout
  - `src/app/login/page.tsx` - OAuth buttons changed from default to `size="lg"` (h-11/44px) for touch target compliance
- **Learnings:**
  - **Nested grid problem**: When a parent container uses `grid-cols-2` (tablet) and each child section also uses `grid-cols-2`, the result is 4 very narrow columns (~140px each). The fix is to let child sections stack vertically (`flex-col`) and let the parent grid handle the column layout. This is a common pitfall in responsive grid systems.
  - **Touch targets — visual size vs hit area**: Apple HIG requires 44×44px minimum tap areas. For primary navigation (header buttons, login buttons), increasing the visual size to 44px is appropriate. For hover-overlay action buttons on cards (bookmark/share/hide), they remain smaller because they only appear on desktop hover — mobile users interact with the full card link instead.
  - **shadcn/ui button `icon-sm` size**: Changed from `size-8` (32px) to `size-11` (44px). This cascades to all header icon buttons (bookmarks, settings, theme toggle, hamburger) without modifying each individual usage.
  - **Header max-width alignment**: Changed from `max-w-7xl` (1280px) to `max-w-[1440px]` to match the main content container. Without this, the header content would be narrower than the body on wide screens, creating visual misalignment.
  - **Skeleton CLS prevention**: The `HomePageSkeleton` must mirror the exact breakpoint classes of the actual layout. When the SNS section changed from `lg:grid-cols-2` to `sm:grid-cols-2`, the skeleton had to be updated to match — otherwise layout shifts occur during streaming.
---

## 2026-02-07 - US-028
- What was implemented: Settings page with three-tab layout (Account, Hidden Items, Display Preferences) using shadcn/ui Tabs. Server Component page fetches session + hidden items in parallel, passes to SettingsContent Client Component. Account section shows avatar, name, email, and sign-out button. Hidden Items section lists all hidden items grouped by type (source/topic/article) with optimistic unhide. Display Preferences offers theme selector (dark/light/system via next-themes) and default edition toggle (morning/evening via Redux).
- Files changed:
  - `src/app/settings/page.tsx` - New: async Server Component with Suspense, fetches session + hidden items in parallel, SettingsSkeleton placeholder
  - `src/components/settings-content.tsx` - New: Client Component with shadcn/ui Tabs (Account, Hidden Items, Display Preferences sections), optimistic unhide, next-themes integration, Redux edition preference
  - `src/components/ui/tabs.tsx` - Added via shadcn CLI (Radix TabsPrimitive with line/default variants)
- **Learnings:**
  - **`theme` vs `resolvedTheme` in next-themes**: `useTheme()` returns both. `theme` is what the user selected ("dark", "light", or "system"). `resolvedTheme` is the computed value ("dark" or "light"). For button highlighting in a theme selector, use `theme` so the "System" option can be correctly identified as active — `resolvedTheme` would falsely highlight "Dark" or "Light" when the user chose "System".
  - **shadcn/ui Tabs v3.8+ API**: Uses Radix `TabsPrimitive` from `radix-ui` (not `@radix-ui/react-tabs` separately). Supports `variant="line"` for underline-style tabs. `TabsList`, `TabsTrigger`, `TabsContent` are the main building blocks. Full ARIA keyboard navigation (Arrow keys) comes for free.
  - **Parallel server fetches in page**: `Promise.all([auth(), getHiddenItems()])` runs both queries concurrently. Since the page is protected by middleware, `auth()` is guaranteed to return a session — no null-check needed for the redirect case.
  - **Optimistic unhide pattern**: Identical to the bookmarks page — `removedIds` Set for instant UI, server action for persistence, `router.refresh()` via `useTransition` for server data sync after success, revert Set on failure.
  - **Middleware protection is sufficient**: No additional auth check needed in the page component — `src/middleware.ts` matcher includes `/settings/:path*`, so the page never renders for unauthenticated users.
---

## 2026-02-07 - US-029
- What was implemented: Static About page with product vision hero, 6 key feature cards in responsive grid, 9 data source entries with emoji icons, team section linking to Laststance.io GitHub, and dual CTA buttons (Home + Sign Up). Clean typographic layout using Inter font, consistent with PRD palette and responsive breakpoints.
- Files changed:
  - `src/app/about/page.tsx` - New: Server Component with metadata, static content sections (vision, features, sources, team, CTA), responsive grid layouts, shadcn/ui Button with `asChild` for Link composition
- **Learnings:**
  - **Static vs dynamic pages**: The About page has no DB queries or runtime data, so omitting `export const dynamic = "force-dynamic"` lets Next.js statically prerender it at build time. The build output confirms `○ /about` (Static). This is optimal for Lighthouse LCP since the HTML is served from CDN with no server round-trip.
  - **`Button asChild` + `Link` composition**: shadcn/ui's `asChild` prop (via Radix `Slot.Root`) replaces the `<button>` element with the child `<Link>`, merging all button styles onto the anchor tag. This avoids invalid nested `<button><a>` HTML while preserving Next.js client-side navigation. The `cursor-pointer` class is needed because `<a>` elements styled as buttons don't get pointer cursor by default in shadcn.
  - **Emoji accessibility**: Using `role="img" aria-hidden="true"` on emoji spans ensures screen readers skip the emoji characters (which are read inconsistently across platforms) and rely on the adjacent text labels for meaning.
  - **Content page pattern**: Purely informational pages follow a simpler pattern than data-driven pages — no Suspense boundaries, no skeleton fallbacks, no async sub-components. Just a direct default export with JSX. Metadata is still exported for OGP/SEO.
---

## 2026-02-07 - US-030
- What was implemented: Full Playwright E2E test suite covering home page, edition tab switching, article card interactions, share menu, responsive layout, and navigation across 3 viewport projects (chromium desktop, mobile-chrome Pixel 5, tablet iPad). Created CI/CD pipeline via GitHub Actions. Fixed Server Component graceful degradation when DB is unreachable.
- Files changed:
  - `playwright.config.ts` - New: Playwright config with 3 projects, webServer auto-start with AUTH_SECRET/AUTH_TRUST_HOST env vars, HTML reporter for local / GitHub reporter for CI
  - `e2e/fixtures.ts` - New: Shared test utilities (mock articles, `waitForPageReady`, `isMobileViewport`, `openMobileMenu`), imported by all spec files
  - `e2e/home.spec.ts` - New: 8 tests for home page load, edition tabs, tab switching, edition date subtitle updates; all viewport-aware with mobile hamburger menu branching
  - `e2e/article-card.spec.ts` - New: 6 tests for external URLs (target="_blank"), source badges, hover actions, bookmark login redirect, hide dropdown options
  - `e2e/share-menu.spec.ts` - New: 4 tests for share expansion (X/Bluesky/Copy Link), clipboard copy, X share URL, click-outside-to-close
  - `e2e/responsive.spec.ts` - New: 7 tests for 4 breakpoints (mobile/tablet/desktop/wide), hamburger visibility, header elements, touch target compliance (44×44px)
  - `e2e/navigation.spec.ts` - New: 9 tests for logo navigation, login page OAuth buttons, about page, auth redirects (/bookmarks, /settings → /login), theme toggle (viewport-aware)
  - `e2e/.env.test` - New: Dummy env vars for test server
  - `.github/workflows/e2e.yml` - New: CI pipeline (pnpm install → playwright install → typecheck → lint → build → E2E → upload artifacts)
  - `package.json` - Added `@playwright/test` devDep, `test:e2e` and `test:e2e:ui` scripts
  - `eslint.config.mjs` - Added `e2e/`, `playwright-report/`, `test-results/` to globalIgnores
  - `.gitignore` - Added Playwright artifact dirs (`/test-results/`, `/playwright-report/`, `/blob-report/`, `/playwright/.cache/`)
  - `src/app/page.tsx` - Refactored `EditionContent` to extract `fetchEditionData()` with try/catch for graceful DB failure handling (shows "No edition available" fallback instead of Next.js error overlay)
- **Learnings:**
  - **Auth.js v5 requires `AUTH_SECRET` even in dev**: Without it, the Next.js dev server crashes with `MissingSecret`. Playwright's `webServer.env` is the correct place to set test-only env vars — not `.env.local` which would affect manual development.
  - **Server Component error handling and Suspense**: When an async Server Component throws (e.g., DB connection failure), the Suspense boundary **does not** catch thrown errors — it only catches suspended promises. The component must use try/catch internally and return a fallback JSX. This is why `fetchEditionData()` was extracted with try/catch returning `null`.
  - **React 19 `react-hooks/error-boundaries` rule**: JSX inside try/catch blocks is flagged by this ESLint rule ("Avoid constructing JSX within try/catch"). The fix is to separate data fetching (with try/catch, returns data/null) from JSX rendering (no try/catch, uses conditional rendering). This pattern: `async function fetchData() { try { ... } catch { return null; } }` + `async function Component() { const data = await fetchData(); if (!data) return <Fallback />; return <Content data={data} />; }`.
  - **Viewport-aware E2E tests**: Playwright multi-project config runs identical spec files at different viewport sizes. Tests must detect the viewport and branch accordingly — mobile viewports hide desktop nav (`hidden sm:flex`) and show a hamburger menu. The pattern: `isMobileViewport(page)` checks `page.viewportSize().width < 640` (Tailwind `sm:` breakpoint).
  - **Mobile menu DOM scoping**: Using `.first()` on `page.getByRole("tab")` on mobile picks the hidden desktop tab (still in DOM, just `display: none`). Must scope to `page.getByLabel("Mobile navigation")` to target visible mobile elements.
  - **Playwright `reuseExistingServer`**: Setting `reuseExistingServer: !process.env.CI` reuses a running dev server in local development (faster iteration) while always starting fresh in CI (deterministic). The `webServer.command` only runs when no server is listening on the port.
  - **GitHub Actions Playwright caching**: `npx playwright install --with-deps chromium` installs only the Chromium browser (not Firefox/WebKit), reducing CI time by ~60%. The `--with-deps` flag installs OS-level dependencies (libs for headless rendering) that Ubuntu runners don't include by default.
  - **114 tests across 3 projects**: 38 spec tests × 3 viewport projects = 114 total. All pass in 15.3s locally. The parallelism (`fullyParallel: true`) runs tests within each project concurrently while projects run sequentially.
---

## 2026-02-07 - US-031
- What was implemented: Performance optimization and deployment configuration. Configured Next.js Image optimization with `remotePatterns` for all 9 external thumbnail CDN domains (GitHub, Reddit, YouTube, ProductHunt, Hatena, Bluesky, RSS feeds). Installed and integrated `@vercel/analytics` (v1.6.1) and `@vercel/speed-insights` (v1.3.1) for Vercel Analytics and Web Vitals monitoring. Created dynamic OG image and Twitter card image using `ImageResponse` (edge runtime). Consolidated metadata with `metadataBase`, title template (`%s | MorningStack`), and inherited OG/Twitter defaults in layout. Added HTTP cache headers: immutable for `/_next/static`, 1-day SWR for `/_next/image`, no-store for cron API, and security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy). Added DNS prefetch hints for top image CDNs. Configured `minimumCacheTTL: 3600` for optimized image caching.
- Files changed:
  - `next.config.ts` - Added `images.remotePatterns` (17 domains), `images.deviceSizes`/`imageSizes`, `minimumCacheTTL`, and `headers()` function for cache control + security headers
  - `package.json` - Added `@vercel/analytics` and `@vercel/speed-insights` dependencies
  - `src/app/layout.tsx` - Added `Analytics` + `SpeedInsights` components, `metadataBase` with `VERCEL_PROJECT_PRODUCTION_URL`, title template, inherited OG/Twitter config, `<head>` with DNS prefetch links
  - `src/app/opengraph-image.tsx` - New: Edge-runtime OG image generator (1200×630 branded card with title, tagline, source badges, PRD colors)
  - `src/app/twitter-image.tsx` - New: Re-exports OG image generator for Twitter card, with `runtime = "edge"` declared inline
  - `src/app/page.tsx` - Simplified metadata to page-specific OG/Twitter overrides only (title/desc inherited from layout)
  - `src/app/about/page.tsx` - Updated title to template format (`"About"` → renders as `"About | MorningStack"`)
  - `src/app/bookmarks/page.tsx` - Updated title to template format
  - `src/app/settings/page.tsx` - Updated title to template format
  - `vercel.json` - Unchanged (cron schedules already configured from US-015)
- **Learnings:**
  - **Route segment config exports cannot be re-exported**: Next.js Turbopack statically analyzes `runtime`, `dynamic`, `revalidate` etc. at compile time — before module resolution. If these are re-exported from another file (`export { runtime } from "./other"`), the analyzer fails with "can't recognize the exported field". Must be declared as direct `export const runtime = "edge"` in each file.
  - **`metadataBase` and `VERCEL_PROJECT_PRODUCTION_URL`**: Vercel automatically sets `VERCEL_PROJECT_PRODUCTION_URL` (without protocol) at build time. Using `new URL(\`https://$\{env\}\`)` as `metadataBase` allows Next.js to resolve relative OG image URLs to absolute URLs. Falls back to `http://localhost:3000` for local development.
  - **Title template pattern**: Layout's `title: { default: "...", template: "%s | MorningStack" }` auto-appends the brand name to page-level titles. Pages use a simple string (`title: "About"`) and the template produces `"About | MorningStack"`. The default value is used when no page-level title is set.
  - **Vercel Analytics placement**: `<Analytics />` and `<SpeedInsights />` are placed outside providers (directly in `<body>`) since they don't consume any React context. They self-disable in development and only load tracking scripts in production on Vercel.
  - **`minimumCacheTTL` for images**: Sets the minimum time (seconds) that optimized images are cached by the CDN. Default is 60s which is too short for article thumbnails that rarely change. 3600s (1 hour) matches the article source cache TTL.
  - **DNS prefetch vs preconnect**: `dns-prefetch` resolves DNS only (lightweight, safe for many domains). `preconnect` establishes full connection (DNS + TCP + TLS) — more expensive, use only for critical-path domains. For article thumbnails that may or may not appear, `dns-prefetch` is the correct choice.
  - **`ImageResponse` from `next/og`**: Uses Satori (JSX → SVG → PNG) under the hood. Supports a subset of CSS Flexbox layout. No CSS Grid, no `position: absolute`, limited font support (uses system fonts by default). Edge runtime is required for the image generation.
  - **Env vars for deployment**: `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `CRON_SECRET`, `OPENWEATHERMAP_API_KEY`, `YOUTUBE_API_KEY`, `PRODUCTHUNT_API_TOKEN` must be configured in Vercel Dashboard → Settings → Environment Variables. These are secrets and should never be in `vercel.json`.
---
