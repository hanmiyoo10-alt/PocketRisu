# Forward review: HaejeokRisuai cross-realm CharX input

Source: `nevaeh5379/HaejeokRisuai:main`
Previous cursor: `e06091c8c697ec35881661463955300df59dbcfd`
Reviewed HEAD: `d6f30d8e5c8aaf8add101aab75a09b1fac502a48`

## CROSS-REALM-BLOBLIKE-IMPORT-BOUNDARY

Source commit: `d6f30d8e5c8aaf8add101aab75a09b1fac502a48`.

Android WebView/content-provider wrappers can present a File-like value from another JS realm. Such values may fail `instanceof File` and may have an unreliable `stream()` while still providing stable bounded `size` + `slice().arrayBuffer()` semantics. The source replaces nominal-realm detection with a minimal blob-like capability check and keeps chunked slicing bounded. A regression fixture explicitly asserts that the wrapper is not an instance of the page `File` constructor and still imports a CharX archive successfully.

Classification:
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle: `READY_TO_PORT`
- Source evidence: `nevaeh5379/HaejeokRisuai@d6f30d8e5c8aaf8add101aab75a09b1fac502a48`; matching personal-fork owner still uses `instanceof File` and `data.stream()` in `src/ts/process/processzip.ts`
- PocketRisu benefit: make CharX import robust for Android/content-URI/cross-realm wrappers while preserving bounded streaming memory behavior
- Main conflict/risk: capability detection must stay narrow enough to reject arbitrary unsupported objects; Uint8Array and real ReadableStream handling must remain unchanged
- Validation need: cross-realm wrapper regression, normal File regression, Uint8Array regression, unsupported-object rejection, bounded slice sizes, asset round-trip
- Follow-up: safe autonomous candidate by classification. Implementation is not started in this run because the runtime cannot resolve `github.com` for a clean checkout/test run; connector-only file replacement without executable verification is not acceptable.

## Cursor

Advance HaejeokRisuai cursor to `d6f30d8e5c8aaf8add101aab75a09b1fac502a48`. No cursor moved backward. Historical completeness marker unchanged.
