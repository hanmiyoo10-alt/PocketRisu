# TripleHwang/RisuVault bounded backfill — chat hydration local consistency guard

Reviewed source: `TripleHwang/RisuVault`
Source commit: `a494f246e88b7617e43c58bd9bf047f3c101e6d7`
Release evidence: `d42fc61bf4d5805b3a37eeaf781938a431b2591f`

## Finding

RisuVault found that chat hydration joined a chat-body read and message-page read from separate transactions, then rejected the combined result whenever the global database revision changed. That revision is affected by unrelated chat saves, autosave, plugin writes, and audit commits, so busy unrelated work could repeatedly abort a perfectly valid hydration. The same broad guard also affected conflict-rebase loading and could discard a rebase result.

The source narrowed the compatibility check to state actually shared by the two reads: the current chat's message count. Retry exhaustion also degrades to an internally consistent page with a warning rather than leaving the chat empty.

## Transferable invariant

A multi-read consistency guard should be scoped to the state whose coherence is actually required. Unrelated durable writes must not invalidate a read assembly merely because they advance a global database revision.

## PocketRisu inspection

Bounded code search in `hanmiyoo10-alt/PocketRisu` did not locate a matching `loadChat` + revision or chat hydration owner. This is therefore design evidence, not a direct port candidate.

## Guardrails

- Do not weaken true same-chat conflict detection.
- Do not treat a coarse counter as authority for destructive writes.
- Preserve PocketRisu save/integrity optimizations and existing conflict semantics.
- Any fallback after retry exhaustion must only publish data known to be internally consistent from one read transaction/snapshot.

## Next check

If PocketRisu introduces or already has a split-read chat hydration/rebase owner under different naming, reproduce an unrelated-write overlap first, then compare a narrowly scoped same-chat token/count/revision against the current global guard.
