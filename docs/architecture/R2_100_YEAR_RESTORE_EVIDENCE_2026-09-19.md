# R2復元ドリル証跡（2026-09-19）

## 結果

- 判定: `PASS`（サンプル復元）
- 対象Receipt: `data/collection/shipfast-2026.collect-receipt.json.result.json`
- 対象: `foundation-lake` の27オブジェクト
- 復元先: `/private/tmp/r2-restore-check.5HaV4C`
- 復元時の合計バイト数: 36,846 bytes
- 各オブジェクト: ReceiptのSHA-256とバイト数をR2 GET後に照合
- R2側のPUT・削除・移動: 実行していない

## 限界

これはFoundation全体、`universal`、定期バックアップ、別リージョン復元、Catalog再生成、UI受入れを証明するものではない。RPO/RTOは未計測のため`UNKNOWN`とする。次回は別の一時復元先で同じドリルを行い、Catalog再生成と代表画面の読み取りまで測定する。
