# MorningStack Design System

Status: inferred and validated against the rendered product on 2026-08-14. Treat this as the current baseline; update it when a product-wide visual decision changes.

## Product Character

MorningStack is a quiet, high-signal developer newspaper. The interface should make the edition, date, source, headline, and reading state legible before decorative elements are noticed.

- Prefer restrained editorial hierarchy over dashboard density.
- Use one orange accent for active, hover, focus, and score emphasis.
- Keep historical browsing visually continuous with the current briefing.
- Use cards only when content is independently actionable or grouped as a widget.
- Keep recovery copy specific, short, and paired with an obvious next action.

## Foundations

### Color

Use the semantic MorningStack tokens from `src/app/globals.css`; do not introduce page-local hex values for product surfaces.

| Token                         | Role                                                     |
| ----------------------------- | -------------------------------------------------------- |
| `ms-bg-primary`               | Page canvas                                              |
| `ms-bg-secondary`             | Primary raised surface                                   |
| `ms-bg-tertiary`              | Secondary elevation and quiet controls                   |
| `ms-text-primary`             | Headlines and primary labels                             |
| `ms-text-secondary`           | Supporting copy and visited headlines                    |
| `ms-text-muted`               | Metadata and inactive labels                             |
| `ms-accent`                   | Active edition, hover, focus, and score emphasis         |
| `ms-border`                   | Structural dividers and card outlines                    |
| `ms-positive` / `ms-negative` | Market direction only                                    |
| `ms-glass-*`                  | Translucent header, panel, and compact-action treatments |

Dark and light themes must preserve the same role hierarchy. Orange is an accent, not a general background color.

### Typography

- Inter is the default UI and editorial face.
- Noto Sans JP is available for Japanese text.
- JetBrains Mono is reserved for scores, prices, timestamps, and other compact numeric data.
- Lead headlines use the strongest weight; section labels stay compact and uppercase where already established.
- Every page needs a meaningful `h1`, followed by ordered `h2` and `h3` sections even when visual sizing differs.

Typeface replacement is a product identity decision. Do not mix in a second editorial family on a single feature.

### Spacing and Shape

- Build layout from the observed 4px rhythm, favoring 4, 8, 12, 16, 24, and 32px intervals.
- Use the shared radius scale rooted at `0.625rem`; historical navigation should not introduce a separate shape language.
- Preserve generous separation between the Date Rail, lead story, and source sections.
- Avoid oversized empty card shells unless media or multiple stories justify the space.

## Edition Navigation

The Date Rail is the single visual anchor for time travel.

- Previous day, selected date, and next day form one centered control group.
- The URL remains authoritative for date and Morning/Evening state.
- A historical edition says `Historical edition`; today uses the normal current-edition presentation.
- Historical pages show stored articles only. Weather, markets, and the ticker belong to the current edition.
- If an exact date/type was not published, explain that exact absence and offer Previous day and Today recovery.
- Navigation failures must not hide already-readable article content.
- The date picker must disable unavailable future dates and restore focus to its trigger after dismissal.

## Cards and Article Actions

- Article cards expose source, recency, score, title, and reading actions without competing with the headline.
- On touch layouts, bookmark, share, and hide controls remain visible in a footer row with at least 44×44px targets.
- On desktop, the same row may use compact 28–32px controls and appear on card hover or keyboard focus.
- Expanded share actions must retain the touch target size and remain inside the card at 320px width.
- Visited headlines use secondary text; hover and focus return to orange with an underline.

## Responsive Behavior

- Validate at 320px, 375px, 768px, and 1280px.
- Mobile order follows task priority: edition date, lead story, repository, current widgets, then remaining source sections.
- The mobile header expands in normal document flow so the Date Rail does not jump behind an overlay.
- No horizontal scrolling is acceptable for the Date Rail, article actions, calendars, or recovery states.

## Accessibility and Motion

- All icon-only controls require explicit accessible labels.
- Keyboard focus must reveal any desktop hover-only action and use the shared focus ring.
- Touch targets are at least 44×44px for primary and recovery actions.
- Honor reduced-motion preferences.
- Prefer property-specific transitions. Do not add new `transition-all` usage.
- Popovers may animate in, but their settled surface must be opaque enough for text contrast.

## Visual Anti-Patterns

- Multiple competing accent colors for navigation state.
- A separate “archive mode” theme, banner, or page shell.
- Hidden touch actions that depend on hover discovery.
- Generic instructional prose when a short label and recovery action are sufficient.
- Decorative glass, gradients, or cards without information hierarchy or interaction value.
