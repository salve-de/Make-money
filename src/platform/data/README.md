# ローカル資料の所在と訂正経路

ここはMake-Moneyの旧ローカル資料と、監査後の参照用projectionを置く場所です。**Foundation R2の正本ではありません。** 本番のR2-only読み取りへ、これらを無条件にフォールバックさせないでください。

|所在|役割|変更する場面|
|---|---|---|
|`mockLedgerData.ts` / `additionalInstitutionalEntities*.ts`|旧資料。`SOURCE_INSTITUTIONAL_ENTITIES` は重複・誤った主張も含む原記録|原文を消して帳尻を合わせない。訂正は下記へ追加|
|`financial-reconciliation.ts`|一次資料URL、参照日、会計期間、確認できた事実と制限。監査対象18社の訂正|会社名に対応する一次資料を読み、確認できた指標だけ更新|
|`INSTITUTIONAL_ENTITIES`|旧IDの名寄せ→一次資料による訂正→算術検査を通した参照用レコード|直接ハードコードして更新せず、原記録と訂正を分離|
|`findInstitutionalEntity(id)`|旧保存IDを正規IDへ解決|保存済みIDを参照するとき。重複を一覧へ戻さない|
|`src/shared/financial-integrity.ts`|円P&Lの算術検査と未確認フラグ|計算・未知判定ルールを変更するとき|
|`docs/FINANCIAL_RECONCILIATION.md`|全18社の一次資料、撤回理由、調査範囲|なぜ金額を採用・不採用にしたかを確認するとき|

## 必須の区別

- 価格と会社売上、登録者と課金人数、調達額と売上、EBITDAと営業利益、全事業と単一製品、月次ペースと通期売上を混ぜない。
- 外国通貨の公表額は原通貨・期間付きEvidenceに保持する。為替根拠なしの円換算や、年額÷12を実際の月商とする処理は禁止。
- 未確認の数値スロットは互換型上0でも実績ゼロではない。P&Lフラグ、`operations.isCapitalUnconfirmed`、`tool.isCostUnconfirmed`、`isGrowthUnconfirmed` を表示・集計で確認する。
- 原記録の誤った金額が戦略・価格・原価・年表の文章から復活しないよう、訂正対象の旧財務文を配信projectionで除外する。新しい出典付きEvidenceは除外しない。財務と無関係な文章やツール名は保持する。
- `SOURCE_INSTITUTIONAL_ENTITIES` をUI・公開APIのデータとして使用しない。原記録の保全・監査テスト専用。

## 修正後の確認

```sh
pnpm exec vitest run src/platform/data/financial-integrity.test.ts src/platform/data/financial-reconciliation.test.ts src/features/company-inspector/model/financial-display.test.ts
pnpm schemas:check
```

型を変更した場合は先に`pnpm schemas:generate`を実行し、生成schemaの差分もレビューする。R2の訂正はFoundationの登録済み契約と追記経路を別途確認し、ここを編集しただけでR2に反映済みとは扱わない。
