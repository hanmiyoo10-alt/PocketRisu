# Backfill review — terminal generation projection freshness

Date: 2026-08-30
Source: `seto-sama/PocketRisu-Kei`
Historical commits reviewed: `0a1ee5e5e3bf115689e84058a755c7739eb493d1`, `13ee995884513597adfdf26086ef3465a514e909`
Authoritative forward cursor remains: `3b55f692c02c04082b087547b0114506a5373681`

## Finding

PocketRisu-Kei separates a live/client generation projection from the authoritative server generation journal and the terminal materializer that commits canonical chat state. The cancellation path initially risked restoring an older local branch or materializing a stale checkpoint. The fixes establish two related invariants:

1. once a server workflow owns the generation, cancellation must not briefly restore an older local branch while canonical sync is still pending; and
2. before terminal materialization, a cached projection must be proven current against the authoritative journal. `13ee9958...` records the journal byte length used to derive a server projection and refreshes the projection whenever the current journal length differs.

The valuable transferable idea is not the Revenant architecture itself. It is a freshness contract for derived async projections: a terminal/canonical commit must not trust a checkpoint merely because one exists; it must verify that the checkpoint corresponds to the complete authoritative evidence available at commit time.

## Deduplication

This is related to existing cancellation/retry and recovery-safety ideas, but it is not the same underlying idea as bounded retry, durable-input-before-generation, or recovery-evidence census. Those govern retry bounds, input durability, and breadth of evidence search respectively. This item governs **freshness of a derived projection at terminal publication**. Keep it as a distinct invariant and merge future evidence about stale async generation projections here.

## PocketRisu applicability

A bounded code search of `hanmiyoo10-alt/PocketRisu` did not find a matching generation projection/journal/materializer owner. Therefore there is no justified production port today. If PocketRisu later introduces detached/server-owned generation, resumable generation journals, or another durable async event log, this invariant becomes directly relevant.

## Classification

- Feature-ID: `TERMINAL-GENERATION-PROJECTION-FRESHNESS`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: matching PocketRisu async generation/recovery owner + authoritative monotonic journal/version identity + terminal materialization boundary + cancellation/stale-checkpoint regression fixtures
- Priority: `P1`
- Lifecycle status: `DESIGN_NEEDED`
- Source evidence: `seto-sama/PocketRisu-Kei@0a1ee5e5e3bf115689e84058a755c7739eb493d1`, `seto-sama/PocketRisu-Kei@13ee995884513597adfdf26086ef3465a514e909`
- Benefit: prevents cancelled/resumed/detached generation from publishing stale partial text or transiently restoring an older branch when newer authoritative generation evidence already exists.
- Conflict/risk: a weak freshness token can falsely treat stale projections as current; re-decoding a large journal at every terminal transition can add cost; local UI ownership must not race the canonical owner.
- Validation need: deterministic tests where client checkpoint is stale, journal grows after checkpoint, cancellation happens before terminal materialization, duplicate terminal materialization is attempted, and authoritative result remains exactly-once and contains the newest decodable journal content.
- Follow-up: keep design-only until a matching PocketRisu owner exists; then implement a pure freshness predicate/version contract before any behavior change.

## Guardrails

No forced `visibilitychange`/`pagehide` DB flush; keep `flushServerDbKeepalive()` no-op; preserve save/integrity optimizations and targeted V3 plugin reload; keep runit; no PM2; no server-phone Android notifications. No source code was cherry-picked.

## Backfill marker

This was a bounded historical slice. It does not establish complete coverage for all tracked sources, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is not advanced or regressed.
