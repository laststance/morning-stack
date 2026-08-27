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

### Replace navigation tabs with link semantics

**What:** Convert the Morning/Evening header selector from incomplete tab roles to navigation links with `aria-current`.

**Why:** Page navigation should not promise arrow-key tab behavior or a tabpanel relationship that the interface does not implement.

**Pros:** Screen-reader and keyboard users get a conventional, accurate navigation model.
**Cons:** Header interaction tests and both desktop/mobile selector variants need coordinated updates.
**Context:** The current controls navigate between URLs instead of swapping a local tabpanel, so link semantics match the observable behavior.
**Effort:** S
**Priority:** P2
**Depends on:** None

### Route glass utility colors through design tokens

**What:** Replace the direct dark OKLCH values in `glass-subtle` with the shared `ms-glass-*` tokens for both themes.

**Why:** Light-theme action surfaces should inherit the same semantic surface system as the rest of the product.

**Pros:** Theme tuning becomes centralized and action controls no longer carry a one-off color system.
**Cons:** Requires contrast and hover-state verification across popovers, compact actions, and the header.
**Context:** The current rendered surface is legible, so this is design-system cleanup rather than a blocker for the editorial layout.
**Effort:** S
**Priority:** P3
**Depends on:** None

### Revisit global shell and editorial column alignment

**What:** Decide whether the 1440px header shell should align to the 1240px home reading column or remain intentionally wider.

**Why:** At wide viewports the logo and header actions sit outside the article grid axis, which can read as either deliberate framing or subtle misalignment.

**Pros:** A product-wide decision would make alignment consistent across Home, Bookmarks, Settings, and About.
**Cons:** Changing only the home header would create cross-page drift, so the work requires a global-shell review.
**Context:** Keep the current 1240px content width; it solved the oversized container problem and reads well at 1440px.
**Effort:** M
**Priority:** P3
**Depends on:** Global shell design review

## Completed
