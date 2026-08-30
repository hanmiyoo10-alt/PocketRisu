# Historical backfill review — MCP listen-before-send request boundary

Date: 2026-08-30
Source: `PocketRisu/PocketRisu`
Historical commit: `9f099bb21b6bd3e31085214320c34376c190b35a`
Active forward cursor at review time: `615b79df3375bf9db2924a8003f61a747721c725`

## Finding

The custom MCP transport request path once called `send()` before registering its response listener and wrapped the operation in an async Promise executor. A sufficiently fast transport response could arrive before listener registration and leave the request Promise unresolved; a rejected awaited send inside an async Promise executor could also escape as an unhandled rejection.

The historical fix established two durable ordering/error-handling invariants:

1. register the response listener before initiating `send()`;
2. do not use an async Promise executor for this request bridge.

Current `hanmiyoo10-alt/PocketRisu:develop` retains the same listener-before-send ordering, so this is an adopted invariant rather than a port candidate.

## Classification

- Feature-ID: `MCP-LISTEN-BEFORE-SEND-BOUNDARY`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `ADOPTED`
- Source evidence: `PocketRisu/PocketRisu@9f099bb21b6bd3e31085214320c34376c190b35a`; current fork `src/ts/process/mcp/mcplib.ts` preserves listener registration before send.
- Benefit: prevents fast-response lost-listener hangs and avoids async-Promise-executor rejection hazards in custom MCP transports.
- Conflict/risk: future transport refactors could accidentally reverse ordering or reintroduce an async executor; current code still intentionally leaves send-error/timeout handling as a separate concern.
- Validation need: preserve a regression test where a transport responds synchronously/immediately after `send()` and verify the request resolves; separately verify send rejection does not become an unhandled rejection when error handling is improved.
- Follow-up: preserve as an invariant whenever MCP transport/request plumbing is refactored. Do not conflate this with a broader timeout/error-rejection redesign.

## Deduplication

No existing durable ledger entry or addendum was found by the historical SHA. This item is narrowly about listener-registration ordering and Promise-executor semantics, not generic retry bounding or observer isolation.

## Cursor / backfill markers

This is historical evidence older than the authoritative `PocketRisu/PocketRisu` forward cursor. The cursor is not moved backward. This bounded slice does not establish complete historical coverage, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
