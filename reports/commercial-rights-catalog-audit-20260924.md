# Existing Catalog Commercial-Rights Lineage Audit — 2026-09-24

Status: preliminary lineage audit complete; per-dossier R2 Evidence audit still required.

## Scope

Compared:
- `data/catalog-release.json`
- `data/collected-registry.json`

This is a reproducible registry/release audit, not a final copyright/licence verdict.

## Results

- release sourceCount: **3,341**
- publishedCount: **3,085**
- published IDs matched to registry: **3,085 / 3,085**
- eBizFacts lineage ID prefix (`ent_ebizfacts_`): **761**
- `Primary_MUBS_1000`: **745**, and **745/745** use the eBizFacts lineage prefix
- batches whose name contains `IndieHackers`: **1,150**
- explicit `eBizFacts_Playbooks_1000`: **16**

Largest batches:
- IndieHackers_Verified_1000: 991
- Primary_MUBS_1000: 745
- batch-01-core-foundation134: 123
- multiple later analyst/recent-winner/solo batches: roughly 80–100 each
- additional IndieHackers new batches: 47 / 41 / 36 / 35

## External terms finding

Indie Hackers current official terms:
https://www.indiehackers.com/terms

The reviewed terms restrict use to internal/personal/non-commercial use and prohibit crawling/scraping significant service content.

eBizFacts current official terms:
https://ebizfacts.com/about/terms/

The reviewed terms grant only personal/non-commercial transitory viewing and prohibit commercial use/public display of site materials.

## Meaning

The **1,150 IndieHackers-batch** and **761 eBizFacts-lineage** counts are high-priority review populations. They are not automatically removed because lineage does not prove the current public dossier still relies on that source: a dossier may have later been independently re-sourced.

Final rule:

> A released dossier stays public only when every displayed factual record can be traced to current Evidence that passes a registered commercial/public-fact policy. Lineage alone never grants or revokes publication.

## Required next audit

For all 3,085 current release dossiers, inspect the current evidence graph in Foundation R2 and produce:

- SAFE: displayed facts have permitted public-fact Evidence;
- NEEDS_RIGHTS_REVIEW: policy absent/conditional;
- INTERNAL_ONLY: useful internally but commercial public fact display not permitted;
- BLOCK: public projection must be removed.

The audit must record entity ID, displayed record ID, Evidence ID, source ID/URL, policy ID, policy review date, decision and reason. Do not delete canonical research; remove/rebuild only the public projection.

## Reproduce the preliminary audit

```bash
node scripts/audit-commercial-rights-lineage.mjs
```
