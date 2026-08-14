# TODOS

## Product

### Persist the Default Edition preference

**What:** Persist the Settings choice for Morning or Evening and apply it when the home URL does not select an edition.

**Why:** The current Settings copy says the choice controls which edition loads by default, but it only updates in-memory Redux state and disappears on reload.

**Context:** `DisplayPreferencesSection` dispatches `setEditionType()`, while the server-rendered home page independently chooses Morning or Evening from the current JST hour. Define the persistence location, signed-out behavior, and precedence between the saved preference, explicit URL parameters, and the time-based default before implementation.

**Effort:** M
**Priority:** P2
**Depends on:** None

### Define the editorial type hierarchy and Home h1

**What:** Decide whether Inter remains the editorial face, then add a meaningful Home `h1` and document the resulting headline scale.

**Why:** The current interface is consistent but visually generic, and the Home heading outline begins at `h2` even though the rendered hierarchy looks correct.

**Context:** This requires a product-wide identity and semantic-heading decision rather than a diff-scoped historical-navigation change. Preserve the current Inter, Noto Sans JP, and JetBrains Mono roles until the replacement is approved.

**Effort:** M
**Priority:** P3
**Depends on:** None

### Replace broad transition-all usage

**What:** Audit shared cards and sections, then replace `transition-all` with the exact color, transform, border, opacity, or shadow properties that animate.

**Why:** Broad transitions make motion harder to reason about and can animate unrelated layout changes.

**Context:** The design audit found this pattern across the existing component system, not only in historical-edition code. Validate hover, focus, and reduced-motion behavior during the cleanup.

**Effort:** S
**Priority:** P3
**Depends on:** None

## Completed
