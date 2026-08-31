# PocketRisu refresh / reload investigation — 2026-08-31

## Scope

PocketRisu에서 반복적으로 언급된 "새로고침"의 의미를 분리하고, 실제 full page reload가 필요한 문제와 foreground/network recovery 문제를 구분하기 위한 조사 노트.

현재 단계는 INSPECT_ONLY. 동작 변경 없음.

## Confirmed findings

### 1. Normal runtime does not appear to periodically force a full page reload

Current `src/ts/bootstrap.ts` contains an explicit `location.reload()` in the TOS-decline branch. This is not a normal periodic/mobile recovery path.

Normal model-job recovery is initialized through `initModelJobRecovery()` instead.

### 2. Model-job recovery historically depended on a manual reload

Current `src/ts/process/request/jobRecovery.ts` explicitly documents the old failure mode:

- a tab could remain alive while network connectivity disappeared, especially screen lock or Wi-Fi/cellular transitions;
- the server-side model job kept running and journaling;
- boot-only discovery meant the completed response could remain unclaimed;
- before return triggers were added, the response could sit there until the user manually reloaded the app.

Current recovery triggers are:

- initial recovery pass at app boot;
- `document.visibilitychange` when the document becomes `visible`;
- `window.online` when connectivity returns.

`recoverModelJobs()` is re-runnable and concurrent calls collapse onto one in-flight discovery pass.

### 3. July 2026 history shows refresh/reload was part of a recovery sequence, not one single bug

Relevant `jobRecovery.ts` history:

- `e6d510e7eaf5d28cf565e314d5f672107199af41` — `feat: recover background model jobs on boot`
- `393c870000517bc5c0d4821784c60efdd88900ac` — `feat: reattach model jobs on tab return and fill partial recoveries`
- `706f170d942e4f65dd4a091b4210c4b996855f16` — `feat: resume interrupted sends when their chat is opened`
- `08a4cf5ef9005bb25b0b4a0c154c45c436789958` — `fix: write recovered messages through the state proxy`
- `5fc6d8db7339cb65a9820199e133aafb981d3298` — `fix: persist chats filled by background job recovery`

This progression matters: "reload" had at least two distinct roles.

1. It could force a discovery/recovery pass when return/network triggers were missing.
2. It exposed persistence bugs: a recovered response could appear in memory, then disappear on the next reload because the off-screen chat had not been saved.

### 4. The persistence failure was specifically fixed

Commit `5fc6d8db7339cb65a9820199e133aafb981d3298` documents a field bug where a recovered response rendered when the user returned but vanished on the next reload. The reason was that chat bodies are excluded from `database.bin` and the normal save watcher tracks only the on-screen chat. Recovery now calls `saveChatToServer()` before claiming the model job, and leaves the job unclaimed when that save fails so a later discovery can retry.

### 5. Other state also historically disappeared on refresh

Commit `518e30b51ac36d117d37c5ffcafe222a28714b97` moved provider request logs away from an in-memory `fetchLog` because those entries were lost on refresh. This is a separate meaning of "refresh loss" from model-response recovery.

## Working taxonomy for the next investigation

Do not use "refresh" as one diagnosis. Separate at least:

1. **Full browser/page reload** — Firefox refresh / document boot from scratch.
2. **Foreground return** — tab remains alive and `visibilitychange` returns to visible.
3. **Network return** — `online` fires after connectivity loss.
4. **Generation/job recovery** — server-side job is rediscovered/reattached/slot-in occurs.
5. **Chat persistence verification** — reload is used to prove whether a UI-visible write was really saved.
6. **UI/reactivity reset** — reload may appear to fix stale client/Svelte state even when backend state is healthy; this remains to be investigated.

## Current conclusion

There is already strong source/history evidence that some past "새로고침하면 살아남/살아남지 않음" reports were not fundamentally about page reload itself. Full reload acted as a catch-all recovery trigger and as a persistence test. PocketRisu now has explicit foreground and network-return recovery intended to remove that dependency for server-side model jobs.

The remaining investigation should focus on cases where users still feel a manual Firefox refresh is required despite `visibilitychange`/`online` recovery, especially UI/reactivity state, session reconnection, and any paths outside server-side model-job recovery.
