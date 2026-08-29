# Forward review — Haejeok active working-set eviction guard

Reviewed source: `nevaeh5379/HaejeokRisuai:main`

Cursor before: `463b9fb97b09a3372a8305282ab05be8fc391fe0`
Reviewed through: `39ff4bd3b81fd5388927199e7c068bc59ffa6462`

## Meaningful evidence

### `025a4ef9924d5da4c34507742b7207726d77233b` — protect active chat and character data from idle eviction

This commit strengthens the already-tracked `Idle-batched inactive-chat memory release` idea rather than creating a duplicate idea. It introduces a canonical protected working set for background compaction consisting of:

- chats visible in every active split-pane group;
- chats with active generation work;
- explicit transition targets supplied by the caller;
- selected/dirty/in-flight character/chat state that must not be compacted.

The protection set is recomputed during batched idle release rather than captured once, and a generation token cancels stale scheduled release work when navigation changes. Character-detail eviction keeps a small warm LRU tail and refuses to compact selected, dirty, hydrating, generating, or otherwise protected state. Regression tests cover visible panes, generation chats, transition targets, and exclusion of hidden inactive tabs.

This is useful evidence for PocketRisu because it turns the vague rule “release inactive data” into the stronger invariant: **background memory reclamation must derive a live protected working set at execution time and may only compact state outside that set.**

PocketRisu inspection found no matching `releaseInactiveChatMessages` owner, so this is design evidence, not a port candidate yet.

## Other commits reviewed

- `12ab20e4a21e484a159dfcea7d8af8ece76852ab` — import-path refactor only.
- `108f9e4a70492c27ec90adcb3f75866b806b76ce` — Android thumbnail prewarming plus legacy migration bootstrap; mixed native/storage scope and no bounded PocketRisu port candidate established in this pass.
- `bb8a6d5c3a000d79fa7eb71881d7d7d41c86c129` — local Svelte `$bindable` undefined/fallback crash fix.
- `39ff4bd3b81fd5388927199e7c068bc59ffa6462` — regression tests for that local ModelGrid binding fix.

No separate idea was promoted from those commits in this bounded review.

## Classification update

Underlying idea: `IDLE-INACTIVE-MEMORY-RELEASE-WORKING-SET-GUARD`

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: matching PocketRisu inactive chat/character compaction owner; heap/retained-state measurement; explicit protected-state inventory
- Priority: `P1`
- Lifecycle status: `DESIGN_NEEDED`
- Source evidence: historical `nevaeh5379/Risuai` `9c5ef605`, `e48296e3`; strengthened by `nevaeh5379/HaejeokRisuai` `025a4ef9924d5da4c34507742b7207726d77233b`
- Benefit: reduce retained chat/character memory in long sessions without evicting visible, generating, transitioning, dirty, or hydrating state
- Conflict/risk: stale scheduled GC or an incomplete protection set can discard live reactive state and cause reload/jank/data-view inconsistencies
- Validation need: rapid chat/character switches, split panes, generation overlap, hydration overlap, dirty-state overlap, cancellation of stale idle batches, heap/retained-object measurement
- Follow-up: keep design-only until PocketRisu has or introduces a matching compaction owner; then begin with regression tests for the protected working-set invariant before any eviction implementation

## Guardrails

No forced `visibilitychange` / `pagehide` flush, no change to `flushServerDbKeepalive()`, save/integrity paths, targeted V3 reload, runit, or server-phone notification behavior is proposed.