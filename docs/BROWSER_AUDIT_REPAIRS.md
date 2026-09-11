# 2026-09-11 監査修正と検証の状態

対象: `codex/reliability-boundaries`。本番公開・main統合とは別。保存構成の正本は [STORAGE.md](architecture/STORAGE.md)、実資源の保存証拠は [PUBLICATION_RECEIPT.md](architecture/PUBLICATION_RECEIPT.md)。

## 修正した境界

- `/success`とlocalStorageフラグでの解錠を撤去。本人認証、商品・金額・通貨・状態確認、署名Webhook、D1の注文証拠とStripe現在状態で判定する。失敗時は権限を付けない。
- 取引別に返金・異議・再購入・旧subscriptionを照合。イベント重複・順序逆転をテスト。未提供の法人契約を明記し、価格は既存の1,980円買い切りへ統一。
- 有料12項目を公開DTOから除外。サーバー認可APIで取得する。未契約DOMへぼかした本文を送らない。クライアントの生データimportと本番成果物の本文漏れを機械検査する。
- ユーザー保存・メモ・会話・購入記録をD1へ変更。Neon SDK、ORM、seed、push設定を除去。旧schemaのみ移行照合資料として保全。
- ログイン利用者のメモは本人UIDで限定。ゲストメモを無断でアカウントへ送らない。アカウント切替時に前利用者のメモを隠す。保存失敗を保存済みと表示しない。
- 財務の算術不整合、売上ゼロの利益率、その他営業経費の抜け、営業利益と税引後手残りの混同を修正。123元行を保持し、重複3組を一覧から除外、旧IDを解決する。
- 18社の一次資料を照合。出典のない実額は実績として出さず、確認できた期間・通貨・対象事業を区別。旧自由文からの不正確な財務数値の再配信も抑制。詳細は [財務照合](FINANCIAL_RECONCILIATION.md)。
- ティッカー・welcomeと台帳の財務表示を共通化。未確認初期費用を資金ゼロ検索へ入れない。Trendsの0件時に旧詳細と集計が残らないよう修正。
- 固定Playbookをリアルタイム実測と表示しない。取得失敗・ローカル代替・外部取得を区別。サイドバーに操作名を付ける。

## 最新の検証

- lint: エラー0、既存を含む警告132。依存境界、循環、保存先分離、Neon再導入禁止、migration順序を検査。
- strict TypeScriptと生成schema整合性: 成功。
- Vitest: 236件成功。Foundation: 10件成功。エクスポート比較Unit: 6件成功。E2Eは下記。
- 復元演習: 現行migration・合成データを空SQLiteへ復元し、全schema/内容hash、所有者分離、改ざん拒否、途中失敗rollbackを検証。
- 本番buildと配信漏れ検査: 成功（公開成果物84ファイル、既存有料本文392標識）。メモと認証設定の最終変更を含む。
- E2E: 財務未確認の目次移動を追加した25件すべて成功（1.8分）。合計277件（236 + 10 + 6 + 25）とSQLite復元演習。旧テストの「未確認時に財務DOMが存在しない」という期待値は、「説明表示・遷移成功・損益表と¥0を表示しない」へ更新。ログは `/tmp/mm-browser-fix-e2e-final.log`。
- 実画面修正後にlint/typecheck/test/build/test:e2e/bundle:workersを再実行し成功。lintは引き続きエラー0・警告132。
- GitHub: mainのRequired Status Checks（lint/typecheck/unit test/build/E2E smoke）がactiveであることを再取得確認。

## 実環境の確認範囲

専用D1と非公開R2を作成。migration0001〜0003適用済み。実D1の初期エクスポートをローカルSQLiteへ復元し、R2保存・読み戻しhash一致。アプリの実ユーザーはまだ0行。定期バックアップの稼働や本番データ復元まで検証したものではない。

ユーザーの表示許可後、ユーザーが開いたlocalhost:3101をCodexブラウザで監査した。Photo AIのEvidence・費用未確認表示・ツールへの移動を確認。財務目次が未確認金額を¥0と表示し、移動先が存在しない不具合を検出して修正した。修正後の画面で「財務P&L 未確認」と説明欄への移動を再確認。一覧の営業利益を「純利」と呼ぶ表示も修正。R2一覧APIはfoundation_lake・100件・hasMore=trueを返した。ただしPhoto AI詳細はローカル台帳由来であり、この確認をR2詳細全件やD1保存の実証とは扱わない。

ローカルのFirebase必須4設定・FIREBASE_PROJECT_ID・STRIPE_WEBHOOK_SECRETは未設定であることを値を出力せず確認。Firebase本番設定、Stripe本番Webhook設定・実入金・実返金、本番アプリへのD1接続を通じたユーザー保存は未検証。Neonの閲覧可能な範囲でMake-Money所有データは特定できず、他プロジェクトの一般名テーブルは移行・削除していない。

## 2026-09-12 追補

上記は2026-09-11時点の記録。専用Firebase `make-money-salve-prod` を初期化し、メール・パスワードとGoogleログインをコンソールで有効化した。認証設定APIからメール認証の有効状態と許可ドメインを読み戻し、実Firebaseの使い捨てアカウント2件でWorker→隔離D1の保存・読み戻し・所有者分離を確認した。専用SDK設定はGit管理対象外の `.env.local` のみへ接続。Stripe本番設定・実決済・本番D1・main統合・本番デプロイはこの追補でも未完了。

全収集データの正確性・永久無障害・全プロジェクトへの適用完了を保証する文書ではない。別プロジェクトへの導入は [PROJECT_STARTER.md](architecture/PROJECT_STARTER.md) から行う。

## 2026-09-12 再検証追補

- 実ブラウザで `http://127.0.0.1:3101/?entity=ent_photoai` を開き、Photo AIの社名、未確認の財務表示、Evidence、ツール、メモ欄を確認。J/Kを入力しても選択企業は変わらず、J/K案内は表示されない。
- APIのJSON・署名付きテキスト本文を上限付きreaderへ統一し、直接の`request.json()` / `request.text()`を検査で禁止。未知フィールド、chunked本文、Stripe webhook本文の上限をテスト。
- `pnpm audit --prod` は既知脆弱性0。AJVを8.18.0へ更新し、Workers経由のsharpを0.35.4へ固定。
- 更新後の検査は Vitest257、Foundation11、architecture6、Python6、E2E25 が全て成功。Build、Workers配布物の秘密値スキャン、Wrangler dry-runも成功。
- E2EはR2資格情報を渡さないローカルfallbackであり、実R2全件のユーザー導線を証明しない。実Workerの本番デプロイ、Stripe本番往復、main統合は未実施。
