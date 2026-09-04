# TODOS

## Product

No open product tasks.

## Completed

### 2026-09-05 — Remaining product backlog

Fixed by /design-review on `codex/complete-remaining-todos`, 2026-09-05.

- Persisted Default Edition in a one-year, HTTP-only browser cookie. Explicit `edition` URLs take precedence, then the saved choice, then the JST time default; the preference survives sign-out.
- Compared Inter, Newsreader, Source Serif 4, and Noto Serif JP against English and Japanese editorial content. Selected Noto Serif JP for the single Home lead headline while keeping Inter, Noto Sans JP, and JetBrains Mono in their established roles.
- Replaced the final `transition-all` uses in Button and Tabs with explicit color, background, border, shadow, opacity, scale, and translate transitions.
- Converted desktop and mobile Morning/Evening selectors to links with `aria-current`, modifier-key behavior, historical-date retention, and coordinated E2E coverage.
- Routed `glass-subtle` background, border, and highlight through `ms-glass-*` tokens and verified both themes.
- Standardized the Header, Home, Bookmarks, Settings, and About shells on the 1240px editorial axis.
