# UX Gap Report: MorningStack -- dashboard after production data

**Date**: 2026-06-17  
**Target**: https://morning-stack.vercel.app/  
**Category**: dashboard  
**Session**: Production public session via playwright-cli

## Overall Score: 66/100

| Dimension | Score | Verdict |
|-----------|-------|---------|
| Typography & Spacing | 16/25 | Needs Work |
| Interactive States | 17/25 | Needs Work |
| Content Hierarchy | 18/25 | Good |
| Loading & Error UX | 15/25 | Needs Work |

## Routes Discovered

| Route | Observed State |
|-------|----------------|
| `/` | Production articles now render for morning/evening editions |
| `/bookmarks` | Public route is reachable, but still depends on the broken auth/session surface |
| `/settings` | Public route is reachable, but signed-out state remains unclear until auth is fixed |
| `/login` | Still affected by Auth.js production configuration errors |

## Improvements Since Previous Audit

- Production dashboard no longer renders the large `No edition available` blank state.
- Morning and evening collection now provide article cards and source sections.
- Desktop card hover controls are discoverable and visually consistent.
- The dark visual system remains cohesive once real content is present.

## Critical Gaps

### 1. Auth Session Fails in Production

**Evidence**: browser console errors during dashboard audit; `/api/auth/session` returns `500`.

**What top-tier apps do**: Vercel and Stripe keep account-dependent affordances explicit. If auth is unavailable, they show a contained signed-out or service-error state and avoid repeated console failures.

**Your app**: The public news feed now survives auth failure, but the browser still logs repeated Auth.js configuration errors. Login, settings, bookmarks, save, and hide actions are therefore not trustworthy yet.

**Likely files**: `src/lib/auth.ts`, `src/app/login/page.tsx`, `src/app/settings/page.tsx`, `src/components/session-provider.tsx`

**Fix**: Verify production `AUTH_SECRET`, provider IDs/secrets, callback URLs, and any auth adapter/database settings. Keep this as the final UX fix so feed and shell issues can be improved first without mixing operational auth work into visual PRs.

## Moderate Gaps

### 2. Header Center Cluster Collides With Its Own Metadata

**Evidence**: `screenshots/production-data-desktop.png`

![Production dashboard desktop](./screenshots/production-data-desktop.png)

**What top-tier apps do**: Linear and Vercel keep navigation, active indicators, and timestamp metadata in distinct rows or well-spaced groups. Active indicators never cross small metadata text.

**Your app**: The orange active indicator overlaps the date row. The header also displays `Jun 16, 2026 - Morning Edition` while the freshly collected edition records are for `2026-06-17`, which makes the shell feel stale.

**Fix**: Increase desktop header height, separate tabs and date with an explicit gap, and initialize the client edition date from the server-rendered edition instead of only from the browser's current date.

### 3. Mobile Starts With Unavailable Widgets Before The Main Story

**Evidence**: `screenshots/production-data-mobile.png`

![Production dashboard mobile](./screenshots/production-data-mobile.png)

**What top-tier apps do**: Notion and Linear preserve the primary workflow on small screens. Secondary cards move below the main task when they are empty or unavailable.

**Your app**: On mobile, `Weather data unavailable` and `Market data unavailable` consume the first viewport before the lead story. This makes the production feed feel broken even though articles are available.

**Fix**: On mobile, render the lead story before daily widgets. Hide unavailable widget cards or compact them into a source-status row until data exists.

### 4. Widget Error States Are Dead Ends

**Evidence**: `screenshots/production-data-desktop.png`, `screenshots/production-data-mobile-menu.png`

![Production mobile menu](./screenshots/production-data-mobile-menu.png)

**What top-tier apps do**: Stripe-style operational UI distinguishes between unavailable, delayed, and not configured states. It includes a small timestamp, status label, or retry path.

**Your app**: Weather and market widgets only say `data unavailable`. Weather collection succeeded during the manual cron kick, while stocks did not, so the UI does not reflect real source health.

**Fix**: Show a compact status state such as `No weather snapshot for this edition` or `Market source unavailable`, plus the latest successful collection time when available. Avoid reserving a large empty card when no data exists.

### 5. Image Fallbacks Read As Placeholder Blocks

**Evidence**: `screenshots/production-data-desktop.png`

**What top-tier apps do**: News products and GitHub-style cards use either actual imagery, compact no-image layouts, or source-branded placeholders that still communicate intent.

**Your app**: Many article cards show a large dark rectangle with a single source letter (`H`, `T`). This dominates the page and makes real data look unfinished.

**Fix**: When an article has no usable image, switch to a compact text-first card variant or use a smaller source badge area. Avoid full-bleed placeholders for sources that rarely provide images.

### 6. Mobile Menu Has Weak Account Affordance

**Evidence**: `screenshots/production-data-mobile-menu.png`

**What top-tier apps do**: Mobile app shells treat account actions as clear buttons or menu rows with consistent spacing and icons.

**Your app**: The menu pushes content down, the close button is visually heavier than the menu itself, and `Login` appears as plain orange text while other actions have icons.

**Fix**: Convert `Login` into a full-width button row, make the close control quieter, and consider a top-aligned sheet pattern. This can be separate from the final auth configuration fix.

## Strengths

- Real production data now makes the core product promise visible.
- Card rhythm and section density work well on desktop once content is available.
- Hover actions on article cards are clear and restrained.
- No horizontal overflow was observed on the checked mobile viewport.

## Recommendations Summary

| Priority | Gap | Estimated Effort |
|----------|-----|------------------|
| Critical | Auth/session production failure | M |
| Moderate | Header tabs/date collision and stale displayed date | S |
| Moderate | Mobile article hierarchy blocked by unavailable widgets | S |
| Moderate | Widget unavailable states are too vague and too large | S |
| Moderate | Full-bleed source-letter image fallbacks feel unfinished | M |
| Moderate | Mobile menu account action has weak affordance | S |

## Suggested PR Order

1. Header date/tabs layout and edition date initialization.
2. Mobile hierarchy plus compact unavailable widgets.
3. Image fallback treatment for no-image article cards.
4. Mobile menu account affordance.
5. Production auth/session fix.

## Captured Evidence

- `screenshots/production-data-desktop.png`
- `screenshots/production-data-card-hover.png`
- `screenshots/production-data-evening.png`
- `screenshots/production-data-mobile.png`
- `screenshots/production-data-mobile-menu.png`
