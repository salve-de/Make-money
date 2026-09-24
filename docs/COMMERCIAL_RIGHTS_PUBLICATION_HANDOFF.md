# Commercial Rights / Public Publication Handoff

Updated: 2026-09-24 JST

## Final objective

Keep Make-Money's scheduled Web ChatGPT research broad, but make monetized user-facing publication fail closed.

Private/canonical research and public product publication are separate:

```
scheduled discovery / verification
  -> typed sidecar
  -> canonical private Foundation ingest
  -> commercial/public rights filter
  -> fact-only Make-Money projection
  -> New Arrivals / API / UI
```

A source being public, searchable, or stored as `metadata_only` does not authorize commercial display.

## User intent / constraints

- Keep discovery broad; do not restrict research to only commercially reusable websites.
- Do not change collection schedules/prompts as a shortcut.
- Preserve internal leads and provenance where permitted.
- News/social/community sources may discover opportunities but must be re-sourced before their facts become public if their terms do not permit monetized reuse.
- Public UI must not expose source article text, screenshots/media, or free-form source-derived summaries merely because canonical research contains them.
- Existing 3,085 released records require a separate retrospective rights audit.

## Current implementation

Branch: `rights-publication-gate-20260924`

New module:
- `src/lib/foundation/publication-rights.ts`

Behavior:
1. full validated bundle still goes to canonical/private Foundation R2;
2. public projection requires an explicit registered `rights_policy_id`;
3. only policies explicitly safe for automatic commercial fact display are auto-admitted;
4. records must be `SUPPORTED` and depend only on allowed Evidence;
5. rights-cleared Observations may enter only as newly built fact-only public DTOs: the exact `observation_type` must have an explicit reviewed field contract and only fields named in that contract are projected; unknown types/fields (including numeric fields) fail closed. Raw `payload`, source prose, collector metadata, observer/schema/transport fields are never copied;
   Initial contract: `business_model.revenue_signal` requires both finite numeric `amount` and a three-letter uppercase `currency`; missing/invalid required fields drop the Observation rather than emitting a partial DTO.
6. `derived` text remains excluded from the public projection;
7. if nothing survives, API returns canonical success with `view_projection.status=RIGHTS_HELD`;
8. held bundles do not enter Make-Money view or New Arrivals.

Starter auto-approved policies are deliberately narrow: `rights.e-stat.v1` and `rights.bls.v1`. Conditional policies (Gビズインフォ, EIA, Eurostat, Companies House) remain held until their exception/attribution conditions can be mechanically proven per record/dataset.

The policy SSOT is the paired Universal Foundation branch/file:
`salve-de/universal-foundation/docs/COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md`

## Why this design

- Do not discard useful internal research.
- Do not pretend copyright-analysis permission equals website ToS permission.
- Do not pretend raw-storage permission equals publication permission.
- Do not publish a mixed bundle just because one Evidence item is safe.
- Prefer structured facts over article-like summaries.
- Default to hold when policy identity or conditions are unknown.

## Existing catalog

Current release manifest:
- sourceCount: 3,341
- publishedCount: 3,085

This release predates the new granular rights gate. It must be audited separately rather than silently grandfathered.

## Work status

- [x] External official terms review.
- [x] Current scheduled typed-sidecar rights audit.
- [x] Universal Foundation granular rights schema + provider starter policies.
- [x] Canonical/private vs public projection architecture decided.
- [x] Add fail-closed fact-only rights projection to typed ingest route.
- [x] Add the same public gate to legacy Foundation ingest route.
- [x] Add unit tests for missing policy, approved policy, conditional policy and UNVERIFIED facts.
- [x] Add producer-side public Observation DTO projection for rights-approved structured facts; raw payload/prose/internal metadata remain private. Consumer carriage/rendering depends on Make-Money PR #71.
- [ ] Run Make-Money test/type/build checks and repair any failures. Current PR #67 CI history: first run exposed the expected legacy E2E assumption; second run proved the RIGHTS_HELD path but found two fixture/code typos (old constant name and claim ID prefix). Both are fixed in the next commit; rerun pending.
- [x] Run and document the preliminary 3,085-record registry/lineage audit.
- [ ] Run the per-dossier R2 Evidence/public-rights audit.
- [ ] Quarantine/exclude existing catalog records that cannot prove a public rights basis.
- [ ] Prove one real typed sidecar can ingest canonically while public view is RIGHTS_HELD.
- [ ] Prove one approved-policy fixture reaches the public projection.
- [ ] Open/merge paired PRs.
- [ ] Verify production API/UI after deployment.
- [ ] Keep this file updated after every material step.

## Resume instruction

Another chat/agent must:
1. read this file;
2. read the paired Universal Foundation handoff;
3. inspect branch/PR `rights-publication-gate-20260924`;
4. continue from the first unchecked item;
5. append concrete test/audit/PR evidence here before stopping.


## Preliminary 3,085-record audit evidence

Reproducible report: `reports/commercial-rights-catalog-audit-20260924.md`
Script: `scripts/audit-commercial-rights-lineage.mjs`

Result: 3,085/3,085 release IDs match the registry; 761 use eBizFacts lineage IDs and 1,150 belong to IndieHackers-named batches. Both source families' current official terms materially restrict commercial/scraping reuse. This is a review-priority signal only; current R2 Evidence must be audited before a public dossier is quarantined.


## Security finding: canonical read-through bypass

During CI repair, the user-facing detail route was found to fall back from a missing Make-Money view to `readFoundationBusinessCase(entityId)`, which reads private canonical Foundation data. That would bypass a `RIGHTS_HELD` decision.

The branch now removes that public-route fallback. User-facing Foundation detail may read only the rights-gated Make-Money materialized view; otherwise it falls back to the separately curated legacy catalog or returns 404. Search/list already enumerate the Make-Money view prefix rather than canonical bundle objects.

Also tightened the runtime policy snapshot from a policy-ID allowlist to an exact policy-ID -> source-ID mapping, so a non-e-Stat source cannot attach `rights.e-stat.v1` and pass.


## Review fixes before merge

PR #67 code review found three P1 concerns:
1. policy/source spoofing — fixed by exact policy-ID -> source-ID mapping;
2. mixed-rights retry bookkeeping — fixed by letting projection resume validate target/progress against the filtered public bundle while validating immutable canonical bytes against the original private bundle;
3. record-only enrichment — fixed by allowing SUPPORTED rights-cleared facts to project even when `entities=[]`; target IDs are derived from factual record references and the projector hydrates canonical identity.

The public API canonical read-through bypass found during CI repair is also closed.


### Policy identity hardening

The automatic allowlist now binds `policy-ID -> source-ID -> official-host suffix`. Both Source.canonical_url and Evidence.source_url must fall inside the registered host scope. A collector cannot pass a restricted page by labeling it `src.e-stat` and attaching `rights.e-stat.v1`.


### Regression coverage

Added mixed-rights retry E2E: one immutable canonical bundle contains one approved entity/fact and one held entity/fact. The first call may materialize only the approved target; the second identical call must resume the filtered projection against the original canonical bundle without rewriting canonical R2 or exposing the held target.


## Production R2 full audit command

This chat runtime has no Cloudflare/R2 account connector, so it cannot truthfully enumerate production R2 directly. The repository now contains a production-R2 audit that uses the existing macOS Keychain credential wrapper:

```bash
pnpm foundation:rights:audit
```

Implementation: `scripts/audit-commercial-rights-r2.ts`

It performs two audits:
1. Foundation materialized views: maps every `source_run_id` back to canonical research bundles and runs the same commercial-publication rights assessment; any missing/held contributing run makes the view non-SAFE.
2. Legacy 3,085 release dossiers: reads every immutable dossier from R2, extracts evidence/source URLs, combines them with registry lineage, and classifies SAFE / NEEDS_RIGHTS_REVIEW / INTERNAL_ONLY conservatively.

Default report:
`reports/runtime/commercial-rights-r2-audit-latest.json`

A future chat/Codex running on the user's configured Mac should execute this command, inspect the full JSON, then commit an immutable dated summary/report. Do not claim the R2 audit is complete before that actual command succeeds.


## Commit-pinned consumer rights snapshot

The Make-Money runtime no longer invents an allowlist independently. It consumes:

`data/foundation-public-rights-snapshot.json`

The snapshot is derived from and pins Universal Foundation commit
`dd53262fb24ea51a824a9c14b8d4c939fed820a4`, with the exact policy/source registry paths and Git blob SHAs for each auto-public source.

Runtime admission requires all of:
- registry policy status = approved;
- commercial_use = allowed;
- public_fact_display = allowed;
- source status = active;
- policy.source_id = source.source_id;
- source.rights_policy_ids contains the policy;
- exact source ID match in the research bundle;
- Source.canonical_url and Evidence.source_url inside the snapshot's approved host suffixes.

Adding another automatic public source therefore requires an auditable Universal Foundation registry change plus an explicit Make-Money snapshot update; arbitrary bundle-supplied policy IDs cannot grant publication.
