# Foreground-return hide triggerSave inspection — 2026-09-06

Inspection of `src/ts/globalApi.svelte.ts` shows that the hide/pagehide path calls `flushImmediate()`, which sets `changed = true` and invokes `triggerSave({ skipBroadcast: true })`.

However, `triggerSave()` itself immediately calls `takeTrackedChanges()` and returns without persistence when `hasTrackedChanges(toSave)` is false and `forceFullWrite` is not set.

Therefore setting `changed = true` on hide does **not** by itself force a full DB write or serialization when there are no tracked changes. The earlier suspicion that every app switch necessarily forces a heavy save was too strong.

Additional relevant behavior:

- `saveInFlight` deduplicates concurrent save attempts;
- `visibilitychange -> hidden` and `pagehide` may both call `flushImmediate()`, but a running save returns the same in-flight promise and tracked changes are consumed once;
- `flushServerDbKeepalive()` is currently a no-op in the local working source;
- `triggerSave()` only persists actual tracked changes unless `forceFullWrite` is explicitly requested;
- a full encoder reload can still occur in the background save loop when `requiresFullEncoderReload.state` is set, but that is not caused merely by `changed = true` on hide.

Conclusion: the generic hide-time `triggerSave()` path is no longer a strong explanation for the Firefox foreground-return reconstruction by itself. Next inspect the other hide/pagehide handler in `DefaultChatScreen.svelte`, then move toward browser/content-process reconstruction evidence if it is also lightweight.
