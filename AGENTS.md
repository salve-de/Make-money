# Make-Money agent instructions

This repository is a **consumer/product view** of the shared Universal Foundation. It is not the canonical owner of reusable research evidence or business facts.

## Target technology decision

The project-level target architecture was explicitly decided by the user on 2026-09-06.

- App: **Next.js + TypeScript**
- Production web runtime/hosting: **Cloudflare Workers**
- Next.js-on-Workers tooling: use the current Cloudflare-supported/recommended path at implementation time
- Relational DB: **Neon PostgreSQL**
- ORM/schema: **Drizzle ORM**
- Authentication: **Firebase Auth**
- Payments: **Stripe**
- Object/file storage: **Cloudflare R2** when needed
- Heavy/long-running workloads: **Google Cloud Run / Cloud Run Jobs** when Workers is not the correct runtime
- Source/CI: **GitHub / GitHub Actions**

Do **not** introduce new Supabase production dependencies. Existing `supabase/` assets are historical reference material until the useful schema concepts are migrated to Neon/Drizzle.

Do not silently change the production web host to Vercel, Cloudflare Pages, or another provider. Cloudflare Pages and Tunnel are not the normal production path for this app. If a concrete compatibility blocker is found, document the exact blocker and fix/route the affected workload appropriately; do not unilaterally reverse the user's stack decision.

Current `main` is still the older Vanilla JavaScript implementation. Do not confuse observed current code with the decided target architecture.

Cross-project technology/contract context is recorded in `salve-de/the-architects-handbook`, especially `projects/tech-stack/Make-money.md`.

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
9. `salve-de/universal-foundation/schemas/foundation/planned-writes.v1.schema.json`
10. `salve-de/universal-foundation/docs/R2_NEW_DATA_WRITE_RUNBOOK.md` only when the active task explicitly authorizes R2 writes

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

Every research run must first produce:

- a schema-valid `research-bundle.v1`;
- a schema-valid `planned-writes.v1` manifest.

Normal authorized ingestion is create-only/no-overwrite and must follow the Foundation R2 write runbook. Do not Copy/Delete/Move/Rename/Overwrite, create buckets, change lifecycle/env/config/policies, or mutate legacy `universal` unless a separate explicit task authorizes the exact action.

Unknown data/rights are valid stop conditions. Never fabricate missing revenue, founder, customer, pricing, team, distribution, workload, margin, or technology facts.
