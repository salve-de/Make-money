# PR20 repair record

## Scope

Original base: `a5cc02aade93d867645766770a0bd1fcc0048c38`.
Original head: `aeae2b7629e0aa4e082c8afa278c45483b13e6a5`.

This repair preserves normal UI markup, styling and checked-in business research data while restoring behavior lost during the refactor. It restores the SOLO/HIGH_MARGIN/ZERO_CAPITAL predicates, URL filter/batch restoration and bounded batch approval. It fixes invalid radar imports and baseline TypeScript errors without relaxing the canonical FinancialEntity contract or disabling checks.

## Approval semantics and storage boundary

Approval means removing the editorial `収集事例` review marker from the product projection. It is NOT evidence verification, paid entitlement, or publishability promotion.

The original endpoint edited bundled JSON without authentication and could report success after disk failures. That HTTP write path has been removed. All approval POST requests now use the production-style D1 overlay and require all of the following, including in development servers:

- same-origin request semantics;
- a verified Firebase ID token; and
- a D1 `users.role = 'admin'` record.

There is no request-host, loopback-host or `MAKE_MONEY_LOCAL_EDITOR` privilege bypass. Missing/invalid identity returns 401, a non-admin returns 403, and persistence/read-back failures return an error rather than local success. Source research records in R2 and checked-in fixtures remain immutable; migration `0007_entity_approvals.sql` stores only the global editorial approval overlay (`entity_id`, approving actor and timestamp).

One Worker approval request is bounded to 800 explicit entity IDs. The client splits larger logical batches into sequential idempotent requests. D1 writes use multi-row inserts sized to stay below the provider binding limit, followed by bounded read-back; success is acknowledged only after every requested entity in that request is confirmed. If a later client chunk fails, already persisted chunks remain safe to retry and the UI does not treat the whole logical batch as acknowledged.

Public approval reads never enumerate the global approval table. The caller supplies only IDs it already has, with at most 80 IDs per projection request, and D1 returns the approved subset. The response uses a 10-second cache with revalidation and no stale-while-revalidate window. `useFoundationCatalog` requests projection state only for loaded records still carrying `収集事例`, chunks those reads, and merges the result onto summary and lazily fetched detail records without rewriting source evidence. Successful positive approvals are monotonic in the client projection; negative results expire after 20 seconds and are automatically re-queried so later approvals from another tab/admin session become visible without a full reload. Aborted or failed projection chunks receive no negative timestamp and remain immediately eligible for the replacement effect.

The production deployment entry point applies remote D1 migrations before the Worker build/deploy. Deployment preflight also pins the APP_DB migration directory to `migrations/d1`, and an architecture test fixes the order `preflight -> remote migrations -> Worker build -> deploy`. This PR does not itself apply the remote migration or deploy production.

## Local fixture utilities

`local-entity-approvals.ts` remains a filesystem utility covered by crash/recovery tests, but it is not an HTTP authorization mode and is not called by the approval route. It must not be treated as a supported network-accessible editor bypass.

Within that isolated utility, approval calls acquire an exclusive directory lock. Complete files are written through temporary files, fsync and rename, with a rollback journal prepared before changes. Tests use temporary directories and do not mutate checked-in collected entities, production R2 or production D1.

## Visual equivalence

The old screenshot script merely captured pages. The repaired visual job builds the original BASE with a pinned compatibility patch and HEAD in the same runner/browser/font/timezone environment. BASE alone creates the reference images; HEAD is checked with snapshot updates disabled, `maxDiffPixels: 0` and `threshold: 0`.

Deterministic API fixtures cover external runtime state. The moving ticker is frozen only inside the comparison harness. Next.js speculative RSC prefetch routes are drained before page teardown so a completed comparison cannot fail after its assertions. No application content is hidden and no pixel tolerance is introduced to obtain a pass.

## Verification rule

Evidence is attached to the exact GitHub Actions source SHA. Passing tests on an earlier SHA never certifies a later commit. The required gate is all of the following on the same final HEAD:

- lint and architecture checks;
- typecheck and schema checks;
- unit/foundation/architecture/recovery suites;
- production Next.js build and Worker bundle;
- normal Playwright E2E; and
- BASE-to-HEAD strict visual equivalence.

Merge is permitted only after those gates and the final review pass on the exact final HEAD. Remote migration application and production deployment are separate actions and are not performed by this repair record.

## Claims superseded

The earlier Phase203/204 text and original PR title claimed universal 100-year safety and absolute pixel identity from screenshots alone. Those claims were not supported. File-length limits are a scoped maintenance signal, not proof of SRP, correct behavior, or lifetime guarantees. The merge decision is based on behavior contracts and reproducible gates, not line-count reduction alone.
