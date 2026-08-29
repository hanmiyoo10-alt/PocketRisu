# Backfill review — PocketRisu-kotono dynamic-list lifecycle balance

Source: `Nagase-Kotono/PocketRisu-kotono`
Reviewed commit: `cdd71970233438d7d2a49f860d597cf944d5a846`
Review date: 2026-08-29

## Finding

The commit ports a set of isolated client fixes, including a reusable UI-state invariant around dynamic editor lists. Open rows increment list-level state used to disable/rebuild Sortable behavior. Deletion, parent array replacement, or parent unmount could remove a row without balancing the corresponding close operation, leaving the counter negative or positive and making drag reordering remain disabled. The fix couples cleanup to component destruction, keys row identity, keeps open/close classification symmetric, and avoids rebuilding Sortable against a detached node.

This is transferable as an ownership/lifecycle lesson, not as a blind code port.

## Classification

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `MEDIUM`
- `Difficulty`: `LOW`
- `Size`: `XS`
- `Evidence`: `MEDIUM`
- `Risk`: `LOW`
- `Dependencies`: matching PocketRisu-owned dynamic editor/list with aggregate open-state or drag-disable counter; demonstrated stale-counter path
- `Priority`: `P1`
- lifecycle status: `HOLD`
- source evidence: `Nagase-Kotono/PocketRisu-kotono` `cdd71970233438d7d2a49f860d597cf944d5a846`
- benefit: prevents UI interaction state from becoming permanently stuck after row deletion/list replacement/unmount
- conflict/risk: applying generic lifecycle hooks where no aggregate owner exists can create duplicate teardown or counter underflow; source structure differs from current PocketRisu fork
- validation need: reproduce an owner with open-row aggregate state, then test deletion of open/closed rows, parent dataset replacement, parent unmount, keyed reorder, and Sortable recreation only on connected nodes
- follow-up: keep as invariant; promote only if a matching PocketRisu owner and reproducible stale-state path are found

## PocketRisu inspection

Bounded code search in `hanmiyoo10-alt/PocketRisu` did not find the source `RegexData` / `openedDetails` ownership pattern. No implementation branch was created.

## Historical coverage

This review is a bounded single-source historical slice. It does not justify moving any active forward cursor backward or advancing `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.