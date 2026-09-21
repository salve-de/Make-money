# Catalog coverage audit — 2026-09-21

## Scope and preservation boundary

This audit covers the existing local catalog, `/api/catalog`, the bounded Foundation search path, and the ledger UI. It does not collect new data, change the source catalog, write R2, change publication/rights gates, or touch the collection helper/parser/worker.

The protected source is `data/entities-index.json`. Its SHA-256 remains:

`5b9ecc23f47150534032b4bc1d8a6651938c0d2a978e55b871c36597b1c1ebd4`

Run the reproducible local classification with:

```bash
pnpm catalog:audit
```

## Exclusive source classification

| category | count | meaning |
| --- | ---: | --- |
| `public_catalog` | 3,085 | Valid source records present in the current catalog release/API manifest |
| `publication_gate` | 3 | Valid records not released because the source publication state is `PARTIAL` (1) or missing (2) |
| `evidence_gate` | 253 | Valid records withheld because the existing evidence locator gate is not satisfied |
| `duplicate_id` | 0 | No duplicate source IDs |
| `invalid_record` | 0 | No source record failed the resilient schema parser |
| `release_manifest_mismatch` | 0 | No release detail missing from, or extra to, the source IDs |
| `unknown_not_published` | 0 | No unclassified source record |

The source contains 3,341 valid records, 3,085 released details, no duplicate names, and no source alias records. The 256 withheld records remain withheld with their gate reason; this audit does not make private, rights-protected, or auth-protected records public.

The separate Foundation/R2 path is not added to these counts. Its materialized-view LIST-only observation was 986 objects; that is a storage observation, not a new catalog total and not an addition to the prior 702-record lane.

## API and UI evidence

Evidence was collected against the candidate dev server on `localhost:3011` with GET-only requests:

- `/api/catalog`: 31 pages reached, 3,085 rows returned, `total=3085`, 3,085 unique IDs, final offset `3000`.
- Late catalog ID search `ent_byedispute_c094ec`: HTTP 200, one matching row, `total=1`.
- Foundation bounded search reads at most the requested response limit from the existing materialized-view prefix per cursor page. It does not scan every research bundle on each search. The cursor is advanced only after that bounded object page, so matches are not discarded by a later `slice()`.
- For q39, the exact real-name query first returned `count=0` with `hasMore=true`; subsequent cursor pages returned HTTP 200 and reached `ent_company_0abb9196ea4d33196d0f` with the read-time name `ECA Texas multifamily portfolio / Elowen Capital`.
- The candidate UI reproduced the same boundary: the initial zero-row Foundation state retained `R2から追加取得中...`, then the continued page displayed the real q39 name. Changing the query while a prior page was pending removed the old rows; the latest query remained authoritative.
- The zero-row/`hasMore` grid continuation contract is covered by `InstitutionalDataGrid.test.ts`; the sentinel remains present and the observer may request the next cursor even when `entityCount=0`.

## Consumer numeric regression

The existing adapter now applies an explicit magnitude unit only when the source value is numeric (or a unit-less numeric string), preserving authored labels. A supported annual metric `{ amount: 49.6, currency: "USD", unit: "million" }` projects to `620,000,000` JPY/month using the existing 150 JPY/USD estimate and displays the source as `$49.6 million`. A supported `funding` money signal with the same amount remains visible in the observation stream but keeps `monthlyRevenue=0` and `isRevenueUnconfirmed=true`; funding is not treated as sales.

## Verification

- Focused Vitest: 104 tests passed, including bounded cursor pagination, legacy read-time name resolution, zero-match continuation, numeric-unit conversion, funding/revenue separation, and the approved scheduled-handoff regression.
- `pnpm typecheck`: passed, including schema contract check.
- Targeted ESLint: passed.
- `pnpm catalog:audit`: passed with the classification above.
- `git diff --check`: passed.
- Approved storage-side commit `8f2d7e0` is included in the candidate; no writer deployment was performed.

## Remaining evidence boundary

The Foundation API intentionally reports `total=null` for bounded search. An exact exhaustive Foundation search total, and completion of the slow legacy non-search read-through over every materialized row, are not claimed; no new global index or full-bundle scan was introduced. The existing duplicate React key warning for `financial-source-ent_photoai`/Next dev issue badge was observed and left outside this catalog/API/UI acceptance scope.

The evidence server was the candidate on port 3011. Root/main and its retained dev session were not changed; main promotion remains a separate parent-review step.
