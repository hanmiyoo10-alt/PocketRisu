# Forward idea addendum — 2026-08-26 — kwaroran/Risuai

## NO_SYSTEM_UPDATE

### P1 — Translation-aware partial edit ownership

- Lifecycle: `DESIGN_NEEDED`
- Source evidence: `kwaroran/Risuai` `e565563a288ebe4c65b6099a1645ba477d1c84b4` (merged PR #1521; net change since registered cursor `7101c3c9e71f56e603a25e239554333fc9100695`).
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: reproduce translated-view partial edit on current PocketRisu `develop`; confirm LLM translation-cache key behavior; define fail-closed behavior for non-cache-backed translators.
- Priority: `P1`
- PocketRisu benefit: prevents block/drag partial editing of a visibly translated message from matching/saving against the wrong source representation or overwriting original user text when only the translated cached view should change.
- Main conflict/risk: PocketRisu `develop` currently passes original `message` into `PartialEditController` and routes every partial-edit save into the original chat message, while translated rendering is backed separately by the translation cache. A naive port could also regress active-swipe updates or introduce stale async cache-key races.
- Validation need: original-view edit parity including active swipe; translated-view edit modifies only translation cache; cache miss fails closed; rapid translation toggle/chat/character switching rejects stale async context; non-LLM translators remain disabled unless they have an explicit persistence contract.
- Follow-up: use `notes/external-risu-designs/translation-aware-partial-edit.md`; keep `DESIGN_NEEDED` until reproduction and cache-ownership assumptions are resolved.

## SYSTEM_UPDATE_REQUIRED

No candidate in this source advance.

## Forward review log

- `kwaroran/Risuai:main` advanced from `7101c3c9e71f56e603a25e239554333fc9100695` to `e565563a288ebe4c65b6099a1645ba477d1c84b4` on 2026-08-26. The new main commit merges the translated-partial-edit fix. Although the merged PR branch contains older internal commits, the forward review treated the net main-branch change since the registered cursor as the new evidence and did not move the cursor backward.
- Current `PocketRisu/PocketRisu:develop` cursor remains `b95d0fa72ce41c61e4ea8d42303499c72a6ba315`; direct code inspection confirmed the representation-ownership mismatch still exists there, raising this from a generic upstream idea to a PocketRisu-relevant correctness candidate.
- All other active-source HEADs matched their registered cursors during this pass.
- `HISTORICAL_BACKFILL_COMPLETE_THROUGH` unchanged; forward traffic took precedence and complete pre-2026-08-26 coverage is still not proven across every tracked source.
