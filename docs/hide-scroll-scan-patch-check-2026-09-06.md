# Hide-time scroll-scan patch validation — 2026-09-06

## Patch under test

`src/lib/ChatScreens/DefaultChatScreen.svelte` was patched to remove the hide/pagehide-only `persistChatScrollNow()` path that synchronously scanned rendered chat DOM/layout on Android app switches. Normal debounced scroll snapshot saving remains intact, and draft persistence on hide/pagehide remains intact.

Post-patch SHA-256: `f69eb15803e7902751d836ce07ae70d3b03dcef7a108831e54b80fbd91411508`.

## Static validation

`pnpm check` completed successfully:

- `svelte-check found 0 errors and 4 warnings in 1 file`;
- all 4 warnings are the existing accessibility warnings in `DefaultChatScreen.svelte` around the clickable `<div>` controls;
- there are no new type/Svelte errors from the hide-time scroll-scan patch.

This means the patch is statically valid enough to proceed to a production build and runtime app-switch reproduction test. No automatic page reload should be introduced for validation or recovery.
