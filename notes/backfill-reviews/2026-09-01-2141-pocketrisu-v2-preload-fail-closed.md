# Backfill review — V2 plugin storage preload must fail closed

- Reviewed source: `PocketRisu/PocketRisu`
- Evidence commit: `0c6105f43fea3f9b59a8fca3b6b7d2de988a1e32`
- Result: meaningful adopted invariant; no forward cursor movement.

## Finding

V2 plugins expose synchronous storage reads, so when server-backed plugin storage preload fails, an empty compatibility cache is not an authoritative empty store. Starting V2 plugins in that state lets plugins observe `null` and write defaults through the DB proxy, which can overwrite real server values.

PocketRisu therefore fails closed: when V2 storage initialization/preload fails, previous V2 runtime state is torn down and V2 plugins stay disabled until a later successful load. V3 plugins, whose storage path is not dependent on the same synchronous full preload, continue loading.

## Durable invariant

**A consumer whose correctness requires a complete compatibility snapshot must not run against an unavailable or incomplete snapshot as though it were authoritative empty state.** Failure must disable only the dependent compatibility surface and preserve unrelated runtimes when their prerequisites remain valid.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu@0c6105f43fea3f9b59a8fca3b6b7d2de988a1e32`
- benefit: prevents storage preload outages from turning into destructive default writes and limits failure to the V2 compatibility surface.
- conflict/risk: broad plugin shutdown would unnecessarily break V3; retry loops or treating partial cache as complete would re-open the corruption path.
- validation need: preserve regression coverage for preload failure, previous-V2 teardown, no V2 execution/default writes, and continued V3 load.
- follow-up: preserve as an invariant around future plugin-storage compatibility/hydration changes; no implementation needed because the fix is already adopted upstream.

## Guardrail check

No change to DB visibility/pagehide flushing, `flushServerDbKeepalive()`, targeted V3 reload, runit/PM2 policy, Android notifications, or system packages.