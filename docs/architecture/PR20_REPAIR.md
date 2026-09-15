# PR20 repair record

## Scope

Original base: `a5cc02aade93d867645766770a0bd1fcc0048c38`.
Original head: `aeae2b7629e0aa4e082c8afa278c45483b13e6a5`.

This repair preserves normal UI markup, styling and checked-in business data. It restores the SOLO/HIGH_MARGIN/ZERO_CAPITAL predicates, URL filter/batch restoration and single-request batch approval. It fixes invalid radar imports and baseline TypeScript errors without relaxing the canonical FinancialEntity contract or disabling checks.

## Approval semantics and deployment boundary

Approval here means removing the local `収集事例` review tag. It is NOT evidence verification, paid entitlement, or publishability promotion.

The old endpoint edited bundled JSON without authentication and returned success after disk failures. That is not a production datastore. The repaired endpoint is a same-origin, loopback, non-production development editor. Production/remote requests fail closed (403). No production approval feature is claimed or silently enabled. A deployed administrative approval service needs authenticated authorization and transactional D1 records plus a read projection; that is a separate migration and deployment, not a hidden side effect of a UI refactor.

Within a local store, all approval calls acquire an exclusive directory lock. Complete files are written through temporary files, fsync and rename. A write-ahead rollback journal is prepared before changes; success is returned only after both existing projections are saved and the journal removed. Missing optional winners projection is allowed; malformed or unwritable files are not silently ignored. Unknown requested IDs fail the entire request before writes. Client state changes only after a complete server acknowledgement.

The lock is shared by approval calls in independent processes on the same filesystem. Other index-writing tools must not run concurrently unless they adopt the same lock. This is not a distributed database or a cross-file read-isolation guarantee. On a process crash, stop/confirm the old writer has terminated before removing `data/.entity-approval.lock`; do not delete the journal. The next editor call restores the pre-operation files before accepting a new request. Never automatically steal a live lock.

Tests use freshly created temporary directories and mocked route storage. They do not mutate checked-in collected entities or production R2/D1.

## Verification status

Evidence is attached to the exact GitHub Actions source SHA. Passing unit tests does not imply build/E2E/visual success. Visual comparison must use the original base with documented type-only compatibility fixes, not newly bless HEAD images. Final results will be recorded after execution.

## Claims superseded

The earlier Phase203/204 text and original PR title claimed universal 100-year safety and absolute pixel identity from screenshots alone. Those claims were not supported. File-length limits are a scoped maintenance signal, not proof of SRP, correct behavior, or lifetime guarantees.
