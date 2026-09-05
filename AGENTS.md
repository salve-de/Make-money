# Make-Money agent instructions

This repository is a **consumer/product view** of the shared Universal Foundation. It is not the canonical owner of reusable research evidence or business facts.

## Before any research or R2/data work

Read the cross-project source of truth in this exact order:

1. `salve-de/universal-foundation/AGENTS.md`
2. `salve-de/universal-foundation/docs/AI_COLLECTION_AND_STORAGE_CONTRACT.md`
3. `salve-de/universal-foundation/docs/MAKE_MONEY_AGENT_RUNBOOK.md`
4. `salve-de/universal-foundation/docs/MAKE_MONEY_RESEARCH_REQUIREMENTS.md`
5. `salve-de/universal-foundation/docs/PROVENANCE_AND_QUALITY.md`
6. `salve-de/universal-foundation/registry/datasets/business-intelligence.v1.json`
7. `salve-de/universal-foundation/registry/products/make-money.v1.json`
8. `salve-de/universal-foundation/schemas/foundation/research-bundle.v1.schema.json`

Do not reconstruct these rules from chat history and do not invent a Make-Money-specific R2 layout.

## Data ownership boundary

New reusable research should flow through the Foundation:

```text
source evidence -> foundation-raw / foundation-restricted as allowed
normalized facts -> foundation-lake
Make-Money narrative/view -> generated from Foundation datasets
```

Do not place new reusable business research into legacy `universal` by default.

Do not use GitHub as the object/data warehouse.

## Default safety

Unless the active task explicitly authorizes writes, R2 work is read-only/local-preparation only.

Normal authorized ingestion is create-only/no-overwrite. Do not Copy/Delete/Move/Rename/Overwrite, create buckets, change lifecycle/env/config/policies, or mutate legacy `universal` unless a separate explicit task authorizes the exact action.

Unknown data/rights are valid stop conditions. Never fabricate missing revenue, founder, customer, pricing, team, distribution, workload, margin, or technology facts.
