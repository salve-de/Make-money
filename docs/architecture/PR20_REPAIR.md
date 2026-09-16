# PR20 repair record

## Scope

Original base: `a5cc02aade93d867645766770a0bd1fcc0048c38`.
Original head: `aeae2b7629e0aa4e082c8afa278c45483b13e6a5`.

This repair preserves normal UI markup, styling and checked-in business research data while restoring behavior lost during the refactor. It restores the SOLO/HIGH_MARGIN/ZERO_CAPITAL predicates, URL filter/batch restoration and single-request batch approval. It fixes invalid radar imports and baseline TypeScript errors without relaxing the canonical FinancialEntity contract or disabling checks.

## Approval semantics and storage boundary

Approval means removing the editorial `収集事例` review marker from the product projection. It is NOT evidence verification, paid entitlement, or publishability promotion.

The original endpoint edited bundled JSON without authentication and could report success after disk failures. The repaired system has two deliberately separate adapters:

- Local development on loopback uses `local-entity-approvals.ts`. It edits development fixtures only, with an inter-process lock, recovery journal, fsync, atomic replacement and complete acknowledgement.
- Production uses D1 migration `0007_entity_approvals.sql`. The source research records in R2/checked-in fixtures remain immutable; D1 stores only a global editorial approval overlay (`entity_id`, approving actor and timestamp).

Production POSTs require same-origin requests, a verified Firebase ID token and a D1 `users.role = 'admin'` record. Missing/invalid identity returns 401, a non-admin returns 403, and persistence/read-back failures return an error rather than local success. Batch writes are idempotent and success is acknowledged only after every requested entity is read back from D1. The client sends one normalized batch request with a fresh Firebase token and updates visible state only after complete acknowledgement.

Production GET exposes only the global approved entity IDs required to reproduce the editorial projection after reload. It does not expose the approving user or private user records. `useFoundationCatalog` merges that overlay onto both summary and lazily fetched detail records without rewriting source evidence. A slow bootstrap read cannot erase an approval acknowledged while it was in flight.

The production deployment entry point applies remote D1 migrations before the Worker build/deploy. Deployment preflight also pins the APP_DB migration directory to `migrations/d1`, and an architecture test fixes the order `preflight -> remote migrations -> Worker build -> deploy`. This PR does not itself apply the remote migration or deploy production.

## Local crash/recovery behavior

Within the local fixture store, all approval calls acquire an exclusive directory lock. Complete files are written through temporary files, fsync and rename. A rollback journal is prepared before changes; success is returned only after both existing projections are saved and the journal removed. Missing optional winners projection is allowed; malformed or unwritable files are not silently ignored. Unknown requested IDs fail the entire request before writes.

The lock is shared by approval calls in independent processes on the same filesystem. Other index-writing tools must not run concurrently unless they adopt the same lock. On a process crash, stop/confirm the old writer has terminated before removing `data/.entity-approval.lock`; do not delete the journal. The next editor call restores the pre-operation files before accepting a new request. Never automatically steal a live lock.

Tests use temporary directories, mocked route storage and an offline synthetic SQLite database. They do not mutate checked-in collected entities, production R2 or production D1. The D1 recovery drill includes an `entity_approvals` row and verifies schema/data hash, integrity, foreign keys, tamper rejection, overwrite refusal, rollback on injected failure and source immutability.

## Visual equivalence

The old screenshot script merely captured pages. The repaired visual job builds the original BASE with a pinned compatibility patch and HEAD in the same runner/browser/font/timezone environment. BASE alone creates the reference images; HEAD is checked with snapshot updates disabled, `maxDiffPixels: 0` and `threshold: 0`.

Deterministic API fixtures cover external runtime state. The moving ticker is frozen only inside the comparison harness. Next.js speculative RSC prefetch routes are drained before page teardown so a completed comparison cannot fail after its assertions. No application content is hidden and no pixel tolerance is introduced to obtain a pass.

## Verification rule

Evidence is attached to the exact GitHub Actions source SHA. Passing tests on an earlier SHA never certifies a later commit. The required gate is all of the following on the same final HEAD:

- lint and architecture checks
- typecheck and schema checks
- unit/foundation/architecture/recovery suites
- production Next.js build and Worker bundle
- normal Playwright E2E
- BASE-to-HEAD strict visual equivalence

The PR remains Draft until those gates pass on the final HEAD. Merge, remote migration application and production deployment are separate actions and are not performed by this repair record.

## Claims superseded

The earlier Phase203/204 text and original PR title claimed universal 100-year safety and absolute pixel identity from screenshots alone. Those claims were not supported. File-length limits are a scoped maintenance signal, not proof of SRP, correct behavior, or lifetime guarantees. The merge decision is based on behavior contracts and reproducible gates, not line-count reduction alone.
