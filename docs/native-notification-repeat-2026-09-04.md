# Native notification repeat incident — 2026-09-04

## Report

After the stream-read timeout patch had passed static validation, production build, and direct `dist` serving checks, the user reported that repeated/continuous Android notifications had appeared again on the main phone.

This is being treated as a separate incident from the headset-triggered response-stream hang. The stream watchdog patch only changed `src/ts/process/index.svelte.ts` around the main response `reader.read()` lifetime; it did not intentionally add any new notification loop or automatic page reload.

The current notification path already contains local work in `src/ts/process/index.svelte.ts` that posts native request-start and request-done events to `/api/termux-notify`. Android notifications are main-phone-only by project policy. Therefore the next diagnostic must distinguish:

- repeated notification events being emitted by PocketRisu/client request lifecycle;
- repeated delivery/handling inside the main-phone relay;
- repeated delivery caused by reconnect/replay behavior around the notify tunnel.

Do not patch either side until the live main-phone relay/tunnel state and recent event/log evidence are captured. Do not create Android notifications on the server phone. Keep this investigation separate from the response-stream timeout and OOM work.
