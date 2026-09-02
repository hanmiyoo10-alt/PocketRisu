# Historical backfill review — streamed auto-translation stays single-flight

- Reviewed source: `PocketRisu/PocketRisu:develop`
- Source commit: `a876e542882cb992b34721e057ea4a8de53d1ef2`
- Current develop checked: `278251f85a19bfdfd4cf3faae780e62682878f9e`
- Review date: 2026-09-03

## Finding

Official PocketRisu fixed streamed auto-translation repeatedly re-entering the full translation pipeline for every streaming chunk. That behavior created duplicate translation requests, repeatedly toggled the translating state, and let early-return/finally interactions erase `lastParsed`, producing visible blank/content flicker.

The adopted fix introduces one translation flight per message component. While a flight is active, concurrent reparses do not start parallel translator calls: they coalesce to the latest pending snapshot, preserving an explicit stronger retranslate request when needed. The translating flag spans the whole flight and is reset in `finally`; the loading placeholder is only installed when no renderable prior result exists; empty translation results cannot replace already-rendered content; and the next queued snapshot is processed only after the current request completes.

Current `develop@278251f85a19bfdfd4cf3faae780e62682878f9e` still contains the `translationFlight`, `queueLatestTranslation`, and related single-flight path.

## Classification

- Feature-ID: `STREAMED-AUTO-TRANSLATION-SINGLE-FLIGHT`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P2`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu` commit `a876e542882cb992b34721e057ea4a8de53d1ef2`; single-flight path remains on `develop@278251f85a19bfdfd4cf3faae780e62682878f9e`
- benefit: prevents request storms, translation-state flicker, blank fallback oscillation, and redundant provider work while streaming messages are reparsed repeatedly
- conflict/risk: coalescing can drop semantically important intermediate work if request identity is too weak; stale results can overwrite newer chat/message state if target identity changes are not included; error/finally cleanup must not erase the last good render
- validation need: stream many rapid chunks and assert one active translator call at a time; latest pending snapshot wins; explicit retranslate strength is preserved; empty/error results keep last renderable output; loading state does not flicker; chat/character/message target changes cannot publish stale results; both legacy and pre/post-HTML translation modes remain compatible
- follow-up: preserve message-scoped single-flight and last-good-output semantics whenever translation, streaming reparsing, or ChatBody state ownership is refactored

## Dedupe boundary

This is related to generic request coalescing and bounded retry ideas but is not the same authority. It governs UI-side streaming reparse concurrency and result publication for translation. Retry/fallback logic governs failure attempts after a request is already authorized. Do not merge the two state machines in a way that lets retry policy create parallel translation flights or lets translation coalescing weaken provider failure bounds.
