# Historical backfill — PocketRisu-Kei translation task lifetime

Date: 2026-08-28
Source: `seto-sama/PocketRisu-Kei`
Forward cursor remains: `3b55f692c02c04082b087547b0114506a5373681`

## Reviewed evidence

Bounded historical page below the active cursor was reviewed without moving the cursor backward. High-signal commit:

- `e8822c4f3044c0c836360d275de13f87dd497660` — `fix(chat): preserve translation loading across remounts`

The source makes in-flight LLM translation state observable outside the transient `ChatBody` component. A stable logical task key is used so a remounted view can observe/join the existing task and keep the loading state instead of losing it or triggering duplicate work.

## PocketRisu inspection

`hanmiyoo10-alt/PocketRisu:main` currently has:

- `src/lib/ChatScreens/Chat.svelte`: `ChatBody` is inside a keyed render block and binds component-local `translating` state.
- `src/lib/ChatScreens/ChatBody.svelte`: LLM translation calls `translateHTML(...)` from component-derived parsing; `translating` is set true/false locally. No shared in-flight task owner or remount-stable task identity was observed in this path.

This is sufficient to treat the failure mode as directly plausible in PocketRisu, but a deterministic deferred-translation remount test is still required before implementation readiness.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: deterministic keyed-remount reproduction/test; confirm stable message/swipe translation key and explicit retranslate semantics
- Priority: `P1`
- lifecycle status: `DESIGN_NEEDED`
- source evidence: `seto-sama/PocketRisu-Kei` `e8822c4f3044c0c836360d275de13f87dd497660`
- benefit: avoid duplicate LLM translation work and preserve correct loading/busy state when the same logical message remounts
- conflict/risk: an over-broad shared key could incorrectly coalesce different messages/swipes; stale entries could strand busy state
- validation need: deferred translation + same-key remount calls translator once; different key remains isolated; failure clears registry; explicit retranslate still works
- follow-up: helper design `products/pocketrisu-helper-mod/docs/features/chat/translation-task-lifetime/DESIGN.md`; move to `READY_TO_PORT` only after reproduction/key semantics are resolved

## Deduplication

This is not the same underlying idea as translated partial-edit cache ownership. That item decides which text/cache is edited. This item owns the lifetime and identity of an asynchronous translation task across UI remounts. Keep them separate, while sharing translation-boundary evidence where useful.

## Backfill coverage

This pass is bounded evidence review only. It does not establish complete PocketRisu-Kei history coverage and does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
