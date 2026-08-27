# TODOS

## Product

### Persist the Default Edition preference

**What:** Persist the Settings choice for Morning or Evening and apply it when the home URL does not select an edition.

**Why:** The current Settings copy says the choice controls which edition loads by default, but it only updates in-memory Redux state and disappears on reload.

**Context:** `DisplayPreferencesSection` dispatches `setEditionType()`, while the server-rendered home page independently chooses Morning or Evening from the current JST hour. Define the persistence location, signed-out behavior, and precedence between the saved preference, explicit URL parameters, and the time-based default before implementation.

**Effort:** M
**Priority:** P2
**Depends on:** None

### Evaluate an alternate editorial typeface

**What:** Compare Inter with a small set of editorial display faces before changing the established body typography.

**Why:** The Home lead now owns the single `h1` and its supporting hierarchy is explicit, but Inter can still make the publication feel visually generic.

**Context:** Preserve the current Inter, Noto Sans JP, and JetBrains Mono roles until a bilingual comparison proves that a replacement improves identity without weakening dense reading.

**Effort:** M
**Priority:** P3
**Depends on:** None

### Replace remaining broad transition-all usage

**What:** Audit shared cards and sections, then replace `transition-all` with the exact color, transform, border, opacity, or shadow properties that animate.

**Why:** Broad transitions make motion harder to reason about and can animate unrelated layout changes.

**Context:** Editorial cards now animate explicit properties and disable decorative motion for reduced-motion readers. Finish the same audit in shared UI primitives such as Button and Tabs, then validate hover and focus behavior.

**Effort:** S
**Priority:** P3
**Depends on:** None

## Completed
