# R2投入対象棚卸し（2026-09-19）

## 結論

Macの作業コピーだけを探索した初期棚卸しでは正本を特定できなかったが、Windows側の正本releaseを確認し、実R2への投入と全件readbackを完了した。

## 権威ある投入対象

- release ID: `reconcile-v1-080c1ec9401e40bbb29920ae`
- Windows正本: `C:\Users\salve\Projects\GitHub\makemoney-latest-20260919\scratch\makemoney-releases\reconcile-v1-080c1ec9401e40bbb29920ae`
- ファイル数: `6,689`
- 総バイト数: `97,896,063`
- 内訳: `foundation-raw` 1件、`foundation-lake` 3,346件、`foundation-public` 3,342件
- 正本の根拠: release内の`manifest.json`および`objects.json`

Mac側の`data/raw_sources_cache/`（JSON 211ファイル、正規化一意ID 6,465件）は候補探索の作業コピーであり、このreleaseの正本ではない。候補件数へ置き換えたり、混ぜて再投入してはならない。

## 実行結果

Windows側のportable uploaderが、次の順序で実行された。

1. 全6,689キーを事前照合
2. 全件が未登録（`preflight_missing: 6,689`、既存同一0、衝突0）であることを確認
3. Canaryを新規PUTし、同一キー再PUTを`EXISTS_IDENTICAL`として拒否
4. 6,689件をCreate-Onlyで新規PUT
5. 全6,689件をGETし、manifestのSHA-256とバイト数を照合

最終receiptの値:

| 項目 | 結果 |
|---|---:|
| target | 6,689 |
| preflight missing | 6,689 |
| preflight existing identical | 0 |
| new PUT | 6,689 |
| conflicts | 0 |
| errors | 0 |
| readback SHA-256/bytes PASS | 6,689 / 6,689 |
| overwrite / delete / move | なし |

`put_existing_identical: 2`は、Canaryの同一内容再PUTとその制御上の再確認を数えたもので、投入前から存在したデータが2件あったという意味ではない。

## 証跡

- 最終receipt: `C:\Users\salve\Projects\GitHub\makemoney-latest-20260919\scratch\makemoney-releases\reconcile-v1-080c1ec9401e40bbb29920ae\r2-final-receipt.json`
- Preflight: `...\r2-preflight-receipt.json`
- Canary: `...\r2-canary-receipt.json`
- PUT進捗: `...\r2-upload-progress.ndjson`
- readback進捗: `...\r2-readback-progress.ndjson`
- 実行器: `C:\Users\salve\Projects\GitHub\makemoney-latest-20260919\scripts\preservation\upload-entity-release-portable.mjs`
- 実行終了: `2026-09-19T13:30:17.172Z`

## 境界

- 触ったバケットは`foundation-raw`、`foundation-lake`、`foundation-public`だけ。
- `foundation-restricted`、既存`universal`、EDINET正本領域は対象外で、操作していない。
- releaseとportable uploaderはGit管理外または未コミットの可能性がある。`git clone`だけではMacへ移らない。
- R2への保存は完了しているため、Macへ切り替えるために再アップロードする必要はない。
- Bucket Lock、費用、定期バックアップ、Foundation全体の復旧訓練は別の運用監査であり、このreleaseの完了とは別に確認する。
