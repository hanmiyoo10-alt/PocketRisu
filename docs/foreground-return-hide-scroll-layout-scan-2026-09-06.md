# Foreground-return hide-time scroll layout scan — 2026-09-06

## Confirmed behavior

`src/lib/ChatScreens/DefaultChatScreen.svelte` performs scroll snapshot persistence on both `visibilitychange -> hidden` and `pagehide`.

The helper path is:

- `persistChatScrollNow()` clears a pending timer and calls `writeChatScrollSnapshot(...)`.
- `writeChatScrollSnapshot(...)` calls `getLoadedMessages(container)`.
- `getLoadedMessages(...)` runs `container.querySelectorAll('[data-chat-index]')`, converts all matched nodes to an array, maps/parses indices, and sorts the whole loaded set by index.
- `writeChatScrollSnapshot(...)` then reads `container.getBoundingClientRect()` and scans the loaded message list with `el.getBoundingClientRect()` until it finds the first visible message, followed by one more rectangle read for that message.
- the actual persisted payload is tiny: `{ messageIndex, offsetTop }`, written via `localStorage.setItem(...)`.

## Interpretation

The expensive part is not storage size. It is synchronous DOM enumeration/sorting plus repeated layout reads during the hide transition.

This cost scales with the number of currently rendered message elements. Because `loadPages` can grow large and scroll restoration can increase it further, this is a concrete foreground/background pressure amplifier that lines up with the user's Firefox app-switch reconstruction symptom.

This is still not proof that Firefox/Android discards the page because of this scan. The next safe step is to inspect the current local diff/SHA for `DefaultChatScreen.svelte` before any patch, then make a small bounded/no-hide-layout optimization rather than touching DB persistence or introducing any automatic reload.

Manual-refresh-only policy remains unchanged.