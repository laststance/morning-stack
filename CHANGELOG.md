# Changelog

## [0.2.0] - 2026-08-28

### Added

- Read each edition as one focused editorial flow with a lead story, descriptive repository highlights, supporting headlines, and source-owned sections.
- See concise context on large Hacker News and GitHub stories so prominent cards explain why they deserve attention.
- Use the same bookmark, share, and hide controls across lead, repository, ranked, social, video, and pull-request stories.

### Changed

- Keep the briefing inside a calmer 1240px reading column with source-specific layouts, balanced one-to-five-story grids, and equal-height social rows.
- Improve scanning with stronger repository hierarchy, readable story summaries, higher-contrast source badges, and intentionally eager above-the-fold repository media.
- Preserve one editorial order across mobile, tablet, and desktop while keeping touch targets and compact desktop actions appropriate to each viewport.

### Fixed

- Prevent promoted stories from repeating in their original source sections while retaining their original source rank.
- Make the full lead-story surface open the article and keep every expanded action inside narrow cards.
- Follow visible share destinations in keyboard order and report clipboard rejection without showing a false copied state.

## 0.1.1 - 2026-06-18

- Persist weather and market widget snapshots to Supabase as a durable fallback when Redis is unavailable.
- Refresh widget snapshots even when a manual or scheduled cron run skips an already-published edition.
- Switch stock collection to the Yahoo Finance chart endpoint and keep partial market data when one symbol fails.
