# TODOS

## Product

### Persist the Default Edition preference

**What:** Persist the Settings choice for Morning or Evening and apply it when the home URL does not select an edition.

**Why:** The current Settings copy says the choice controls which edition loads by default, but it only updates in-memory Redux state and disappears on reload.

**Context:** `DisplayPreferencesSection` dispatches `setEditionType()`, while the server-rendered home page independently chooses Morning or Evening from the current JST hour. Define the persistence location, signed-out behavior, and precedence between the saved preference, explicit URL parameters, and the time-based default before implementation.

**Effort:** M
**Priority:** P2
**Depends on:** None

## Completed
