# UX Gap Report: MorningStack -- dashboard

**Date**: 2026-06-16  
**Target**: https://morning-stack.vercel.app/  
**Category**: dashboard  
**Session**: Production public session via playwright-cli

## Overall Score: 52/100

| Dimension | Score | Verdict |
|-----------|-------|---------|
| Typography & Spacing | 18/25 | Good |
| Interactive States | 13/25 | Needs Work |
| Content Hierarchy | 14/25 | Needs Work |
| Loading & Error UX | 7/25 | Poor |

## Routes Discovered

| Route | Observed State |
|-------|----------------|
| `/` | Renders global shell, but main dashboard shows only "No edition available" |
| `/about` | Renders polished product/about content |
| `/bookmarks` | Renders empty bookmarks state even when auth/session is failing |
| `/settings` | Renders account UI with `Unknown`, `No email`, and `Sign out` while unauthenticated |
| `/login` | Redirects with `307` back to `/`; no login screen is reachable |

## Critical Gaps

### 1. Production Dashboard Has No Useful Recovery Path

**Evidence**: `screenshots/prod-dashboard-initial-desktop.png`, `screenshots/prod-dashboard-mobile.png`

![Production dashboard empty state](./screenshots/prod-dashboard-initial-desktop.png)

**What top-tier apps do**: Vercel and Linear preserve user trust during empty or unavailable states by explaining whether data is loading, absent, delayed, or failed. They usually provide a next action: retry, view status, configure source, or open docs.

**Your app**: The production home page is a large blank canvas with only `No edition available` and `The next edition is being prepared. Check back soon!`. There is no visible retry, last update time, source health, cron status, or CTA. Since MorningStack's core promise is a morning/evening briefing, this reads as product failure rather than a graceful empty state.

**Likely files**: `src/app/page.tsx`, `src/app/api/cron/collect/route.ts`, `src/lib/queries/edition.ts`

**Fix**:

```tsx
function NoEditionFallback() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 text-center">
      <p className="rounded-full border border-ms-border px-3 py-1 text-xs text-ms-text-muted">
        Edition data unavailable
      </p>
      <h1 className="text-3xl font-semibold text-ms-text-primary">
        Today's briefing is not ready yet
      </h1>
      <p className="text-ms-text-secondary">
        We could not find a published morning or evening edition. Try again, or check the latest source collection status.
      </p>
      <div className="flex gap-3">
        <Button asChild><Link href="/">Retry</Link></Button>
        <Button variant="outline" asChild><Link href="/about">How MorningStack works</Link></Button>
      </div>
    </section>
  );
}
```

Also consider storing the latest cron result and displaying `last successful collection`, failed source count, and next scheduled run.

### 2. Auth Is Broken and the UI Hides the Failure

**Evidence**: `screenshots/prod-login-desktop.png`, `screenshots/prod-settings-logged-out.png`, `screenshots/prod-console.txt`

![Settings unauthenticated state](./screenshots/prod-settings-logged-out.png)

**What top-tier apps do**: Stripe and Vercel make auth state explicit. A protected page either redirects to login or renders a clear signed-out state. API/session failures are surfaced as recoverable UI states, not silent console noise.

**Your app**:

- `/login` returns `307` to `/`, so the Login button leads back to the empty home screen.
- `/api/auth/session` returns `500` with Auth.js server configuration error.
- `/settings` still renders `Unknown`, `No email`, and a `Sign out` button despite no valid session.
- Console logs include repeated Auth.js errors and a minified React hydration error `#418`.

**Likely files**: `src/lib/auth.ts`, `src/app/login/page.tsx`, `src/app/settings/page.tsx`, `src/components/session-provider.tsx`, `src/middleware.ts`

**Fix**:

```tsx
async function SettingsData() {
  const session = await auth();

  if (!session?.user) {
    return (
      <SignedOutState
        title="Sign in to manage settings"
        description="Bookmarks, hidden sources, and display preferences are saved to your account."
        actionHref="/login?callbackUrl=/settings"
      />
    );
  }

  const hiddenItems = await getHiddenItems();
  return <SettingsContent session={session} hiddenItems={hiddenItems} />;
}
```

Operationally, verify production `AUTH_SECRET`, provider IDs/secrets, callback URLs, and database adapter connectivity.

## Moderate Gaps

### 3. Header Center Cluster Is Too Compressed

**Evidence**: `screenshots/prod-dashboard-initial-desktop.png`, `screenshots/prod-about-desktop.png`

**What top-tier apps do**: Linear and Vercel keep app shell metadata legible by separating primary navigation, status, and timestamps. Active indicators do not visually collide with captions.

**Your app**: The active orange underline and `Jun 16, 2026 - Morning Edition` sit in a 49px header and visually collide. It is especially visible on the about page where the orange line overlaps the date row.

**Likely file**: `src/components/layout/header.tsx`

**Fix**: Increase desktop header height to around 56-64px, give the edition tabs and date separate rows with explicit `gap-1`, and move the active indicator to the tab bottom rather than the date line.

### 4. Mobile Menu Opens as a Large Inline Panel Without Context

**Evidence**: `screenshots/prod-mobile-menu-open.png`

![Mobile menu open](./screenshots/prod-mobile-menu-open.png)

**What top-tier apps do**: Notion and Linear use mobile overlays/drawers that make scope obvious and preserve orientation. The menu feels like navigation chrome, not content inserted into the document flow.

**Your app**: The mobile menu pushes the empty dashboard down and consumes nearly half the screen. Login is plain orange text while other actions have icons, so the most important signed-out action has the weakest affordance.

**Likely file**: `src/components/layout/header.tsx`

**Fix**: Use a sheet/drawer pattern with a backdrop or top-aligned panel. Make Login a full-width button, keep nav item sizing consistent, and close the menu on route change.

### 5. Empty States Are Under-Specified Across User Features

**Evidence**: `screenshots/prod-bookmarks-logged-out.png`, `screenshots/prod-settings-logged-out.png`

**What top-tier apps do**: Product empty states teach the loop: what this area is for, how to populate it, and what to do next.

**Your app**: Bookmarks says `No bookmarks yet` and `Click the star icon on any article to save it here`, but production has no articles visible and auth is failing. Settings displays account controls without a real account.

**Likely files**: `src/app/bookmarks/page.tsx`, `src/app/settings/page.tsx`

**Fix**: Split empty states by cause:

- signed out: "Sign in to save bookmarks"
- no edition/articles: "Bookmarks appear after an edition is published"
- true empty account: "No saved articles yet"

## Strengths

- Dark visual system is cohesive, especially on `/about`.
- Card spacing and type rhythm on about/data-source sections are solid.
- Keyboard focus ring is visible on the brand link.
- Mobile layout avoids horizontal overflow in the checked pages.

## Recommendations Summary

| Priority | Gap | Estimated Effort |
|----------|-----|------------------|
| Critical | Production dashboard has no useful recovery path | M |
| Critical | Auth/session failure is hidden behind broken login/settings UI | M |
| Moderate | Header center cluster is too compressed | S |
| Moderate | Mobile menu panel lacks strong navigation affordance | S |
| Moderate | Empty states do not distinguish signed-out, no-data, and failed-data causes | S-M |

## Captured Evidence

- `screenshots/prod-dashboard-initial-desktop.png`
- `screenshots/prod-dashboard-mobile.png`
- `screenshots/prod-mobile-menu-open.png`
- `screenshots/prod-about-desktop.png`
- `screenshots/prod-about-mobile-top.png`
- `screenshots/prod-about-desktop-bottom.png`
- `screenshots/prod-about-mobile-bottom.png`
- `screenshots/prod-bookmarks-logged-out.png`
- `screenshots/prod-settings-logged-out.png`
- `screenshots/prod-console.txt`
- `screenshots/prod-requests.txt`
