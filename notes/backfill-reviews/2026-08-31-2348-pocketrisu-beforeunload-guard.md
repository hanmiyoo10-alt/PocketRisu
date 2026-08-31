# PocketRisu historical backfill — beforeunload guard separation

Reviewed source: `PocketRisu/PocketRisu`
Source commit: `eac0954a4053b9fb71278b7a5484bf323581f065`
Reviewed on: 2026-08-31

## Meaningful invariant

Feature-ID: `BEFOREUNLOAD-GUARD-WITHOUT-FORCED-FLUSH`

PocketRisu restored a `beforeunload` prompt-only guard in `src/preload.ts` to block accidental page exits. The change only prevents accidental navigation/exit; it does not flush, serialize, or otherwise mutate the DB during `beforeunload`, `visibilitychange`, or `pagehide`.

This is worth preserving separately from persistence mechanics: exit UX may warn the user, while durability remains owned by normal save paths. A future cleanup must not couple the prompt to a synchronous/forced full DB flush or change `flushServerDbKeepalive()` from its reviewed no-op behavior.

## Classification

- System impact: NO_SYSTEM_UPDATE
- Importance: MEDIUM
- Difficulty: LOW
- Size: XS
- Evidence: HIGH
- Risk: LOW
- Dependencies: NONE
- Priority: P1
- Lifecycle status: ADOPTED
- Source evidence: `PocketRisu/PocketRisu@eac0954a4053b9fb71278b7a5484bf323581f065`; current `develop` still contains the prompt-only listener in `src/preload.ts`.
- Benefit: reduces accidental page-exit loss risk without adding save-path latency or lifecycle-triggered DB churn.
- Conflict/risk: browser beforeunload behavior varies; attaching persistence work here would violate PocketRisu save/integrity guardrails and can create shutdown races.
- Validation need: preserve a regression check that the listener requests an unload prompt but performs no DB flush/write side effect; verify normal navigation/refresh UX on supported browsers.
- Follow-up: treat this as a durable invariant when touching preload/lifecycle/save code. Do not convert it into lifecycle-triggered persistence without a separate explicit review.

## Backfill coverage

This is a bounded historical slice only. It does not justify advancing `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
