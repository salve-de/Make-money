# Commercial Rights / Public Publication Handoff

Updated: 2026-09-25 JST

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

## Public rights visibility and local E2E boundary — 2026-09-26 candidate

The public product must make the publication basis understandable without exposing
private/canonical research or internal hold reasons.

For a rights-cleared published Observation/PublicFact, the public projection may
carry only a bounded public-rights summary derived from the pinned Universal
Foundation rights policy:

- commercial use = allowed;
- public fact display = allowed;
- product projection mode = fact-only;
- source-content public-display / redistribution / excerpt / media disposition;
- provider name;
- required attribution text;
- rights review timestamp.

The public API/UI must not expose raw `rights_policy_id`, collector-only rights
hints, private source payload, or internal HOLD diagnostics merely to explain a
publication decision.

`RIGHTS_HELD` remains fail-closed:

- canonical/private research stays preserved;
- no Make-Money public entity view is created for the held-only target;
- `/api/businesses` must not read through to private canonical data;
- held content, policy internals and private evidence do not appear in the user
  response;
- a public UI may show only already-cleared records from a mixed-rights bundle.

The public-rights summary is not independent legal advice or a new grant of
rights. Its values must match the exact commit-pinned Universal Foundation
policy blob. The upstream release checker validates those copied metadata fields
against the pinned blob before deployment.

### Zero-production-write local E2E

Do not use the normal production `wrangler.jsonc` for Foundation write-path
browser E2E because its Foundation R2 bindings are configured as remote
production resources.

Use only:

```bash
pnpm foundation:local-e2e:dev
```

That command first validates `wrangler.foundation-local-e2e.jsonc`, builds the
Worker, then starts Wrangler with `--local`. The local config:

- uses only `*-local-e2e` R2/D1 names;
- sets all supported storage bindings to `remote:false`;
- sets `ENVIRONMENT=development`;
- has no production triggers;
- persists state only under `.wrangler/foundation-local-e2e`.

This is the required browser-E2E environment for tests that POST to Foundation
ingest. Production R2 is not part of local acceptance.

## Current implementation / current main

Authoritative Make-Money state is now **main**, not the old PR #67 branch.

Integrated:
- Universal Foundation PR #40 — granular commercial/public rights policy model — merged.
- Universal Foundation PR #41 — stable provider source registry linked to rights policies — merged.
- Make-Money PR #78 — rights-safe Public Fact / Observation consumer path — merged as `59a5723863c61d1e3b60ced90d74a8301b60ede7`.
- PR #78 head `42ea0c869c964918f4afe38b674401eaa3c49aa9` Quality CI — **SUCCESS**.
- Make-Money PR #67 — **closed as superseded by #78/main**; do not merge the old branch over main.

Current public-publication architecture on main:
1. full validated research may remain in canonical/private Foundation storage;
2. public materialization is rebuilt through current rights rules, not copied from private canonical data;
3. unknown/unapproved rights remain `RIGHTS_HELD`;
4. source admission is pinned to the Universal Foundation rights/source registry snapshot and validates provider/source type/host/path scope;
5. standard facts require rights-cleared Evidence;
6. structured Observation payloads require an approved data-driven public Observation contract; unknown types/fields remain private;
7. VERIFY_RECONCILE Public Fact v1 candidates use a dedicated fail-closed contract;
8. record-only enrichment may reuse identity only from already-public identity state, never private-canonical identity as a publication fallback;
9. list/detail/rebuild/unresolved replay use the same public projection boundary;
10. held data does not enter New Arrivals or user-facing Foundation views.

Current key files:
- `src/lib/foundation/publication-rights.ts`
- `src/lib/foundation/public-fact.ts`
- `data/foundation-public-rights-snapshot.json`
- `data/foundation-public-observation-contracts.json`
- `src/app/api/foundation/ingest/typed/route.ts`
- `src/app/api/foundation/ingest/route.ts`
- `src/lib/foundation/make-money-view.ts`
- `src/app/api/businesses/route.ts`

The policy/source SSOT remains Universal Foundation `main`.

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

Completed:
- [x] External official terms review for representative allowed/restricted source families.
- [x] Current scheduled typed-sidecar rights audit.
- [x] Universal Foundation granular rights schema.
- [x] Universal Foundation provider source registry.
- [x] Canonical/private research vs public product publication separation.
- [x] Fail-closed rights gate on normal typed ingest and legacy ingest.
- [x] Public API private-canonical read-through bypass closed.
- [x] Mixed-rights retry bookkeeping fixed and regression-tested.
- [x] Record-only enrichment publication behavior fixed and regression-tested.
- [x] Policy/source/URL spoofing hardened with pinned registry + source/provider/type/host/path checks.
- [x] Public Observation DTO contracts added; unknown payload fields/types stay private.
- [x] VERIFY_RECONCILE Public Fact v1 consumer path added with fail-closed type registry.
- [x] Make-Money Quality CI passed on the merged #78 implementation.
- [x] Preliminary 3,085-record registry/lineage audit documented.
- [x] Production R2 commercial-rights audit command implemented and hardened to record-level SAFE semantics; legacy dossiers are never auto-SAFE.

Still required before claiming legacy catalog/publication is fully cleared:
- [ ] Execute `pnpm foundation:rights:audit` on the configured Mac with actual R2 credentials.
- [ ] Commit an immutable dated summary of that real R2 audit.
- [ ] For legacy/current public records classified `INTERNAL_ONLY` or unresolved `NEEDS_RIGHTS_REVIEW`, remove/rebuild the **public projection only**; do not delete canonical research merely because publication is held.
- [ ] Re-source important held facts from approved official/API/registry sources where possible.
- [ ] Deploy the merged main build through the existing production process when authorized.
- [ ] Verify production R2 readback -> API -> UI does not expose pending/blocked/private material.
- [ ] Update this file with the production evidence.

Important: collection schedules/prompts were not changed as a shortcut for rights.

## Resume instruction

Another chat/agent must begin here:

1. Read this file and `HANDOFF.md`.
2. Treat Make-Money `main` as authoritative; **do not revive/merge old PR #67**.
3. Confirm Universal Foundation `main` still contains the paired rights/source registries.
4. The first unfinished operational step is:
   ```bash
   pnpm foundation:rights:audit
   ```
   Run it on the user's configured Mac where the existing Keychain R2 credentials are available.
5. Inspect `reports/runtime/commercial-rights-r2-audit-latest.json`. The audit is fail-closed: Foundation `SAFE` now requires exact record-level reconstruction from the current rights-cleared public projection plus a rights-cleared public Entity identity. Legacy dossiers are **never auto-SAFE** because their old format lacks field-level evidence bindings.
6. Commit a dated immutable audit summary with exact counts, entity IDs, unbound records and held-evidence records.
7. `INTERNAL_ONLY` is a strong public-quarantine candidate. `NEEDS_RIGHTS_REVIEW` must remain under review/re-sourcing; do not treat an apparently safe hostname as publication proof.
8. Never infer `SAFE` merely from lineage, public accessibility, `metadata_only`, or ChatGPT-generated text.
9. Do not alter collection schedules/prompts to solve rights.
10. Before stopping, append exact SHA/PR/test/audit evidence to this file.

Current integrated reference points:
- Make-Money main merge: `59a5723863c61d1e3b60ced90d74a8301b60ede7` (#78)
- #78 Quality CI: SUCCESS on head `42ea0c869c964918f4afe38b674401eaa3c49aa9`
- Universal Foundation rights PR #40: merged
- Universal Foundation source-registry PR #41: merged
- Make-Money PR #67: closed/superseded


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


## Registry-driven publication follow-up — 2026-09-25

Read-only audit of Universal Foundation main `c271502e34c6772759c02048ca690403da51fcf1` found 179 typed sidecars under `staging/automation/typed-records`. A full blob recount confirmed:
- sources: 608; `rights_policy_id` non-null: 0;
- evidence: 614; `rights_policy_id` non-null: 0;
- source rights_status: pending_review 542 / metadata_only 64 / blocked 2;
- evidence rights_status: pending_review 547 / metadata_only 65 / blocked 2;
- observations: 633;
- `business_model.revenue_signal`: 0.

Independent QA additionally counted 582 distinct Observation types. The exact distinct-type union is not used as a publication permission signal.

Implication: PR #75's tested producer/API/UI path does not by itself make current Web ChatGPT output publishable. Waiting for another run is not sufficient while collection-side rights fields remain unresolved and arbitrary Observation types have no public contract.

Publication authority is therefore separated from collector output:
1. Collector/VERIFY rights fields remain immutable provenance hints, not authority.
2. A commit-pinned reviewed source/rights snapshot may resolve a null policy only when provider identity, approved source type and official host all match exactly and uniquely.
3. `blocked`, conflicting explicit policies, unknown providers/types/hosts, ambiguous matches and unknown statuses remain held.
4. No raw sidecar is rewritten when registry resolution succeeds.
5. Standard fact families (claims/metrics/money_signals/events/relationships) remain eligible only after Evidence rights pass.
6. Observation payloads require an approved data-driven public Observation contract. Unknown types and unknown fields remain private. Adding a reviewed contract changes registry data, not executable projection logic.

This follow-up does not approve any new provider, does not retroactively rewrite existing sidecars, and does not write production R2/Queue.


## Audit SAFE semantics (2026-09-25 hardening)

The first retrospective audit version was too permissive: a Foundation bundle with at least one allowed Evidence could be labeled ALLOWED even if it also contained held Evidence, and a legacy dossier could appear SAFE merely because all extracted URLs used an approved hostname.

That is not enough to make a public-retention decision.

`scripts/audit-commercial-rights-r2.ts` now uses schema `make-money-commercial-rights-r2-audit.v2`:

- Foundation `SAFE` requires every currently displayed record to exactly match a record reconstructed by the **current** rights-cleared public projection, including its Evidence bindings.
- The displayed entity identity must also match a rights-cleared public Entity row.
- A displayed record/entity that references Evidence held under the current rights gate is `INTERNAL_ONLY`.
- Missing/unreconstructable records or identity remain `NEEDS_RIGHTS_REVIEW`.
- Legacy immutable dossiers are **never automatically SAFE** because their old representation does not prove field-level Evidence -> displayed-field bindings. Approved hostnames are only a review-priority signal.
- Do not retain a legacy/public row merely because its audit URLs look safe.
