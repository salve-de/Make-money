# Make-Money Collection -> Publication -> UI Master Handoff

Status: product-specific implementation handoff paired with the Universal Foundation lifecycle master.

Updated: 2026-09-26 JST.

Cross-project authority: `salve-de/universal-foundation/docs/COLLECTION_KNOWLEDGE_LIFECYCLE_MASTER_HANDOFF.md`.

This file explains how Make-Money consumes that Foundation pipeline. It is not allowed to redefine collection scope, provenance semantics, rights truth, or canonical history.

## 1. Product objective

Make-Money must receive the same real data produced by scheduled Web ChatGPT research through the normal deterministic delivery path:

```text
Web ChatGPT scheduled research
 -> GitHub operational artifacts
 -> R2_QUEUE candidate
 -> Publisher / Queue
 -> canonical/private R2
 -> Make-Money rights-safe materialized view
 -> /api/businesses
 -> local/browser UI
```

The user-facing UI may display only records allowed by the current publication gate. Canonical/private must retain useful unknowns, conflicts, provenance, raw/structured payloads where permitted, and rights metadata even when the UI cannot display them.

## 2. Non-negotiable boundaries

For the current local proof:

- do not change collection prompts or collection scope;
- do not change scheduled cadence;
- do not modify production R2/Queue/config;
- do not deploy;
- do not merge/update main;
- do not add Cron or GitHub Actions;
- do not touch unrelated dirty worktrees;
- do not use the existing unrelated localhost:3111 as evidence or stop/change it;
- do not weaken rights or provenance validation to make a fixture pass;
- do not invent receipt/evidence/policy lineage;
- do not expose private canonical data through public API fallback.

## 3. Current working branches

Fetch live heads before work; do not trust the SHA below as the latest after later documentation/test commits.

Implementation checkpoint before this handoff update:

- Make-Money branch: `codex/scheduled-research-ui-direct-20260926`;
- implementation checkpoint: `cb9dbf81fe2dce0dcf52ce78e534bba845a164d3`;
- Universal Foundation branch: `codex/scheduled-research-ui-direct-20260926`;
- Publisher implementation checkpoint before the documentation consolidation: `d8013e20987a4887de53531a30424dff29abe96e`.

## 4. Designated exact c9e lineage

This is the primary local-E2E case. Do not replace it with another Starwood fixture.

- handoff run: `run_handoff_c9e926361e9472f5085323dc727be7ff`;
- candidate Git blob: `c808a3352de85880f31c3ff647e394127d0aca10`;
- typed fixture Git blob: `649614315bd75857b6421d3139eafd1f2d0d6fd4`;
- source run: `run_verify_canary_starwood_20260925044005`;
- source artifact blob: `c77a9184c631ea84be7e3e262f93af96241e6103`;
- observed/finished time: `2026-09-25T04:42:00Z`;
- evidence: SEC 8-K + 424B3;
- public fact candidates:
  - Apollo-managed funds / affiliates: 41.5%;
  - Starwood: 58.5%.

Canonical/private must still contain the exact source lineage, unknown legal identity fields, provenance and internal rights identifiers.

## 5. Current c9e test state

Independent isolated-clone audit of Make-Money checkpoint `cb9dbf81fe2dce0dcf52ce78e534bba845a164d3`:

- selected 3 test files: 20 tests;
- 19 PASS;
- 1 FAIL;
- failure occurs in `src/lib/foundation/typed-ingest.e2e.test.ts` before the UI-rights assertion;
- API detail contains zero `public_fact.v1` observations for c9e.

Therefore the current candidate does **not** yet prove c9e PublicFact delivery to API/UI.

The next implementation task is to locate exactly where the generated PublicFact disappears between:

```text
projectTypedPublicFacts
 -> buildCommercialPublicFactProjection
 -> materializeMakeMoneyViews
 -> buildFoundationBusinessCaseForEntity
 -> publicFoundationBusinessCase
 -> /api/businesses
```

Do not modify the rights allowlist to bypass this.

## 6. Public-rights DTO boundary already identified

A previous defect dropped `publicRights` at the public API wire allowlist.

The candidate branch now explicitly copies only the reviewed public-safe rights DTO fields:

- commercial use;
- public Fact display;
- projection mode;
- source-content display;
- redistribution;
- excerpt;
- media;
- provider names;
- attribution;
- review time.

Do not expose:

- raw `rights_policy_id`;
- collector/private hold diagnostics;
- raw transport payloads;
- private source prose;
- unknown legal identity fields.

The regression test intentionally injects an internal policy field and requires it to disappear at the API boundary.

Keep this test.

## 7. Separate 2026-09-26 direct-typed fixture

This fixture is not the c9e lineage.

Its `automation-research` source has typed/source artifacts but no matching execution receipt required by the current provenance contract.

The required behavior is:

- HTTP 422;
- no R2 write;
- no invented receipt;
- no contract weakening.

The current regression test for this no-write failure must remain.

## 8. Public API contract

Foundation user-facing detail must come from the rights-gated Make-Money view.

Public request path:

```text
views/make-money/v1/entities/<entity>.json
 -> parse/allowlist
 -> public Foundation DTO
 -> adapter
 -> UI
```

It must not fall through to private canonical bundles when the public view is missing/held.

Public Observation wire fields are explicit allowlist fields. Raw collection/transport fields must not cross.

## 9. Annotation / enrichment consumption

Make-Money must expect Foundation to evolve with new post-collection analytical axes.

Examples:

- new tags/facets;
- business-model classification;
- source/where-found facets;
- commercial-rights re-review;
- risk/opportunity/change signals;
- competition/trend scores;
- later human/AI review notes.

Make-Money must consume these as versioned derived/annotation data or public projections, not require canonical source records to be rewritten.

If a new Make-Money-only presentation classification is product-specific, it may live here. If the taxonomy is reusable across products, its definition belongs in Universal Foundation.

The UI must never assume today's tag list is permanent.

## 10. "Where did this information come from?" requirement

When the product exposes source provenance, derive it from authoritative Source/Evidence/activity lineage.

Useful fields include:

- provider/publisher;
- Evidence source URL;
- source title/type;
- published/retrieved time;
- collection run/lane;
- source artifact and typed artifact lineage;
- Evidence IDs;
- public-safe attribution;
- exact locator where public-safe and useful.

Do not manufacture a free-form "source" string that cannot be traced to stored evidence.

## 11. Local E2E topology

### Make-Money local config

Current `foundation:local-e2e` setup supplies local R2/D1 bindings for the product Worker but not the Publisher Queue.

### Universal Foundation Publisher local config

The Publisher candidate has a dedicated `--local` configuration with local R2/Queue bindings and a safety checker.

The end-to-end proof should use the Publisher local environment for queue/data-plane behavior and Make-Money's local app/Worker for consumer API/UI behavior.

Use different loopback ports from the unrelated existing 3111 process.

## 12. GitHub read in local Publisher E2E

Do not require a broad PAT simply to read the public Universal Foundation repository.

Target implementation for `LOCAL_E2E_MODE`:

- `githubJson` may perform an anonymous request only for explicit allowlisted public GitHub GETs required by the local fixture;
- no `Authorization` header in this mode;
- method must be GET;
- repository/host/path must be narrowly allowlisted;
- all GitHub mutations remain impossible;
- all other non-loopback origins remain denied;
- production R2/Queue/external ingest origins remain denied;
- normal/non-local mode retains existing token requirements.

Add tests proving:
- allowed public GET succeeds without auth;
- mutation/non-GET is rejected;
- wrong repo/origin is rejected;
- no token is sent;
- safety failure occurs before any provider write.

## 13. Deterministically selecting c9e for local Publisher proof

The c9e candidate already exists in the public `automation-research` candidate listing.

Current observed listing position: path-descending 7th among 12 candidates.

Use existing local-only selection controls such as scheduled time override and bounded candidate/run limits only when they deterministically select the existing candidate.

Do not alter:
- candidate bytes;
- collection result;
- HANDOFF schema;
- mapper semantics;
- source lineage.

Record the exact candidate path/blob selected in the E2E evidence.

## 14. Required test order

Before the browser proof:

1. focused PublicFact projection tests;
2. public wire allowlist tests;
3. `StructuredObservationPayload` tests;
4. `typed-ingest.e2e.test.ts`;
5. relevant Make-Money typecheck/lint/architecture checks;
6. Universal Foundation Publisher `check`;
7. Universal Foundation Publisher `test`;
8. local safety checker;
9. actual local Publisher/R2/Queue execution;
10. Make-Money API request;
11. browser/network/UI verification.

MemoryR2 passing alone is not completion.

## 15. Local E2E acceptance

The c9e proof is complete only when all are observed:

- exact c9e candidate blob consumed;
- local Publisher/Queue path executed;
- canonical local R2 contains c9e run/private lineage;
- canonical contains internal rights/unknown/provenance fields;
- retry does not duplicate canonical;
- public materialized view contains the permitted PublicFacts;
- API returns 41.5/58.5;
- API returns the safe public-rights DTO;
- API excludes policy ID, raw transport, private unknown fields/source prose;
- UI displays 41.5/58.5;
- UI displays SEC attribution;
- UI displays public rights summary;
- browser Network proves the UI used the intended local API;
- unreceipted 9/26 direct-typed fixture stays 422/no-write.

## 16. Natural scheduled-run claim

The local E2E can prove the deterministic machinery is capable of consuming an already-produced normal candidate repeatedly and safely.

Without changing production or observing a later natural run, it cannot prove a future production Scheduled Task actually fired.

Report these separately:

- deterministic local path: provable now;
- future natural production invocation: requires an observed future run or separately authorized production evidence.

## 17. Key implementation files

Make-Money:

- `src/lib/foundation/public-fact.ts`;
- `src/lib/foundation/publication-rights.ts`;
- `src/lib/foundation/business-reader.ts`;
- `src/lib/foundation/make-money-view.ts`;
- `src/lib/company-access/public-entity.ts`;
- `src/lib/foundation/foundation-adapter.ts`;
- `src/app/api/foundation/ingest/route.ts`;
- `src/app/api/foundation/ingest/typed/route.ts`;
- `src/app/api/businesses/route.ts`;
- `src/features/company-inspector/ui/StructuredObservationPayload.tsx`;
- `src/features/company-inspector/ui/UniversalIntelligenceStream.tsx`;
- `wrangler.foundation-local-e2e.jsonc`.

Universal Foundation Publisher:

- `workers/r2-queue-publisher/src/index.js`;
- `workers/r2-queue-publisher/src/index.test.js`;
- `workers/r2-queue-publisher/scripts/check-local-e2e-safety.mjs`;
- `workers/r2-queue-publisher/scripts/check-local-e2e-safety.test.mjs`;
- `workers/r2-queue-publisher/wrangler.local-e2e.jsonc`.

## 18. Completion reporting format

Every continuation should report:

- exact live branch HEADs;
- tests actually executed and exit status;
- exact real run/blob under test;
- what is proven;
- what remains unproven;
- whether any protected production surface was touched;
- single next blocking step.

Do not use "implemented" as a substitute for executed evidence.
