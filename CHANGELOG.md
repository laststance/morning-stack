# Changelog

## 0.1.1 - 2026-06-18

- Persist weather and market widget snapshots to Supabase as a durable fallback when Redis is unavailable.
- Refresh widget snapshots even when a manual or scheduled cron run skips an already-published edition.
- Switch stock collection to the Yahoo Finance chart endpoint and keep partial market data when one symbol fails.
