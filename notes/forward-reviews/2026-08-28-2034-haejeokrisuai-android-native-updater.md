# Forward review: HaejeokRisuai Android native updater / native SQLite range

Reviewed source: `nevaeh5379/HaejeokRisuai:main`

Authoritative starting cursor: `0b940c098bafe30b4aa714a9cb22bb77de707475`
Reviewed current HEAD: `051c976ee09ff3286c9666601bf3b7e8ccd082c2`
Forward range: 8 commits, cursor never moved backward.

## High-signal commits

- `af1d48cc9f8fe6d1f4350558b70f424cbb92830f` — adds a native Android in-app updater, `REQUEST_INSTALL_PACKAGES`, release `android-update.json`, bounded manifest/APK downloads, SHA-256 verification, APK package/version validation, and Android package-installer handoff.
- `b2828b9ce5f3bcfd574c77bba8ccbd9df4a05ad9` — reduces startup-critical settings hydration payload size; explicitly keeps heavyweight settings out of one giant Capacitor result to reduce temporary JSON/string heap pressure.
- `19600f9d1e1289a914aeda1f983979811eb5c7cf` — expands native SQLite query support with batched queries, larger bounded chunks, direct oversized-row fallback, and slow-query diagnostics.
- `2d4d1a09852767cdb4cb1b13c3ac8f7bdae01bf8` — consolidates Android SQLite restore/runtime operations into one native SQLite plugin and serial executor ownership boundary.
- `a1cc6aae88512c382b8a0099febbd1f304be4b41` — fixes restore transport chunking by making the transport budget byte/base64-aware rather than concatenating arbitrarily large strings.
- `ade1c5636fd010bbaaa4f2bb40588f2724d1e643` — moves recent-session listing to a bounded SQLite projection with loaded-state fallback and stale-refresh rejection.

## PocketRisu applicability

Direct code search of `hanmiyoo10-alt/PocketRisu` found no Capacitor runtime / `CapacitorSqliteRestoreStream` / `RecentSessionsList` ownership surface. Therefore these Android-native changes are evidence and design lessons, not direct implementation candidates for the current PocketRisu tree.

The strongest durable lesson is the updater trust boundary: an app-managed updater must not treat transport integrity alone as authority. Release metadata, payload size, digest, package identity/version, installer permission, rollback/failure cleanup, and source authenticity must be explicit. Haejeok verifies SHA-256 and APK identity/version, but the manifest and APK are both obtained from the same release channel; a future PocketRisu updater design would still need an explicit signed-release/provenance policy rather than assuming a hash fetched from the same compromised origin is sufficient.

The native SQLite work also reinforces two existing ideas without creating duplicates: bound bridge payloads by encoded bytes, and prefer bounded storage projections over traversing fully hydrated object graphs on startup/sidebar paths.

## Execution gate

No source implementation attempted. The updater requires Android package-install permission and a native application/deployment substrate absent from current PocketRisu. It is `SYSTEM_UPDATE_REQUIRED` and installation/security-sensitive, so it remains design/investigation only under the project gates.

No change to `HISTORICAL_BACKFILL_COMPLETE_THROUGH`; this was a forward-only review.
