# Dual-phone inter-outage gap inspection invalid due to awk syntax error (2026-09-01)

## Context

During investigation of the post-soak recurrence, an INSPECT_ONLY command attempted to search both main-phone tunnel logs for transport errors in the UTC window `2026-08-31_13:12:00 .. 2026-08-31_17:05:00`.

## Result

The `awk` expression failed with:

`unexpected newline or end of string`

for both `pocketrisu-ssh-tunnel` and `pocketrisu-notify-tunnel`.

The command then printed `NO_TRANSPORT_ERRORS_BETWEEN_OUTAGES` only because the temporary output files remained empty after the awk failures.

## Classification

- The two `NO_TRANSPORT_ERRORS_BETWEEN_OUTAGES` lines are **invalid / false-negative artifacts** and MUST NOT be used as evidence of a clean recovery gap.
- The inter-outage recovery hypothesis remains unconfirmed by this specific check.
- No services were modified or restarted.
- Server-phone Termux was not opened.

## Next step

Repeat the same read-only time-window search with simpler shell/awk syntax that does not use multi-line parenthesized regex conditions.
