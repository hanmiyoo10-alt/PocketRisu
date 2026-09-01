# Historical review — setFullChat preserves message metadata

Reviewed source: `PocketRisu/PocketRisu@86f2fe41f109662438e4686bffcf190f67de4741`
Reviewed on: 2026-09-01 20:32 KST

## Finding

The scripting `setFullChat` path rebuilt every message from only `{ role, data }`. That silently discarded pre-existing per-message fields owned by other features/plugins. The adopted fix snapshots the previous message array and spreads the same-index prior message before replacing the script-authoritative `role` and `data` fields.

## Transferable invariant

A compatibility API that exposes a deliberately narrow writable projection of a richer record must not accidentally interpret omitted fields as deletion. When replacing projected chat content, preserve fields outside the API's declared ownership boundary unless the API explicitly provides destructive/full-record replacement semantics.

The important ownership split is:

- `setFullChat` script payload owns the replacement `role` and `data` values;
- existing message metadata outside that projection remains owned by the richer message model;
- omitted metadata is not deletion intent.

## Caveat

The adopted implementation preserves metadata by array index. That is correct for the existing contract only insofar as the scripting API treats the supplied array as a positional rewrite of the current chat. Future APIs that permit arbitrary insert/reorder/delete operations should use explicit stable message identity or a richer operation contract instead of assuming index identity.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle status: `ADOPTED`

## Validation / follow-up

Preserve regression coverage for metadata-bearing messages through full-chat scripted rewrites, including the contract for length changes/reorders. Any future expansion of `setFullChat` should make destructive metadata replacement explicit rather than inferring it from omitted fields.

No autonomous implementation is needed because the invariant is already adopted in official PocketRisu.
