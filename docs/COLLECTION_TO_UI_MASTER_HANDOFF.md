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

Always fetch live heads before execution; documentation SHA values are checkpoints, not permission to skip a fresh fetch.

Current verified checkpoint:

- Make-Money branch: `codex/scheduled-research-ui-direct-20260926`;
- Make-Money verified code SHA: `2c6326021cbddabab9c04c1408973bdb0a5d8f8a`;
- GitHub Actions Quality run: `36242943089` — **SUCCESS**;
- lint: PASS;
- typecheck: PASS;
- unit/full test: PASS;
- build + OpenNext Worker bundle: PASS;
- ordinary Playwright E2E smoke: PASS;
- Foundation local-E2E safety check: PASS inside the same full test run;
- Universal Foundation branch: `codex/scheduled-research-ui-direct-20260926`;
- Universal Foundation local-E2E target SHA: `645653f9f9d5ef538aa4684b7966646f9b4f0adb` — requires independent `npm test && npm run check` and physical local execution before final acceptance.

Later documentation/test commits may advance these heads. Never infer current branch state from this paragraph alone.

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

Make-Money code-level verification is now green at
`2c6326021cbddabab9c04c1408973bdb0a5d8f8a`.

GitHub Actions Quality run `36242943089` completed successfully across all five jobs:
- lint PASS;
- typecheck PASS;
- unit test PASS;
- build PASS;
- ordinary E2E smoke PASS.

The unit job executed the complete Vitest suite with **109 files / 795 tests PASS** and also executed `foundation:local-e2e:check` successfully.

Relevant c9e/publication tests on this SHA include:
- `src/lib/foundation/publication-rights.test.ts`: 27/27 PASS;
- `src/lib/foundation/publication-rights.starwood-20260926.test.ts`: 6/6 PASS;
- `src/lib/foundation/typed-ingest.e2e.test.ts`: 16/16 PASS;
- `src/lib/company-access/public-entity.foundation-observation.test.ts`: 3/3 PASS;
- `src/features/company-inspector/ui/StructuredObservationPayload.test.tsx`: 1/1 PASS.

The unreceipted 2026-09-26 direct-typed fixture still intentionally reaches the fail-closed 422/no-write path.

The build job also completed `pnpm build && pnpm bundle:workers`, including TypeScript and OpenNext Worker generation. The earlier `publication-rights.ts` TypeScript failures are therefore resolved on this SHA without weakening the rights gate.

The prior 19/20 failure was not PublicFact generation. `/api/businesses` read the
current R2 materialized view and then replaced it with a stale process-local
60-second detail cache for the same entity. Removing that redundant cache fixed
the real publication freshness defect without changing the rights gate.

The code-level c9e MemoryR2/API/UI contract is therefore green. Remaining
acceptance is physical local Worker/Queue/R2/API/browser execution; MemoryR2
tests alone are still not the final source-to-UI proof.

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

Checked-in local ports/state:

- Make-Money Worker: `127.0.0.1:3211`;
- Publisher Worker: `127.0.0.1:3212`;
- Make-Money inspector: `9231`;
- Publisher inspector: `9232`;
- shared local persistence: `/tmp/make-money-c9e-local-e2e`;
- unrelated localhost:3111 is not used.

Reset only the isolated local state, then start Make-Money first:

```bash
pnpm foundation:local-e2e:reset
pnpm foundation:local-e2e:dev
```

Then from `universal-foundation/workers/r2-queue-publisher` start the Publisher:

```bash
pnpm dev:local-e2e
```

Do not manually inject the candidate. From the Make-Money repo run:

```bash
pnpm foundation:local-e2e:verify
```

The verifier anonymously reads the current public `automation-research`
candidate tree, locates exact blob
`c808a3352de85880f31c3ff647e394127d0aca10`, computes a fixed
`scheduledTime` that makes the ordinary `selectCandidateFiles()` rotation
select it first, and calls Wrangler's standard
`/cdn-cgi/local/scheduled?cron=...&time=...` endpoint twice with the same
time. Publisher parsing, validation, rights, Queue consumption and Make-Money
ingest remain the normal code path. The local scan budget is one bundle, so a
replay cannot advance to a second candidate after c9e is already committed.

After the R2/API verifier passes, run the real browser proof:

```bash
pnpm foundation:local-e2e:browser
```

After publication, inspect canonical local R2 with the same persistence path:

```bash
pnpm exec wrangler r2 object get \
  foundation-lake-local-e2e/datasets/ds.business.research-bundles.derived/v1/2026/09/25/run_handoff_c9e926361e9472f5085323dc727be7ff.json \
  --local \
  --persist-to /tmp/make-money-c9e-local-e2e \
  --file /tmp/c9e-canonical.json
```

Then verify API detail for both entities:

```bash
curl -fsS "http://127.0.0.1:3211/api/businesses?foundationOnly=true&entity_id=ent_org_0e1d9b556075d9fc7f36"
curl -fsS "http://127.0.0.1:3211/api/businesses?foundationOnly=true&entity_id=ent_org_4a819d424adf6b2a118f"
```

Finally open `http://127.0.0.1:3211/` in the browser, use the real UI to open
the Starwood/Apollo records, and capture Network + rendered evidence.

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


## 19. Flexible collection / later enrichment contract for Make-Money

Make-Money must **not** assume that today's fields, tags, rights decisions, source labels, rankings, or UI sections are final.

Future requests may add, among other things:

- "where was this information found?";
- source/provider type;
- source quality / officialness;
- commercial-use rights;
- public-display rights;
- redistribution/excerpt/media rights;
- rights review date/version;
- business-model tags;
- industry/sub-industry;
- B2B/B2C;
- pricing/revenue model;
- acquisition/distribution model;
- market/risk/opportunity/change signals;
- competition intensity;
- pricing power;
- switching cost;
- AI exposure;
- automation potential;
- source confidence;
- evidence density;
- freshness/staleness;
- new relationship types;
- later human/AI review notes;
- new product filters/sorts/rankings;
- new consumer-specific presentation metadata.

These are **not reasons to rewrite or recollect everything by default**.

Use the Universal Foundation master decision:

### A. Existing canonical evidence is enough
Derive a versioned annotation/facet/classification, backfill old records, rebuild views/indexes, then expose the public-safe portion.

### B. New external evidence is required
Perform additional collection through the normal Source/Evidence/Observation/Claim path first, then derive the new annotation/right/classification.

Do not hide new external facts inside Make-Money-only tags.

## 20. Make-Money responsibilities when a new later-added axis is requested

### If it is reusable across products
The definition belongs in Universal Foundation.

Examples:
- rights;
- source quality;
- business model taxonomy;
- general opportunity/risk/change signal;
- reusable relationship type;
- provenance/source classification.

Make-Money should consume the registered/versioned result.

### If it is purely product presentation
It may remain in Make-Money.

Examples:
- Japanese display label;
- UI grouping;
- table sort preference;
- visual emphasis;
- product-only explanatory copy.

It must still be derivable from public-safe inputs and must not become factual authority.

## 21. Product-side GitHub update map

When a cross-project enrichment becomes visible in Make-Money, update only the layers that actually need it.

| Change | Make-Money files/areas to review |
| --- | --- |
| New public-safe annotation/facet | public DTO allowlist, adapter, search/filter/index code, UI tests |
| New rights field | pinned rights snapshot, publication projection, API allowlist, rights UI/tests |
| New source/provenance display | public source DTO, adapter/UI, link/attribution tests |
| New canonical fact type | public projection contract, business-reader/adapter, UI rendering |
| New Observation public contract | `data/foundation-public-observation-contracts.json`, projection tests, UI component |
| New tag/filter | serving view/index/search path + UI, never canonical rewrite |
| New ranking | versioned methodology/input projection + UI label; never store ranking as raw fact |
| Correction/supersession | current-view rebuild behavior + history display if exposed |
| New product-only label | UI/projection only |
| New source/provider rights | refresh pinned Foundation rights/source snapshot, run release checker, rerun rights tests |
| New external evidence for old item | no product shortcut; wait for normal Foundation Source/Evidence append, then rebuild |

## 22. What must never happen when adding a new field

Do not:

- add a new field directly to old canonical JSON merely because the UI wants it;
- mutate old evidence URLs or timestamps;
- erase unknown/conflict history;
- convert "unknown" to false/zero;
- treat AI inference as source evidence;
- treat a public URL as publication permission;
- expose internal rights policy IDs just to explain why something is public;
- copy source prose into UI when only public-fact display is authorized;
- make a Make-Money tag the only record of an important business fact;
- change scheduled collection prompts just because a new UI filter was added;
- require recollection when an old canonical record already contains enough evidence;
- skip new evidence collection when the old canonical record does **not** contain enough evidence.

## 23. Complete future-agent decision sequence

When the user says "collect this too", "add this tag", "add rights later", "show where this came from", or equivalent:

1. read the Universal Foundation lifecycle master;
2. decide whether this is **new evidence** or **new interpretation/metadata**;
3. identify the authoritative target IDs;
4. check whether existing Source/Evidence/canonical data is sufficient;
5. if sufficient, define/version the annotation/facet/rule and backfill;
6. if insufficient, collect new external evidence through normal Foundation lanes;
7. keep the old canonical/history unchanged;
8. attach producer/method/version/input/provenance;
9. run rights/publication evaluation;
10. rebuild Make-Money public serving views;
11. expose only public-safe DTO fields;
12. test API + UI + failure/held case;
13. update both master handoffs if lifecycle/acceptance changed;
14. record exact branch SHA/test evidence before stopping.

## 24. Single-source-of-truth summary for another AI

A new AI should understand the whole system as:

```text
COLLECT BROADLY
    |
    v
Source + Evidence + provenance + time + uncertainty + rights hints
    |
    v
immutable / append-only canonical private knowledge
    |
    +--> later new external evidence ----------+
    |                                          |
    +--> versioned annotation/enrichment <-----+
             |
             +--> tags / facets / classifications
             +--> source/where-found metadata
             +--> rights reviews
             +--> risk/opportunity/change
             +--> relationships
             +--> human/model review
             +--> future unknown axes
                       |
                       v
             rights + quality publication gate
                       |
                       v
             rebuildable Make-Money view
                       |
                       v
                    API / UI
```

The invariant is:

**Preserve what was actually learned; keep where/how/when it was learned; add new interpretations beside it; recollect only missing evidence; never let today's UI become tomorrow's collection schema.**


## 25. Make-Money collection-document map and governance

A future AI should not rediscover which product documents matter.

| File | Use |
| --- | --- |
| `AGENTS.md` | product-local implementation guardrails |
| `docs/COLLECTION_TO_UI_MASTER_HANDOFF.md` | first product-side entrypoint for collection/provenance/enrichment/rights/Publisher/R2/API/UI |
| `HANDOFF.md` | recovery/current-task routing |
| `docs/COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md` | detailed rights/public publication behavior |
| `docs/FOUNDATION_UI_READ_PATH.md` | detailed Foundation serving/read path |
| `data/foundation-public-rights-snapshot.json` | pinned runtime rights snapshot |
| `data/foundation-public-fact-types.json` | public Fact type registry |
| `data/foundation-public-observation-contracts.json` | public Observation DTO registry |
| `docs/DATA_COLLECTION_MASTER_GUIDE.md` | **legacy** product-shaped history/incident guide only |
| `docs/GOLDEN_INGEST_SCHEMA.md` | historical/product dossier reference only where still useful; not Universal Foundation canonical shape |

Rules:

1. Do not create another competing "highest collection spec" inside Make-Money.
2. Reusable semantics go upstream to Universal Foundation.
3. Product-only projection/UI behavior stays here.
4. If a new collection-related Make-Money document is created, link it from this section in the same change.
5. If a legacy document conflicts with the current master, mark the legacy document at its top rather than relying on agents to infer precedence.
6. If public DTO semantics change, update the allowlist/registry, tests, this handoff, and the upstream lifecycle master when the cross-project contract changes.
7. If only UI wording/layout changes, do not mutate Foundation schemas or recollect data.
8. If a new axis becomes useful across multiple consumers, migrate its definition upstream instead of duplicating product-local taxonomies.

## 26. Minimal handoff to another Make-Money AI

> Read `AGENTS.md`, `docs/COLLECTION_TO_UI_MASTER_HANDOFF.md`, and the Universal Foundation `docs/COLLECTION_KNOWLEDGE_LIFECYCLE_MASTER_HANDOFF.md`. Collection stays broad. Source/Evidence/provenance/canonical history stay intact. Later tags, rights reviews, source attributes and analyses are versioned enrichment/backfill when possible; missing external evidence uses the normal Foundation collection path. Make-Money only publishes rights-cleared public-safe projections. Do not revive legacy giant-JSON/incoming-file workflows or use the current UI as the collection schema.
