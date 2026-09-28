# 2026-09-28 R2 commercial-rights audit

Status: completed, read-only R2 audit. This is a rights-triage report, not a legal opinion and not a factual-content audit.

## Run evidence

- Make-Money source HEAD: `221d0e4e66c649aa0de5c72b9f2c52eeb3f8104e`
- R2 bucket role: `foundation-lake`
- Started: `2026-09-28T13:18:22.652Z`
- Finished: `2026-09-28T13:25:56.640Z`
- Full machine report: `reports/runtime/commercial-rights-r2-audit-20260928.json`
- Full report SHA-256: `dc1740a7c2b78839bd046997eef0b2865ebf18cfdb0e171544c0f721b7f20ff3`
- R2 changes: none. The command listed/read R2 objects and wrote only the local report.

## Results

| Data set | Audited | SAFE | NEEDS_RIGHTS_REVIEW | INTERNAL_ONLY |
|---|---:|---:|---:|---:|
| Foundation materialized views | 1,772 | 4 | 1 | 1,767 |
| Legacy published dossiers | 3,085 | 0 | 1,173 | 1,912 |

Legacy lineage review signals: 761 eBizFacts-ID records, 1,150 IndieHackers-named batches, and 16 eBizFacts-named batches. These are overlapping/source-lineage triage signals, not independent counts to add and not proof that every displayed fact came only from those sources.

## What the labels mean

- `INTERNAL_ONLY`: the dossier contains at least one evidence URL in a source family the current audit treats as restricted. This is a conservative hold signal, not a final legal finding about every fact in that dossier.
- `NEEDS_RIGHTS_REVIEW`: the legacy record cannot prove field-level evidence-to-public-fact rights bindings. The hostname or batch lineage alone is insufficient.
- `SAFE`: in the Foundation path, every displayed record exactly reconstructs from the current rights-cleared projection and the public identity is supported by rights-cleared evidence. The legacy format is deliberately never auto-classified `SAFE`.

Therefore, **zero legacy dossiers are presently proven commercially/publicly safe by this audit**. This does not mean all 3,085 are illegal. It means the current record format and evidence do not prove permission for commercial public display. Do not silently treat `PUBLISHABLE`, a public URL, or prior release as rights approval.

## What is still missing for completion

This report does not record a final, reviewed permission for every source or fact. For each displayed fact, a durable audit must link the claim to its exact evidence and record source/publisher, page and locator, publication/modified/accessed dates, raw-storage permission separately from public commercial fact-display permission, relevant license/terms URL and checked version/as-of date, attribution/quotation/image/scraping/retention limits, reviewer, decision, reason, and evidence/policy hashes. Unknown or restricted items stay held; facts may be re-sourced from permitted sources without copying restricted article text.

The current old-catalog display gate and the content/factual audit are separate remaining work. No catalog was removed, no R2 object was changed, and no API/UI behavior was changed by this audit.
