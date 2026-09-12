> **2026-09-10 現行契約**: [HANDOFF](../HANDOFF.md)、[既存データからUIへの実行・編集契約](EXISTING_DATA_TO_UI.md)、[Foundation統合契約](https://github.com/salve-de/universal-foundation/blob/main/docs/BUSINESS_RESEARCH_AND_R2_CONTRACT.md)を先に読む。既存情報の結合・再抽出を先に行い、読者価値を増やす不足を追加調査する。全項目の完全性検査はDEEP_RECONCILEDを主張するときに適用し、有益な部分事例を排除しない。保存成功と公開品質は別。以下の旧説明より本契約を優先する。

# 新規収集・R2保存の入口

## 0. 収集対象の完全目録（必読）

項目の取りこぼしを防ぐため、まず [`MAKE_MONEY_COLLECTION_SCOPE.md`](./MAKE_MONEY_COLLECTION_SCOPE.md) を読む。そこに9情報源レーン、12領域、4つの表に出にくい領域、5つの暗部パラメータ、3つの盲点、時間軸、財務・手残り推計、未知値の状態、Journal/R2配置、完了報告の必須項目を全て列挙している。この入口文書は保存手順、完全目録は調査内容を定義する。

Universal側の同名正本は [`universal-foundation/docs/MAKE_MONEY_COLLECTION_SCOPE.md`](https://github.com/salve-de/universal-foundation/blob/main/docs/MAKE_MONEY_COLLECTION_SCOPE.md)。内容が違えばUniversal Foundation mainを上位正本として修正し、差分を残さない。

## DEEP_RECONCILEDを主張する場合の検査

DEEP_RECONCILEDを主張する場合にUniversalの `docs/COLLECTION_RECONCILIATION.md` と `registry/collection/business-case.v1.json` を読む。宣言した調査範囲の資料・関連期間・抽出値を照合し、画面に出さない有用情報も保持する。CAPTURE/CORE/ENRICHEDの保存や有益な部分事例の表示に、全91細目の充足を要求しない。

実装ブランチで `foundation-collect.ts requirements` → 調査・資料別抽出台帳作成 → `audit` → `ingest-complete` を実行する。未読資料・未保存値・値の不一致・古いコードhashが残れば完了にしない。部分保存は通常ingestで許可する。旧ALL_DIMENSIONS_ATTEMPTEDやR2保存成功は全収集の証明ではない。

この入口はmainに置く。検証済みの収集実装は `codex/collection-handoff-20260908`（初回実証コミット `9a23717`）にある。無関係なアプリ改修をmainへ混ぜないため分離している。

1. 認証付きで `salve-de/universal-foundation` のmainを読む。AGENTS、UNIVERSAL_COLLECTION_BASELINE、AI_COLLECTION_AND_STORAGE_CONTRACT、MAKE_MONEY_AGENT_RUNBOOK、MAKE_MONEY_RESEARCH_REQUIREMENTSが正本。
2. このリポジトリの `codex/collection-handoff-20260908` を別の作業場所へ取得し、同ブランチの `docs/COLLECT_AND_STORE.md` を読む。既存の作業場所を強制切替・破棄しない。
3. AI自身が検索して新規データを集める。Universal共通要件とMAKEMONEY要件の和集合を対象とし、利益・費用・個人手残りを売上で代用しない。出典なしはUNVERIFIEDとして保持し、追加観測も捨てない。
4. 同ブランチのCLIで正本schemaと宣言した収集段階・調査状態を検証し、許可されたR2新規保存を行う。未調査・未知・非該当を区別し、実際のCAPTURE/CORE/ENRICHED/DEEP_RECONCILED段階を報告する。

## 1. 収集段階と調査範囲

収集対象は画面に現在表示される項目だけではない。12領域、9情報源レーン、4つの表に出にくい領域、5つの暗部パラメータ、3つの盲点、過去時点、失敗・閉鎖・ピボット、出典未回収の手掛かり、既存項目外の観測を調べる。見つからなかったものも `attempted_unavailable`、まだ見ていないものも `not_attempted` として保存する。

91項目という数は保存構造でも上限でもない。

- **CAPTURE**: 面白い候補を見つけたら、深掘り前でも保存可能。
- **CORE**: identity / people / product / customer-demand / pricing / money-economics / distribution / operations / technology / competition-market / timeline-outcomes / provenance-rights-uncertainty の12領域を広く確認する。
- **ENRICHED**: 価値の高い候補やMake-Money表示に必要な内容を追加調査する。
- **DEEP_RECONCILED**: 本当に「深く調べ切った」と主張するときだけ、詳細checklistとsource reconciliationを完遂する。

資料内で発見した有用情報は、現在のUIや91項目に無くても捨てない。未知の概念はUniversal Journalへ入り、後から型を作る。保存段階を実際より高く報告しない。

検索/ブラウザ、Node/npm、非公開UniversalへのGitHub認証、R2認証が必要。このMacは既存Keychainラッパーを利用できる。別環境には安全に許可済み認証を渡す必要があり、GitHub閲覧だけではR2書込権限は付かない。

既存R2、EDINET、既存shadowの整理・上書き・移動・削除は禁止。新規保存だけを行う。

実証記録（Bufferの2024年開示から新規6件を保存、全6件SHA/bytes一致、再実行は新規0・同一6）は、保存経路の実証であり、Bufferの全項目調査完了ではない。証拠は実装ブランチの `data/collection/buffer-2024.saved.json` と `buffer-2024.repeat.json` で確認する。

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

利益・費用・手残りを売上で代用しない。出典なしはUNVERIFIEDとして保持し、推定・推論はorigin/status/evidenceを分けて明示する。UIの表示用projectionをFoundationの事実として保存しない。

## 3. 調査bundleの準備・既存取り込み

```sh
gh repo clone salve-de/universal-foundation /private/tmp/foundation-contract
export FOUNDATION_REPO=/private/tmp/foundation-contract
pnpm install --frozen-lockfile
```

AI自身が検索・閲覧して `request.json` を作る。過去のBuffer fixtureを別企業の数値として流用しない。

既存Foundation取り込みの準備・保存:

```sh
node --import tsx scripts/foundation-collect.ts prepare request.json plan.json
pnpm r2:with-secrets -- node --import tsx scripts/foundation-collect.ts ingest request.json receipt.json
```

深い完了判定が必要な場合:

```sh
node --import tsx scripts/foundation-collect.ts requirements
node --import tsx scripts/foundation-collect.ts audit request.json audit-result.json
pnpm r2:with-secrets -- node --import tsx scripts/foundation-collect.ts ingest-complete request.json receipt.json
```

`prepare`はR2を書かない。`ingest`は部分保存も許す。`ingest-complete`は深いreconciliation用であり、実行した検査範囲を報告する。

## 4. Universal Journalのmaterialize

同じ`request.json`から、typed recordと自由観測をjournal-entry.v1へ変換する。

書込前確認:

```sh
pnpm foundation:journal:prepare -- request.json journal-plan.json
```

R2書込:

```sh
pnpm r2:with-secrets -- pnpm foundation:journal:ingest -- request.json journal-receipt.json
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
pnpm foundation:r2-descriptors:prepare -- descriptors-plan.json
```

実際にR2へmaterializeする場合は、明示的なdescriptor書込承認も必要:

```sh
export FOUNDATION_DESCRIPTOR_WRITE_AUTHORIZED=true
pnpm r2:with-secrets -- pnpm foundation:r2-descriptors:ingest -- descriptors-receipt.json
```

これにより、R2だけを見た将来のAIでも各bucket/prefixの目的、canonicality、schema、dataset ID、rebuild可否、write/delete policy、rights/security、consumer、GitHub正本を理解できる。

説明ファイルも上書きしない。変更はv2等を新規追加する。

## 6. 収集漏れ検査

DEEP_RECONCILEDを主張するときだけ、詳細checklistとsource inventoryを必須にする。

- 資料の見出し・表・全関連期間を棚卸しする。
- 発見したのに未保存の情報はpendingとして残す。
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

## 2026-09-09: 100件規模の並行収集ルール

事例を100件程度まで並行収集してよい。InvestraderのR2-first / Neon撤去作業とは独立したworkstreamとして扱い、収集のために新しいDB・新しいR2レイアウト・新しいMake-Money専用真実スキーマを作らない。

並行収集するAI/agentは次を守る。

1. `salve-de/universal-foundation` のmainを最上位正本とし、`research-bundle.v1`、stable ID、Universal Journal/typed projections、evidence/rights/uncertainty規則を使う。
2. 実際の保存は検証済みの `codex/collection-handoff-20260908` の収集実装を使う。自由記述の調査結果から直接R2や画面用JSONへ書かない。
3. Universal共通要件 + Make-Money研究要件の和集合を調査する。画面に今出さない事実も捨てない。Hook、4 STAGES、Money Machine、Moat、Opportunity等はFoundationの事実ではなくderived outputとして保持する。
4. 可能ならagentごとに候補リストとrun IDを分ける。同一主体を再取得してもstable ID/create-only/dedupeで安全に扱える設計を維持するが、無駄な重複調査は避ける。
5. 新規R2保存はcreate-only。既存 `universal`、EDINET、Investrader shadow、既存Foundation objectを移動・上書き・削除しない。
6. 出典がない有用な候補は捨てず `UNVERIFIED` として保持する。ただし未確認の数字をverified、ランキング根拠、成功保証に昇格しない。
7. 各runはschema/ingest/readback/hash/dedupe結果を残す。DEEP_RECONCILEDを主張する場合のみaudit/ingest-completeも完遂する。件数だけでは公開品質や深掘り完了としない。
8. R2認証がない実行環境では、validated research bundleとplanned write manifestまで作って停止する。legacy `universal` へ代替保存しない。
9. Journalは後回しにしない。収集と同じrunの`journal-entry.v1`を計画し、許可された既存経路で保存し、Journal件数・schema検証・readbackを完了報告に含める。descriptorの更新も、データ本体とは別の明示的な新規create-only書込みとして扱う。

この収集workstreamはNeon、D1、R2 SQLを必要としない。R2 serving/indexの最適化やInvestraderのDB撤去は別作業として進める。
