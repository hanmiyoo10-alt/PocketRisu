# Historical backfill review — PocketRisu-Kei interchange schema round-trip

Reviewed source: `seto-sama/PocketRisu-Kei@294c6e4828861b3590bbd6b40d26a259af12ed97`

## Finding

The source fixes character/module/CHARX interchange so conversion preserves module namespace and hidden-icon metadata, writes the current global-note marker/field, and still reads the legacy `@@indicator phi` marker for backward compatibility. Its tests assert character -> module -> character round-trip preservation and legacy-marker compatibility.

Current `hanmiyoo10-alt/PocketRisu:main` still converts `@@indicator phi` through `postHistoryInstructions`, already preserves `hideChatIcon` through `hideIcon`, and does not expose the newer `moduleNamespace` or `replaceGlobalNote` schema fields found in the source change. Therefore this is not a safe literal port: the useful transferable idea is a schema-owned round-trip compatibility invariant, not those exact field names.

## Classification / deduplication

Recorded as `INTERCHANGE-SCHEMA-ROUNDTRIP-COMPAT` rather than a direct CHARX patch. This is distinct from complete export snapshot hydration: it concerns semantic field mapping and backward-compatible markers after a complete object is already available.

No active forward cursor was moved backward. `seto-sama/PocketRisu-Kei` remains reviewed forward through `3b55f692c02c04082b087547b0114506a5373681`.

## Execution decision

Design/investigation only. Before implementation, PocketRisu must inventory the schema fields that are actually live on its current base and prove a concrete round-trip loss. Do not add source-only fields merely to mimic another variant.
