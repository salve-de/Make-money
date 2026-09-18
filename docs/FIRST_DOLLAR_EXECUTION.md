# First Dollar Execution — MAKE MONEY の実行レイヤー

更新日: 2026-09-19

## 北極星

MAKE MONEY を「儲かる事例を読む場所」で終わらせず、ユーザーが実際の最初の売上に到達するまでを1本の導線として持つ。

最重要のプロダクト指標は、閲覧数や保存数ではなく **Time to First Dollar**（機会を見つけてから、実売上が最初に発生するまでの時間）。

## ユーザー導線

```
FIND → BUILD → LIST → DISTRIBUTE → SELL → EARN
```

1. **FIND** — 元事例から、誰に何を売るかを固定する
2. **BUILD** — 販売に必要な最小商品を作る
3. **LIST** — 公開URLと価格を決め、買える形にする
4. **DISTRIBUTE** — 最初の見込み客がいる場所へ出す
5. **SELL** — 実際に支払える決済URLを接続する
6. **EARN** — 推定ではなく、実際に発生した売上実額を記録する

## 実装

- 企業事例インスペクター: `この稼ぎ方を実行` CTA
- 個別実行画面: `/execute/[id]`
- 実行中一覧: `/execute`
- 共有モデル: `src/shared/execution.ts`
- Private API: `/api/execution-projects`
- D1 migration: `migrations/d1/0008_execution_projects.sql`

既存の `FinancialEntity` にある `essence`, `strategy`, `pricing`, `acquisition`, `lootBlueprint` を読み、ゼロから宿題を作らせるのではなく、元事例で既に判明している勝ち筋・顧客・価格・集客・転用手順を実行画面へ持ち込む。

## 保存方式

- 未ログイン: ブラウザの anonymous scope の localStorage に即保存。開始時の登録摩擦を作らない。
- ログイン済み: ブラウザ下書きも Firebase UID ごとに分離し、D1 の `execution_projects` も本人所有として保存する。
- 「ログインして同期」からログインした場合だけ、編集済み anonymous draft を一時 claim として現在のアカウントへ引き継ぎ、anonymous 側から削除する。別アカウントのローカル下書きは読み込まない。
- Local と Cloud が両方ある場合: `updatedAt` が新しい方を優先し、古いクラウド状態で新しいローカル下書きを上書きしない。
- D1 の所有権はサーバーで検証した UID だけを使用し、クライアントから userId を受け取らない。
- `DELETE /api/user/me` の application-data 削除では `execution_projects` も同一トランザクションで削除し、readback で残存ゼロを確認する。
- 退会後に古いlocalStorageから消去済み案件が復活しないよう、退会レスポンスでUID単位のHttpOnly reset markerを設定する。次回GETでreset時刻以前のローカル下書きを破棄し、PUT側もreset以前のtimestampを409で拒否する。
- クラウド保存中にユーザーが追加編集した場合、古い保存レスポンスで新しいlocal draftを上書きしない。送信時timestampと現在のlocal timestampを比較し、後者が新しければdirty状態を維持する。
- APIのrequest上限は、共有スキーマ上の最大有効入力（20,000文字メモ、2,000文字顧客欄、URL等）がUTF-8多バイト文字でも保存可能な128KiBに合わせる。

## First Dollar の定義

`revenueJpy > 0` の実額が入力された時だけ First Dollar 達成とする。

市場推定、想定月商、目標価格、元事例の売上は First Dollar に算入しない。実売上と推定値を混同しない。

## 現時点の境界

この縦スライスは「発見から実売上記録までの実行OS」を作るもの。SELL 段階ではユーザーが実際に利用できる checkout URL を接続・実機確認できる。

MAKE MONEY 自身がマーケットプレイスとして第三者商品の代金を受領・分配する Stripe Connect / seller onboarding / 紹介報酬分配までは、この変更には含めない。そこは法務・KYC・返金・チャージバック・税務を伴う別の決済レイヤーとして追加する。

## 次の実装判断基準

新機能は原則として次のどれかを短縮・改善する場合だけ追加する。

- First Dollar までの時間を短縮する
- BUILD の作業量を減らす
- DISTRIBUTE の最初の顧客到達率を上げる
- SELL の決済摩擦を減らす
- EARN 後の再現性・反復率を上げる

単に情報量を増やすだけの機能は、この実行レイヤーより優先しない。
