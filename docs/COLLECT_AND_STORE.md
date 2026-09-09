# 「MAKEMONEYに必要なデータを集めてこい」の実行入口

## 0. 正本

最初に認証付きで `salve-de/universal-foundation` を取得し、次を順番に読む。

1. `AGENTS.md`
2. `docs/LONG_HORIZON_DATA_ARCHITECTURE.md`
3. `docs/UNIVERSAL_COLLECTION_BASELINE.md`
4. `docs/R2_SELF_DESCRIBING_LAYOUT.md`
5. `registry/collection/business-case.v2.json`
6. `docs/AI_COLLECTION_AND_STORAGE_CONTRACT.md`
7. `docs/MAKE_MONEY_AGENT_RUNBOOK.md`
8. `docs/MAKE_MONEY_RESEARCH_REQUIREMENTS.md`
9. 深い完全性を主張する場合のみ `registry/collection/business-case.v1.json` と `docs/COLLECTION_RECONCILIATION.md`

Make-Moneyはconsumer。R2 pathやMake-Money UI schemaをUniversalの意味にしない。

### 0.1 どのAIでも同じ範囲を読むためのhandoff不変条件

この入口に来たAIは、一次情報だけ、現在の画面項目だけ、または過去の91項目だけに調査範囲を狭めない。一次・公式を優先しつつ、創業者インタビュー／build-in-public、公開アーカイブ、信頼できる二次報道、マーケットプレイス／ディレクトリ／アプリストア／Product Hunt／比較・レビュー、顧客・コミュニティ・フォーラム・Issueの公開記録、公開トラフィック／検索／技術／求人／連携／紹介シグナル、失敗・終了・買収・ピボット記録、source-less leadまで、該当する全レーンを確認する。

対象はUniversalの `business-case.v2` にある12領域（identity / people / product / customer_and_demand / pricing / money_and_economics / distribution / operations / technology / competition_and_market / timeline_and_outcomes / provenance_rights_and_uncertainty）と、4大禁忌、5大暗黒パラメータ、3大死角、さらに事例の勝因・金の流れ・運営実態を理解するうえで有用な範囲外の観測である。各領域・情報源レーンは、見つかったかだけでなく `found` / `attempted_unavailable` / `not_attempted` / `not_applicable` / `unknown` を残す。一次でない情報も捨てず、既存のsource/truth/evidenceフィールドと `observations` / Journalで強さと不確実性を分ける。

大量バッチはCAPTURE/CORE/ENRICHEDの段階で保存してよいが、DEEP_RECONCILEDとは呼ばない。発見できなかった項目を捏造せず、推定は式・前提付きで `estimated`、未確認は `UNVERIFIED` / `unknown` として保持する。

## 1. 収集方針

91項目という数は保存構造でも上限でもない。

- **CAPTURE**: 面白い候補を見つけたら、深掘り前でも保存可能。
- **CORE**: identity / people / product / customer-demand / pricing / money-economics / distribution / operations / technology / competition-market / timeline-outcomes / provenance-rights-uncertainty の12領域を広く確認。
- **ENRICHED**: 価値の高い候補やMake-Money表示に必要な内容を追加調査。
- **DEEP_RECONCILED**: 本当に「深く調べ切った」と主張するときだけ旧詳細チェックリストとsource reconciliationを完遂。

資料内で発見した有用情報は、現在のUIや91項目に無くても捨てない。未知の概念はUniversal Journalへ入り、後から型を作る。

## 2. 事実・Journal・Projection

収集結果は次の順で扱う。

```text
Source / lead
  -> raw evidence（権利が許す場合）
  -> research-bundle.v1
  -> Universal Journal (journal-entry.v1)
  -> Entity / Claim / Metric / MoneySignal / Event / Relationship
  -> derived intelligence
  -> Make-Money view
```

利益・費用・手残りを売上で代用しない。出典なしはUNVERIFIEDとして保持。推定・推論は明示する。

## 3. 調査bundleの準備・既存取り込み

```sh
gh repo clone salve-de/universal-foundation /private/tmp/foundation-contract
export FOUNDATION_REPO=/private/tmp/foundation-contract
npm ci
```

AI自身が検索・閲覧して `request.json` を作る。過去のBuffer fixtureを別企業の数値として流用しない。

既存Foundation取り込みの準備・保存:

```sh
node --import tsx scripts/foundation-collect.ts prepare request.json plan.json
npm run r2:with-secrets -- node --import tsx scripts/foundation-collect.ts ingest request.json receipt.json
```

深い完了判定が必要な場合:

```sh
node --import tsx scripts/foundation-collect.ts requirements
node --import tsx scripts/foundation-collect.ts audit request.json audit-result.json
npm run r2:with-secrets -- node --import tsx scripts/foundation-collect.ts ingest-complete request.json receipt.json
```

`prepare`はR2を書かない。`ingest`は部分保存も許す。`ingest-complete`は深いreconciliation用。

## 4. Universal Journalのmaterialize

同じ`request.json`から、typed recordと自由観測をjournal-entry.v1へ変換する。

書込前確認:

```sh
npm run foundation:journal:prepare -- request.json journal-plan.json
```

R2書込:

```sh
npm run r2:with-secrets -- npm run foundation:journal:ingest -- request.json journal-receipt.json
```

Journal writerは:

- Entity / Claim / Metric / MoneySignal / Event / Relationship / observationsをJournal entryへ変換する;
- `schemas/foundation/journal-entry.v1.schema.json`で検証する;
- `foundation-lake/journal/v1/YYYY/MM/DD/<journal_id>.json`へcreate-onlyで保存する;
- 既存同一内容は重複として扱う;
- 同じkeyで別内容なら停止し、上書きしない;
- 書込後にR2 readback/hash確認を行う。

JournalはDerivedを事実として取り込まない。

## 5. R2自身を自己説明可能にする

Universalの`r2-descriptors/`には、各主要R2 prefixに置く`_README.v1.md`と`_manifest.v1.json`の正本テンプレートがある。

まずplanだけ作る:

```sh
npm run foundation:r2-descriptors:prepare -- descriptors-plan.json
```

実際にR2へmaterializeする場合は、明示的なdescriptor書込承認も必要:

```sh
export FOUNDATION_DESCRIPTOR_WRITE_AUTHORIZED=true
npm run r2:with-secrets -- npm run foundation:r2-descriptors:ingest -- descriptors-receipt.json
```

これにより、R2だけを見た将来のAIでも各bucket/prefixの目的、canonicality、schema、dataset ID、rebuild可否、write/delete policy、rights/security、consumer、GitHub正本を理解できる。

説明ファイルも上書きしない。変更はv2等を新規追加する。

## 6. 収集漏れ検査

DEEP_RECONCILEDを主張するときだけ、詳細checklistとsource inventoryを必須にする。

- 資料の見出し・表・全関連期間を棚卸しする。
- 発見したのに未保存の情報はpending。
- `collection_audit.v1`に資料別抽出台帳、値照合、第二巡レビュー、未読候補を残す。
- productのDerived/表示用フィールドを、外部で必ず見つかるSource Factとして扱わない。

CAPTURE/CORE/ENRICHEDの部分データは、有用ならそのまま保存してよい。ただし完了レベルを偽らない。

## 7. 認証と既存データ境界

このMacではKeychainラッパーを使う。鍵を表示・GitHubへ登録しない。GitHub閲覧権限だけではR2書込権限はない。

**今回の新構造では既存 `universal`、EDINET、Investraderの既存shadow/production dataを整理・移動・上書き・削除しない。**

後日、Universalの`docs/LEGACY_DATA_MIGRATION_CONTRACT.md`に従い、inventory -> map -> copy/rebuild -> verify -> shadow -> cutover -> retainの別作業で移行する。

## 8. 完了報告

最低限報告するもの:

- collection tier;
- source/unknown/conflict状態;
- research bundle validation;
- Journal entry数とvalidation;
- typed record数;
- planned R2 keys;
- created / identical / conflict;
- readback一致数;
- descriptor materialization状態;
- legacy `universal` / EDINET / Investrader mutation = 0;
- delete / move / rename / overwrite = 0。
