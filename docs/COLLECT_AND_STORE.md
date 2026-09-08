# 「MAKEMONEYに必要なデータを集めてこい」の実行入口

## 収集漏れの検査（必須）

Universalの `docs/COLLECTION_RECONCILIATION.md` と `registry/collection/business-case.v1.json` を読む。資料の見出し・表・全期間ごとの関連情報を棚卸しし、保存レコードへ結び付ける。あるのに未保存の情報は「不明」ではなくpending。画面外の関連情報も残す。

`node --import tsx scripts/foundation-collect.ts requirements` で共通の細目と現コードの出力項目を取得する（FOUNDATION_REPO設定が必要）。`collection_audit.v1` 観測に細目、資料別抽出台帳、値照合、第二巡レビュー、未読候補、現コードhashを記録する。

`node --import tsx scripts/foundation-collect.ts audit request.json audit-result.json` で不足を検査し、解消後は `ingest-complete` で保存する。通常のingestは部分保存用。旧ALL_DIMENSIONS_ATTEMPTED、項目数、R2成功だけでは収集完了を意味しない。監査なしはREVIEW_REQUIRED。どのAIもこの手順を省略しない。

新規データだけを収集・保存する。既存 `universal`、EDINET、移行済みshadowの整理・変更はしない。

## 最初に読む

認証付きで `salve-de/universal-foundation` を取得し、その `AGENTS.md` → `docs/UNIVERSAL_COLLECTION_BASELINE.md` → `docs/AI_COLLECTION_AND_STORAGE_CONTRACT.md` → `docs/MAKE_MONEY_AGENT_RUNBOOK.md` → `docs/MAKE_MONEY_RESEARCH_REQUIREMENTS.md` を読む。非公開リポジトリの404を不存在と断定しない。

収集対象はその共通要件と本プロジェクト要件の和集合。利益・費用・手残りを売上で代用しない。出典なしもUNVERIFIEDで保持し、推定・推論は区別する。追加情報は `observations` に観測者・時刻・取得経路とともに残す。

## 実行

Node.jsとnpm、検索/ブラウザ、GitHub認証が必要。初回は `npm ci`。

```sh
gh repo clone salve-de/universal-foundation /private/tmp/foundation-contract
export FOUNDATION_REPO=/private/tmp/foundation-contract
```

AI自身が検索・閲覧して事実を集め、正本schemaに沿う `request.json` を作る。`data/collection/buffer-2024.request.json` は実測した過去年度の部分収集例であり、新しい対象の数字として流用しない。旧 `scripts/pipeline/` は合成サンプルで、実収集には使わない。

`collection_coverage` は `src/lib/foundation/coverage.ts` の全項目を含める。foundには実レコード参照、attempted_unavailable/unknownには実際の調査記録、not_applicableには理由を書く。未調査はnot_attempted。範囲外の追加観測も捨てない。

```sh
node --import tsx scripts/foundation-collect.ts prepare request.json plan.json
npm run r2:with-secrets -- node --import tsx scripts/foundation-collect.ts ingest request.json receipt.json
```

保存には依頼による権限と `write_authorized:true` が必要。`prepare` はネットワーク書込なし。`ingest` は正本schema、項目網羅、保存計画を検証し、条件付き新規作成と読戻しSHA照合を行う。receipt.jsonは実行前計画、receipt.json.result.jsonが成功結果。同一入力の再実行は別のローカルreceipt名を使い、同一R2内容を再作成しない。

## 認証の境界

このMacではKeychainラッパーを使う。鍵を表示・GitHubへ登録しない。別マシンは許可済みのR2環境変数を安全な実行環境で渡し、直接nodeコマンドを実行する。GitHubを読めることだけでR2書込権限は得られない。認証できなければ準備成果物を保持し、保存成功と報告しない。

## 完了報告

収集件数、各項目の未取得/未調査、出典状態、bucket/key、作成件数、読戻し一致数を示す。PARTIALは保存成功でも調査完了ではない。ALL_DIMENSIONS_ATTEMPTEDも全数値が判明した意味ではない。既存データの移動・上書き・削除は常に0。
