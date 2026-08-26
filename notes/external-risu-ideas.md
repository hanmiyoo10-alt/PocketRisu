# External Risu idea backlog

Purpose: durable idea ledger for PocketRisu candidates discovered from external Risu variants. This is not a cherry-pick queue; every item must be re-evaluated against PocketRisu architecture and guardrails.

## Sources

- `nevaeh5379/HaejeokRisuai` (`main`)
- `rpaddict/RisuBard` (`main`)

## Status labels

- `READY_TO_PORT` — small, well-bounded change that fits current PocketRisu architecture.
- `DESIGN_NEEDED` — promising, but needs adaptation or a feature-specific design first.
- `HOLD` — useful reference, but conflicts with current direction, duplicates planned work, or is not yet justified.
- `ADOPTED` — implemented in PocketRisu; preserve source attribution and resulting PR/commit reference.
- `SUPERSEDED` — no longer relevant because PocketRisu architecture changed or a better approach landed.

## Idea list

| Status | Area | Idea | Source evidence | PocketRisu benefit | Main risk / conflict | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| DESIGN_NEEDED | chat/mobile | Reset or aggressively bound the chat render window on character/chat switch | carried over from prior Risu dev watch | reduce long-chat UI/memory spikes during switching | must preserve current navigation/state semantics | benchmark switch latency and retained DOM/messages |
| DESIGN_NEEDED | mobile/perf | Explicit low-spec / mobile-light mode | carried over from prior Risu dev watch | user-controlled memory/render pressure reduction | avoid divergent behavior that is hard to test | define which features are gated and measurable targets |
| READY_TO_PORT | plugin safety | Persist plugin updates before targeted runtime reload | carried over from prior Risu dev watch | avoid update/reload races and lost state | preserve V3 targeted reload; no full-page reload regression | verify current update path and add regression test |
| DESIGN_NEEDED | image/cache | Character image thumbnail/preload optimization | carried over from prior Risu dev watch | lower decode/cache pressure on mobile | stale cache / wrong-size asset reuse | profile decode memory and cache hit behavior |
| READY_TO_PORT | UI/perf | Lazy-load heavy sidebar actions | carried over from prior Risu dev watch | reduce initial bundle/work on page load | interaction latency on first open | identify largest lazy-loadable modules |
| READY_TO_PORT | save integrity | Persist user messages before model generation | carried over from prior Risu dev watch | reduce message-loss risk on generation failure/crash | must not reintroduce forced full DB flush patterns | inspect transaction/save ordering and test failure path |
| DESIGN_NEEDED | memory | Idle-batched inactive-chat memory release | carried over from prior Risu dev watch | reduce retained memory in ultra-long sessions | accidental release of still-referenced reactive state | heap profiling + ownership boundaries |
| DESIGN_NEEDED | long-chat | Active-chat message paging / compaction | carried over from prior Risu dev watch | major long-chat memory/render reduction | high interaction with search/edit/navigation/plugin assumptions | prototype read window and compatibility matrix |

## Recording rules

For every newly discovered meaningful external change:

1. Add or update one deduplicated row rather than appending a duplicate idea.
2. Record source repository and commit SHA(s) in `Source evidence`.
3. Separate the transferable idea from source-specific implementation details.
4. Classify as `READY_TO_PORT`, `DESIGN_NEEDED`, or `HOLD` based on current PocketRisu architecture.
5. Preserve history when an item later becomes `ADOPTED` or `SUPERSEDED`.
6. Link PocketRisu PR/commit/feature dossier in `Follow-up` once implementation starts.

## PocketRisu guardrails

- Do not reintroduce forced full DB flush on `visibilitychange` / `pagehide`.
- Keep `flushServerDbKeepalive()` no-op unless separately and explicitly reviewed.
- Preserve existing incremental hash / selective clone / opaque-ETag-related save safety decisions unless a newer feature explicitly replaces them safely.
- Preserve targeted V3 plugin reload.
- Keep runit; do not introduce PM2.
- Server phone must not create Android notifications.
- External architecture is reference material, not authority: prefer measured PocketRisu-specific evidence before porting.
