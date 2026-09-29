# Commercial Rights / Public Publication Handoff

Updated: 2026-09-30 JST

## Final objective

Build a valuable Make-Money catalog by researching business facts, writing original fact-based presentations, and displaying the commercially usable facts in the UI with evidence and source history attached. Prefer sources with clear reusable terms, but do not treat the absence of an open-license label by itself as proof that a factual claim cannot be commercially displayed.

Rights review is both a **source-selection and re-sourcing strategy** and a publication safeguard; it is not a project whose goal is merely to hide existing records. Keep the subject matter and research scope broad. Japanese copyright guidance distinguishes unprotected facts/data from protected creative expression; therefore, review the actual use rather than requiring every fact-source to carry a blanket commercial license. When a source restricts the access method, bulk extraction, or reuse of its expression/media, find a permitted way to verify the fact or hold only the affected material. Do not assume that an online URL, citation, AI rewrite, or OpenAI output transfers rights in the underlying source.

Private/canonical research and public product publication are separate:

```
scheduled discovery / verification
  -> typed sidecar
  -> canonical private Foundation ingest
  -> commercial/public rights filter
  -> fact-only Make-Money projection
  -> New Arrivals / API / UI
```

A source being public, searchable, or stored as `metadata_only` does not by itself authorize copying its article, images, database, or restricted API output. Conversely, absence of an explicit open-license label does not automatically prohibit an independently stated fact; the documented legal basis and the intended use still need review.

## Media / thumbnail / likeness update — 2026-09-30

The paired Universal Foundation now has a per-asset/per-use media policy and schema. Make-Money should preserve ordinary verified facts in its own wording without treating a missing open-content licence as an automatic copyright prohibition. Images are reviewed separately.

For media:
- a licence/platform/press-kit/embed/consent/public-domain basis is preferred;
- Japan Copyright Act Article 47-5 can be evaluated for genuinely minor thumbnails incidental to computerized search/information-analysis result provision; it is not a blanket licence and does not extend automatically to hero/gallery/ad use;
- Article 47-4 is primarily technical/internal computer-use copying, not the normal user-facing display basis;
- identifiable people require separate portrait/privacy/publicity review;
- app icons should prefer official developer assets or explicit platform/API terms (including Apple's Search API promotional route where its conditions are met);
- third-party app-store screenshots default to metadata/link unless an explicit/platform/statutory basis supports the exact public use;
- a Japan-only thumbnail basis must not be silently treated as worldwide media permission.

Canonical details: `docs/MEDIA_THUMBNAIL_AND_LIKENESS_POLICY.md`.

## Commercial-use interpretation — 2026-09-28

The collection goal is **commercially usable information**, not “only records carrying an open-license badge” and not “hide everything with uncertain status.” Apply rights to each use and published claim:

1. **Factual claims / original summaries:** Japanese Agency for Cultural Affairs guidance says mere facts and data are not copyright works. Collect verifiable business facts, bind each to evidence, and present them in Make-Money's own structure and wording. Do not copy article prose, distinctive phrasing, charts, or a source's selection/arrangement. No-open-license alone is not a rejection reason; check access terms, any database/bulk-use restrictions, privacy/personality and other relevant rights. If an actual restriction or material uncertainty remains, re-source the fact or hold that claim—not unrelated cleared claims.
2. **OpenAI / AI-generated copy:** OpenAI's individual Terms assign Output to the user as between user and OpenAI, to the extent applicable law permits, but third-party search content remains subject to third-party terms and Output may not be unique. The consumer Terms prohibit automatic/programmatic extraction from the service; do not scrape ChatGPT Web. For product automation, use the contracted API or a specifically authorized integration. OpenAI API Web Search results shown to end users require visible, clickable inline citations. Review factual accuracy and clearly disclose AI's role in published first-party text under the current OpenAI Sharing & Publication Policy.
3. **Images, charts, logos, people:** Do not copy random web images or charts. Use a verified commercial license/permission or an original asset; record author, asset URL, license/version, attribution and relevant release/brand limits. A license for an image does not automatically clear the depicted person's likeness/privacy or a logo/trademark. Prefer a text name or original generic illustration when the image adds no essential value.
4. **Source/use ledger:** Keep collection/access, raw retention, factual display, verbatim quotation, and media rights separate. Preserve source/evidence URL, publisher, publication/as-of date, retrieval time, precise locator, claim IDs, terms/license URL and version, reviewed date, attribution instructions, rights decision, scope, and reason. If the canonical schema cannot represent a permission, do not invent `allowed`; identify the missing policy/schema and resolve it through the registered Universal Foundation process.
5. **Display rule:** Show each claim/media item that has evidence, an applicable use basis, and the required attribution. Exclude or replace only held claims/media; do not suppress unrelated rights-cleared facts merely because another field or image is held. A case can have honest `UNKNOWN`/not-found fields and still display its supported facts.

This interpretation is grounded in the current repository's collection master guide and official references reviewed 2026-09-28: [Agency for Cultural Affairs: using other people's works](https://www.bunka.go.jp/seisaku/chosakuken/seidokaisetsu/chosakukensha_fumei/), [Agency for Cultural Affairs: AI and copyright](https://www.bunka.go.jp/seisaku/chosakuken/aiandcopyright.html), [PPC FAQ](https://www.ppc.go.jp/personalinfo/faq/APPI_QA/), [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/), [OpenAI Services Agreement](https://openai.com/policies/may-2025-business-terms/), [OpenAI Sharing & Publication Policy](https://openai.com/policies/sharing-publication-policy/), [OpenAI Web Search citation requirements](https://developers.openai.com/api/docs/guides/tools-web-search), and [Creative Commons license guidance](https://creativecommons.org/share-your-work/licensing-considerations/version4/). This is an operational policy, not legal advice for a particular disputed use.

### Important implementation boundary

This policy update does **not** grant a blanket license or change runtime publication behavior. `src/lib/foundation/publication-rights.ts` still auto-admits only exact policies in `data/foundation-public-rights-snapshot.json`; the current snapshot contains three source-policy entries. A source outside that snapshot may therefore remain `RIGHTS_HELD` in the application even when the missing open-license label alone would not establish a legal prohibition on an independently presented fact. That is an **automation-policy gap**, not a legal finding that every held fact is unlawful. To publish additional source families automatically, review the actual source/access terms and add a source-scoped fact-display policy through the Universal Foundation rights/source registry, refresh this repository's pinned snapshot, and test that only the reviewed claim types/hosts/paths pass. Do not solve the gap with a generic host allowlist or by trusting a collector-supplied `allowed` flag.

## Active collection persistence — 2026-09-30

The four Make-Money research lanes are active again using a Google Drive JSON Ledger rather than GitHub/R2 writes. Canonical JSON is append-only in the Ledger Payload tab with compact case/run/claim/media/dedupe indexes; raw `.json` folders are secondary export/review surfaces. The current mode, dedupe/claim rules, v1.1 case schema and media-candidate behavior are documented in `docs/MAKE_MONEY_DRIVE_COLLECTION_MODE.md`. R2_QUEUE remains paused; Drive collection does not automatically reach the public API/UI.

## User intent / constraints

- Keep business/case discovery broad; do not narrow the kinds of businesses, facts, or analysis collected. Prefer clear reusable sources, while allowing independently stated facts to proceed to a documented use-specific review when the source has no explicit open-license label.
- Do not infer either blanket permission or blanket prohibition from a public URL or missing license notice. Review the actual acquisition and display method; re-source or hold only the affected claim/media when a restriction applies or a material issue remains unresolved.
- Record terms by use mode: collection/API access, raw-source retention, derived factual display, quotation/text, images/media, attribution, and any limits; include the terms URL/version and review date. Do not infer all permissions from a public URL or a provider hostname.
- Do not change collection schedules/prompts as a shortcut.
- Preserve internal leads and provenance where permitted.
- News/social/community sources may be leads. Their factual claims may be independently verified and rewritten where the method and applicable rules permit; do not republish their protected wording, scraped database, or media when not licensed.
- Public UI may show independently written fact-based summaries when each claim is supported and cleared for that use. It must not expose copied article text, unlicensed screenshots/media, or unsupported source-derived assertions merely because canonical research contains them.
- Existing 3,085 released records require a separate retrospective rights audit.

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
- Do not publish unsupported/held claims just because another Evidence item is safe; equally, do not suppress independently cleared facts solely because a different claim or image is held.
- Prefer structured facts over article-like summaries.
- When the automated policy identity or conditions are unresolved, keep that item out of automated public projection until the use basis is resolved. This is an automation gate, not a conclusion that the underlying fact is legally unusable.

## Existing catalog

Current release manifest:
- sourceCount: 3,341
- publishedCount: 3,085

This release predates the new granular rights gate. It must be audited separately rather than silently grandfathered.

## Work status

Objective clarification added 2026-09-28: the desired outcome is a catalog populated with commercially reusable, source-backed business information—not an empty catalog produced by applying a rights gate. Existing records should be audited, and useful held facts should be re-sourced from permitted material wherever possible. A case may still contain explicitly unknown or unavailable facts; completeness means every displayed assertion is supported and permitted, and coverage gaps are honestly recorded, not that every field is filled.

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
- [x] Execute `pnpm foundation:rights:audit` on the configured Mac with actual R2 credentials. The read-only run completed 2026-09-28; results are recorded below and in `reports/runtime/commercial-rights-r2-audit-20260928.json`.
- [ ] Commit an immutable dated summary of that real R2 audit.
- [ ] For legacy/current public records classified `INTERNAL_ONLY` or unresolved `NEEDS_RIGHTS_REVIEW`, remove/rebuild the **public projection only**; do not delete canonical research merely because publication is held.
- [ ] Re-source important held facts where useful; register any newly reviewed source-specific fact-display basis in Universal Foundation before automatic publication.
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


## Latest observed R2 audit — 2026-09-28

The configured-Mac command completed a read-only audit against `foundation-lake` from Make-Money HEAD `221d0e4e66c649aa0de5c72b9f2c52eeb3f8104e`.

| Scope | Audited | SAFE | NEEDS_RIGHTS_REVIEW | INTERNAL_ONLY |
|---|---:|---:|---:|---:|
| Foundation materialized views | 1,772 | 4 | 1 | 1,767 |
| Legacy published dossiers | 3,085 | 0 | 1,173 | 1,912 |

The legacy result is not a legal finding that every dossier is prohibited. `INTERNAL_ONLY` means the dossier includes an evidence URL in a currently restricted source family; `NEEDS_RIGHTS_REVIEW` means the legacy dossier cannot bind every displayed fact to current rights-cleared evidence. The legacy format is never automatically `SAFE` because hostnames do not prove which source supports each displayed field.

Lineage triage counts: 761 eBizFacts-ID records, 1,150 IndieHackers-named batches, and 16 eBizFacts-named batches. These are review signals, not proof of exclusive sourcing and not counts to sum.

The full machine report is `reports/runtime/commercial-rights-r2-audit-20260928.json` (SHA-256 `dc1740a7c2b78839bd046997eef0b2865ebf18cfdb0e171544c0f721b7f20ff3`). Run time was `2026-09-28T13:18:22.652Z`–`2026-09-28T13:25:56.640Z`. The command listed/read R2 objects and wrote only this local report; it did not modify R2, catalog publication, API, UI, or deployment state.

This rights triage is not the separate per-case factual/coverage audit. Commercial permission, raw-storage permission, and public factual display remain distinct decisions; the legacy release still has no record-level proof that every displayed fact has passed both factual audit and commercial-publication review.
