# PocketRisu-Kei backfill — per-chat composer drafts

Reviewed at: 2026-08-28 04:45 KST
Source: `seto-sama/PocketRisu-Kei`
Historical evidence commit: `8e2a0ad8685ca494a65419e5a0d66932e957f802`
Review mode: bounded historical backfill; forward cursors unchanged.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE` for preservation; any future rewrite must preserve current draft storage/ordering semantics
- Priority: `P0`
- Lifecycle: `ADOPTED`

## Source evidence

PocketRisu-Kei `8e2a0ad8685ca494a65419e5a0d66932e957f802` introduced per-chat composer drafts keyed by stable character + chat IDs, outside the authoritative chat message body. It coalesces writes, serializes save/remove ordering so a delayed save cannot resurrect a sent draft, clears the draft after successful send/command processing, sweeps orphan drafts, excludes drafts from backup/import state, and tests response-loss/order races.

## PocketRisu current-state audit

`hanmiyoo10-alt/PocketRisu:main` already contains the same feature family in `src/lib/ChatScreens/DefaultChatScreen.svelte` and `src/ts/storage/chatDraft`:

- stable `chaId + chatId` draft identity;
- load-on-chat-enter without clobbering text typed during asynchronous load;
- debounced/coalesced persistence while typing;
- explicit removal after send/processed command;
- orphan cleanup and import/backup separation;
- ordered draft writes/removes.

Therefore this is not a new port candidate. Preserve it as an adopted invariant.

## Benefit

Prevents accidental loss of long unsent prompts when switching chats/screens or remounting the chat UI, while keeping draft state separate from authoritative sent-message history.

## Conflict / risk

Draft persistence must never become an excuse to reintroduce the forbidden full-DB lifecycle flush path. Drafts are session/device-local auxiliary state, not backup-authoritative chat content. A slow prior save must never resurrect a draft after a successful send/remove.

The source implementation also performs best-effort draft-specific writes on visibility/pagehide. That is distinct from `flushServerDbKeepalive()` or forced DB flushing; future refactors must keep those boundaries explicit.

## Validation need

Preserve regression coverage for:

1. chat A/B drafts never cross;
2. asynchronous load cannot overwrite newer typed text;
3. delayed save followed by send/remove leaves no resurrected draft;
4. a new draft after send persists normally;
5. response-lost-after-store followed by remove still deletes stale server draft;
6. deleted chat/character drafts are swept;
7. backup/import does not restore stale device-local drafts;
8. no full DB flush is attached to `visibilitychange` / `pagehide` and `flushServerDbKeepalive()` remains no-op.

## Follow-up

No source branch or PR. Preserve as `ADOPTED`; if draft ownership is touched later, use this record as a regression contract rather than re-porting Kei code.

## Backfill coverage

This bounded pass inspected an older PocketRisu-Kei history page reaching at least the 2026-06-14 commit range. It does not prove initial-history coverage, so the global `HISTORICAL_BACKFILL_COMPLETE_THROUGH` marker must not advance from this review alone.
