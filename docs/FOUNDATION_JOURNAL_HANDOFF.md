> **2026-09-10 現行契約**: [HANDOFF](../HANDOFF.md)、[既存データからUIへの実行・編集契約](EXISTING_DATA_TO_UI.md)、[Foundation統合契約](https://github.com/salve-de/universal-foundation/blob/main/docs/BUSINESS_RESEARCH_AND_R2_CONTRACT.md)を先に読む。既存情報の結合・再抽出を先に行い、読者価値を増やす不足を追加調査する。全項目の完全性検査はDEEP_RECONCILEDを主張するときに適用し、有益な部分事例を排除しない。保存成功と公開品質は別。以下の旧説明より本契約を優先する。

# FOUNDATION JOURNAL HANDOFF

If you are an AI with no prior chat context, use this file as the Make-Money runtime handoff for the long-horizon Foundation data design.

## Authority

The semantic authority is `salve-de/universal-foundation`. Read its `AGENTS.md` first. This repository is only an implementation/consumer.

## Goal

New business/company/solo-developer research must be preserved so it can be reused by future products without being limited by Make-Money's current UI or a fixed checklist count.

The durable flow is:

```text
raw evidence / source-less lead
 -> research-bundle.v1
 -> Universal Journal
 -> typed projections
 -> derived intelligence
 -> Make-Money view
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
