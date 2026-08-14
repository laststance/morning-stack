# TODOS

## Product

### Persist the Default Edition preference

**What:** Persist the Settings choice for Morning or Evening and apply it when the home URL does not select an edition.

**Why:** The current Settings copy says the choice controls which edition loads by default, but it only updates in-memory Redux state and disappears on reload.

**Context:** `DisplayPreferencesSection` dispatches `setEditionType()`, while the server-rendered home page independently chooses Morning or Evening from the current JST hour. Define the persistence location, signed-out behavior, and precedence between the saved preference, explicit URL parameters, and the time-based default before implementation.

**Effort:** M
**Priority:** P2
**Depends on:** None

## Data Integrity

### Enforce one Edition per type and date

**What:** Audit duplicate Edition rows, resolve any conflicts safely, and add a unique index on `editions(type, date)`.

**Why:** The collector checks for an existing Edition before inserting, but concurrent collection requests can both pass that check because the database does not enforce the product invariant.

**Context:** `findExistingEdition()` and `getWritableDraftEdition()` implement normal retry idempotency with a select-then-insert flow. Historical URLs assume one deterministic Edition per Morning/Evening date, while `getEdition()` currently limits an unconstrained query to one row. Run a production duplicate audit before generating the migration; do not delete or merge rows without reviewing their linked articles and publication status.

**Effort:** M
**Priority:** P1
**Depends on:** Production duplicate audit

## Completed
