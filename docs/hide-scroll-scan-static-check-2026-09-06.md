# Hide-time scroll-scan patch static validation — 2026-09-06

`src/lib/ChatScreens/DefaultChatScreen.svelte` was patched locally to remove only the immediate `persistChatScrollNow()` path from `visibilitychange -> hidden` and `pagehide`, while preserving draft persistence and the normal 120 ms debounced scroll snapshot path.

Validation result:

- `pnpm check` completed successfully.
- `svelte-check found 0 errors and 4 warnings in 1 file`.
- The four warnings are the existing accessibility warnings in `DefaultChatScreen.svelte` around the clickable `<div>` controls; no new type/Svelte errors were introduced by the patch.
- Post-patch source SHA-256 remains `f69eb15803e7902751d836ce07ae70d3b03dcef7a108831e54b80fbd91411508` from the preceding patch verification.

Next step: run `pnpm build`, then manually load the rebuilt app once and reproduce the Android app-switch/foreground-return scenario. Do not add or use automatic page reload as recovery.