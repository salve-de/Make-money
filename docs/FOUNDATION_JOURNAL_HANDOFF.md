# FOUNDATION JOURNAL HANDOFF

If you are an AI with no prior chat context, use this file as the Make-Money runtime handoff for the long-horizon Foundation data design.

## Authority

The semantic authority is `salve-de/universal-foundation`. Read its `AGENTS.md` first. This repository is only an implementation/consumer.

## Goal

New business/company/solo-developer research must be preserved so it can be reused by future products without being limited by Make-Money's current UI or a fixed checklist count.

The durable flow is:

```text
raw evidence / source-less lead
 -> research-bundle.v1 (Foundation Lake: Bronze/Silver)
 -> Universal Journal (journal-entry.v1)
 -> typed projections (Entity, Claim, Metric, Event)
 -> Missing Fact Auto-Harvest (Autonomous secondary web search loop for missing year, P&L, traction)
 -> Keyence-quality Gold Refinery
 -> versioned serving view (datasets/ds.business.makemoney-dossiers.v1)
 -> Make-Money Bloomberg terminal view (direct 0.01s render)
```

## Commands

Assume:

```sh
export FOUNDATION_REPO=/path/to/authenticated/universal-foundation
```

Prepare existing typed/core write plan:

```sh
node --import tsx scripts/foundation-collect.ts prepare request.json core-plan.json
```

Prepare Journal write plan:

```sh
npm run foundation:journal:prepare -- request.json journal-plan.json
```

Prepare R2 self-description objects:

```sh
npm run foundation:r2-descriptors:prepare -- descriptor-plan.json
```

Authorized data ingestion uses the existing `r2:with-secrets` wrapper and requires `write_authorized:true` in the request. Descriptor materialization additionally requires `FOUNDATION_DESCRIPTOR_WRITE_AUTHORIZED=true`.

## Do not guess

- Missing R2 prefix descriptors => treat the prefix as legacy/unclassified and do not mutate it.
- Missing source => retain as UNVERIFIED; do not fabricate provenance.
- Unknown schema => keep the observation in Journal rather than discarding it or forcing a wrong type.
- Derived Make-Money fields such as moat/opportunity/buyer psychology are not source facts.
- Existing `universal`, EDINET and Investrader data are deferred legacy migration scope; do not touch them in new-data collection.

## 91-item rule

The old detailed business checklist is useful for DEEP research only. It is not the Foundation schema and not the maximum set of information that may be stored. Use `registry/collection/business-case.v2.json` for the tiered policy and preserve additional findings in Journal.
