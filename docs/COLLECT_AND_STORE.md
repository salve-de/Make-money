# 「MAKEMONEYに必要なデータを集めてこい」の実行入口

## 収集対象の完全目録


項目の取りこぼしを防ぐため、まず [`MAKE_MONEY_COLLECTION_SCOPE.md`](./MAKE_MONEY_COLLECTION_SCOPE.md) を読む。そこに9情報源レーン、12領域、4つの表に出にくい領域、5つの暗部パラメータ、3つの盲点、時間軸、財務・手残り推計、未知値の状態、Journal/R2配置、完了報告の必須項目を全て列挙している。この入口文書は保存手順、完全目録は調査内容を定義する。

Universal側の同名正本は [`universal-foundation/docs/MAKE_MONEY_COLLECTION_SCOPE.md`](https://github.com/salve-de/universal-foundation/blob/main/docs/MAKE_MONEY_COLLECTION_SCOPE.md)。内容が違えばUniversal Foundation mainを上位正本として修正し、差分を残さない。

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

`prepare`はR2を書かない。`ingest`は部分保存も許す。`ingest-complete`は深いreconciliation用。

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

## 9. 【完全自動化】万能底引き網収集 ＆ キーエンス品質Gold精錬パイプライン（1,000件一括実行規格）

ユーザーが「MAKEMONEYに必要なデータと普通に集めるやつ集めてきて 1000事例くらい」と一言指示した際、全てのAIが完全に自律連携して実行する標準プロトコル。

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: 底引き網収集（Raw / Bronze）                                   │
│  └ 対象市場の全事例を外部Web・APIから網羅調達                            │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 2: R2事実レイク格納（Silver / Foundation Lake）                    │
│  └ research-bundle.v1 / journal-entry.v1 を Create-Only で不変保存      │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 3: 自律的欠落補完ループ（Missing Fact Auto-Harvest）               │
│  └ 創業年・売上・利益率・初期ゲリラ戦の欠落を検知し外部Webから自律追跡   │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 4: キーエンス品質Gold精錬（Gold / Serving View）                   │
│  └ サバンナOS日本語DNA・実額P&L・4大禁忌・盲点・障壁へと100%精錬         │
│  └ R2 `datasets/ds.business.makemoney-dossiers.v1` へ保存              │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 5: UIダイレクト配信                                               │
│  └ Make-Money Bloomberg端末UIがGold層から0.01秒で直接描画               │
└────────────────────────────────────────────────────────────────────────┘
```

### 9.1 欠落データの自律再急襲（Missing Fact Auto-Harvest）
- **「元データに書いてなかった」による未確認放置・途中停止を厳禁とする。**
- Silverデータ作成時およびGold精錬時に、以下の必須項目が欠落している場合、AIは即座に2次・3次の外部検索を発動する：
  1. **創業年（foundedYear）**: `"<社名>" founded OR "launched in" OR "started in"` で即時特定。
  2. **実額P&L（月商・営業利益率・創業者手残り）**:
     - `"<社名>" revenue OR MRR OR ARR OR "Stripe" OR "pricing"` で創業者インタビューやXポスト魚拓を急襲。
     - 公開数値が非開示の場合：単品プラン価格 × 推定アクティブ顧客規模 × 業界標準原価率（決済手数料2.9%+$0.30、推論API代、インフラ費）から科学的にP&Lウォーターフォールを逆算し、`origin_type: 'estimated'` として創業者個人の手残り現金実額を算出。
  3. **初期ゲリラ戦ログ（客観事実）**:
     - 最初の100人を仕留めたX自虐動画、Reddit自演、ToS隙間ハック、Cold Email等の客観ログを魚拓・フォーラムから特定。

### 9.2 Gold層（Serving View）の保存規律
- **物理配置**: `datasets/ds.business.makemoney-dossiers.v1/entities/<entity_id>.json`
- **保存性質**: Foundationの正本契約に則り、versioned serving view として Create-Only で保存。
- **UIとの結合**: Make-Money UIは、このGoldデータセットを読み込むことで、画面側での場当たり推論（英語ログ混入、架空数値捏造、創業年脱落）を完全ゼロ化する。


## 並行収集の境界（main側の収集規則を統合）


事例を100件程度まで並行収集してよい。InvestraderのR2-first / Neon撤去作業とは独立したworkstreamとして扱い、収集のために新しいDB・新しいR2レイアウト・新しいMake-Money専用真実スキーマを作らない。

並行収集するAI/agentは次を守る。

1. `salve-de/universal-foundation` のmainを最上位正本とし、`research-bundle.v1`、stable ID、Universal Journal/typed projections、evidence/rights/uncertainty規則を使う。
2. 実際の保存は本ブランチに取り込まれた検証済み収集CLIを使う。自由記述の調査結果から直接R2や画面用JSONへ書かない。
3. Universal共通要件 + Make-Money研究要件の和集合を調査する。画面に今出さない事実も捨てない。Hook、4 STAGES、Money Machine、Moat、Opportunity等はFoundationの事実ではなくderived outputとして保持する。
4. 可能ならagentごとに候補リストとrun IDを分ける。同一主体を再取得してもstable ID/create-only/dedupeで安全に扱える設計を維持するが、無駄な重複調査は避ける。
5. 新規R2保存はcreate-only。既存 `universal`、EDINET、Investrader shadow、既存Foundation objectを移動・上書き・削除しない。
6. 出典がない有用な候補は捨てず `UNVERIFIED` として保持する。ただし未確認の数字をverified、ランキング根拠、成功保証に昇格しない。
7. 各runはschema/audit/ingest-complete/readback/hash/dedupe結果を残す。100件という件数だけでは完了としない。
8. R2認証がない実行環境では、validated research bundleとplanned write manifestまで作って停止する。legacy `universal` へ代替保存しない。

9. Journalは後回しにしない。収集と同じrunの`journal-entry.v1`を計画し、許可された既存経路で保存し、Journal件数・schema検証・readbackを完了報告に含める。descriptorの更新も、データ本体とは別の明示的な新規create-only書込みとして扱う。

この収集workstreamはNeon、D1、R2 SQLを必要としない。R2 serving/indexの最適化やInvestraderのDB撤去は別作業として進める。
