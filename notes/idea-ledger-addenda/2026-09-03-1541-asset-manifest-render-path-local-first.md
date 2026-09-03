# ASSET-MANIFEST-RENDER-PATH-LOCAL-FIRST

- System impact: NO_SYSTEM_UPDATE
- Importance: HIGH
- Difficulty: MEDIUM
- Size: S
- Evidence: HIGH
- Risk: MEDIUM
- Dependencies: NONE
- Priority: P1
- lifecycle status: ADOPTED

## Source evidence

- `PocketRisu/PocketRisu` commit `f39114932c383da430c5d58d4a83366d107dbd98` (`fix(assets): resolve names locally from prefetched manifests, off the render path`).
- The regression followed v1.11 asset-manifest externalization: message first paint could await `POST /asset-manifests/resolve` plus sequential manifest paging. On the remote-link usage this fork targets, messages could remain blank until those network round trips completed.
- The fix prefetches full manifests when a chat opens, resolves names locally when all referenced content-addressed manifests are cached, keeps the server resolver only as a cold-cache fallback, and coalesces overlapping prefetches by manifest id/descriptor.
- Current `PocketRisu/PocketRisu:develop@278251f85a19bfdfd4cf3faae780e62682878f9e` still preserves `resolveNamesLocally`, `manifestPrefetchesInFlight`, descriptor-level in-flight suppression, fire-and-forget prefetch, and server cold-cache fallback.

## Expected PocketRisu benefit

Protect message first-paint and repeated parse latency from remote asset-manifest round trips while retaining server correctness as a fallback. The general invariant is that a render-critical path should consume already-prefetched immutable/content-addressed metadata locally when possible; background warming may prepare the next parse but must not block the current render unnecessarily.

## Main risk / conflict

Local matching must stay semantically identical to server exact-before-fuzzy owner priority. Prefetch must remain bounded/coalesced so chat entry does not create a request storm, and cache sizing must not turn the optimization into uncontrolled browser memory growth. Cold-cache behavior must remain correct when prefetch fails.

## Validation evidence / measurement needed

- Regression coverage for local-vs-server name-resolution parity, including exact/fuzzy and owner priority.
- Confirm a warm-cache message parse performs no manifest-name network request.
- Confirm cold cache still resolves through the server and starts the small foreground resolve before bulk prefetch traffic.
- Confirm overlapping chat-entry/parse prefetch calls do not duplicate manifest downloads.
- Track first-paint latency over a constrained/remote connection and ensure the manifest LRU remains bounded.

## Follow-up

ADOPTED: preserve as an invariant when changing asset manifest externalization, parser hydration, cache sizing, or remote render behavior. Do not replace local-first resolution with an unconditional server round trip. No implementation branch or PR is needed for this historical entry because the behavior is already present on current develop.
