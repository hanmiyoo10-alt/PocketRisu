# Bounded historical review — plugin storage pending-write read-your-writes

Reviewed PocketRisu/PocketRisu commit 83ffa0474abd013581c4df23e50b20c559d4b47a and verified the behavior at reviewed tip ca09a80746e74e5334145e5e78af47ce423e0eba.

Result: normalized PLUGIN-STORAGE-PENDING-WRITE-READ-YOUR-WRITES as an ADOPTED P0 invariant. It is separate from write-token rollback authority: this invariant defines what readers observe before persistence settles; rollback authority defines convergence after a failure.

All active forward cursors were checked first and did not advance. HISTORICAL_BACKFILL_COMPLETE_THROUGH is unchanged because this bounded slice does not establish complete coverage through a newer date for every tracked source.
