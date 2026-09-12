# 設計文書の保存記録

確認日: 2026-09-11。設計文書の保存証拠であり、アプリ移行・本番稼働の完了証明ではありません。

- GitHub: `salve-de/Make-money`
- ブランチ: `codex/reliability-boundaries`（mainへの反映は別途確認）
- 文書コミット: `ca9c49ac57df1e2f767d52a93e56a1d4eeb0fbe1`
- 保存対象: `AGENTS.md`, `docs/architecture/STORAGE.md`, `docs/architecture/PROJECT_STARTER.md`
- R2バケット: `make-money-production-private`（今回新規作成したアプリ専用バケット）
- Object key: `architecture/ca9c49a/architecture-snapshot.v1.json`
- サイズ: 65,843 bytes
- SHA-256: `f3db750f4446a4c8676ae45d5f0ed3b96611c9d35e7cd1159b59a162670dce6c`
- manifestの形式: `architecture-snapshot.v1`。repo、commit、文書ごとのpath/hash/contentを格納。
- 検証: `git ls-remote`でリモートcommit一致。R2からGETし、アップロード前の全bytes一致とSHA-256一致を確認。

読み方: GitHubの当該コミットを通常の参照元にする。R2はその版の保管コピー。改定時は新コミット・新object keyで追記し、旧版を上書きしない。最新の移行状態はSTORAGE.mdと実装・試験結果を確認する。

## Neonの現状確認（移行対象の棚卸し）

2026-09-11、接続可能なorganization配下のプロジェクト一覧はInvestrader-hubのみ。production branchの`neondb`のtable一覧を読み取りました。Make-Money旧schemaの`businesses`, `business_ideas`, `market_signals`, `saved_items`, `submissions`, `newsletter_subscribers`, `analyst_notes`, `chat_conversations`, `synthesized_ideas`は一覧にありません。`users`や`chat_messages`という一般名は存在しますが、Make-Moneyの所有データと確認できないため移行・削除していません。

この確認範囲でMake-Moneyの移行対象は特定できていません。別アカウント・別branchも含めて「Neonに一切ない」と断定するものではありません。Neonの実データ移行を完了したとは扱わないでください。

## 初期D1バックアップ

- D1: `make-money-production-app` / `07affd4c-cac4-4998-843c-b5881fccab5e`
- migrations: 0001〜0003適用済み。users/payment_eventsほかアプリ8テーブルは全て0行。移行済みユーザーがいるとは意味しない。
- R2: `make-money-production-private/backups/d1/2026-09-11-initial/schema.sql` と同prefixの`manifest.json`
- SQL: 3,569 bytes / SHA-256 `ef0e120ef1eeb268a5119ff291743a53da0251d805d904f569c59d10cce6ea31`
- 検証: 実D1からエクスポート → 空のローカルSQLiteへ復元 → integrity/FK検査・migration3件・全アプリテーブル0行を確認。R2へ保存後GETし全bytes/hash一致。その後、空の隔離D1へ復元し再exportのschema・全行内容hash一致も確認。[クラウド復元証拠](recovery-evidence/2026-09-11-initial-d1.json)。
- バケットのr2.dev公開URLは無効とAPIで確認。

## 2026-09-12 最終検査記録

`codex/reliability-boundaries` のコミット `c38f1e76319dcf5543f37275587f376f2ecc8345` について、ローカル検査とGitHub Actionsの必須5チェック（lint / typecheck / unit test / build / E2E smoke）が成功した。検査結果の秘密情報を含まないreceiptを、同じ版の保管物として非公開R2へcreate-only保存した。

- GitHub Actions: run `34625104370`（PR #18）
- R2: `make-money-production-private/architecture/c38f1e7/verification-receipt.v1.json`
- サイズ: 3,329 bytes
- SHA-256: `807a283eea2534aac6e4c14b414dd637d7fc76f789b45871a57d7c8d2840b661`
- 検証: 保存前に同一keyが存在しないことを確認。保存直後にGETし、全bytesとSHA-256の一致を確認。

この記録は、実Workerの本番デプロイ、main統合、Stripe本番決済往復、実ユーザーデータ移行、production D1復元訓練の完了を意味しない。RPO/RTO、保持日数、定期バックアップ運用は別途実施する。

## 2026-09-12 Worker実行時検証記録

`codex/reliability-boundaries` のコミット `b9e3337b28e8a2555279a4fb66b6fd71b2d638f3` について、AJV実行時compileによるCloudflare Worker 500を修正し、ローカルworkerd＋Foundation R2 read bindingで一覧・詳細・ブラウザ描画を確認した。検証結果を秘密情報なしのreceiptとして、専用非公開R2へ新規keyで保存した。

- GitHub Actions: run `34628857331`（PR #18、lint / typecheck / unit test / build / E2E smoke 全成功）
- R2: `make-money-production-private/architecture/b9e3337/worker-runtime-verification.v1.json`
- サイズ: 2,095 bytes
- SHA-256: `cadb2a0956afb62af227974b5021598ab7218ef7aebbd522cf8d1247062aa82b`
- 検証: 保存前GETで未存在を確認。保存直後にGETし、全bytes・SHA-256一致を確認。

この記録は、本番deploy、main統合、Stripe本番往復、production D1復元訓練の完了を意味しない。リモートpreviewへのWorker資材アップロードは行っていない。

## 2026-09-12 継続監査レシート

`codex/reliability-boundaries` のコミット `72c7dc7cfcf65a89159a085c354601a6cebf44ca` について、R2優先の一覧・詳細投影、未確認値の表示、匿名書込み境界、全自動検査、実WorkerのFoundation R2読み取りを確認した。秘密情報を含まない検証レシートを、対象コミットを含む新しいkeyへCreate-Only保存した。

- R2: `make-money-production-private/architecture/72c7dc7cfcf65a89159a085c354601a6cebf44ca/verification-receipt.v1.json`
- サイズ: 2,815 bytes
- SHA-256: `7101e4350736c8a9800a86f5b109bc808dbd42566787d22faf08a1d2f2f97821`
- 検証: remote R2 bindingを持つ一時ローカルWorkerで保存し、直後にGETして全bytes・SHA-256一致を確認。S3互換Keychain経路は403（権限不足）であり、秘密値は出力・保存していない。
- 検査: lint、typecheck、Vitest274、Foundation11、architecture8、Python6、build、Workers秘密値スキャン、deploy preflight、`pnpm audit --prod`、E2E25が成功。実ブラウザでR2 entity詳細とPhoto AIの未確認財務、J/K無効化を確認。

この記録は、GitHubへのpush、main統合、本番Workerデプロイ、本番D1への0004/0005適用、Neonの実データ移行、production backup/restoreの完了を意味しない。リモートpreviewへの資材アップロードは自動審査で拒否されたため行っていない。

## 2026-09-12 standalone E2E修正後の最終レシート

コードコミット `36703f8ddc9526cb79204cc14ff989b31bad3ec8` で、Next公式のstandalone server起動をPlaywrightに適用した。再ビルド、Workers build、lint、typecheck、unit/foundation/architecture/recovery、deploy preflight、audit、E2E25件を再実行して成功した。

- R2: `make-money-production-private/architecture/36703f8ddc9526cb79204cc14ff989b31bad3ec8/verification-receipt.v1.json`
- サイズ: 3,661 bytes
- SHA-256: `907e43b5bfe1379dbde8a55de70014089c30710b7d7ff5b7acdb6682769953e7`
- 検証: remote R2 bindingを持つ一時ローカルWorkerでCreate-Only保存し、直後のGETで全bytes・SHA-256一致を確認。

## 2026-09-12 Foundation詳細取得の競合修正と現HEAD検証

コードコミット `e2e3071` で、Foundation一覧の初回取得中に詳細フェッチがAbortされて再取得されない競合を修正した。初回一覧の完了を詳細取得の開始条件にし、summary表示が最後まで残るケースを防いだ。文書・コードを含む現HEADで、lint（警告0）、strict typecheck、Vitest274、Foundation11、architecture8、Recovery6、Next build、Paid本文検査、OpenNext Worker bundle/secret scan、deploy preflight、`pnpm audit --prod`、Playwright25を再実行して成功した。実ブラウザでも`http://127.0.0.1:3101/?entity=ent_photoai`を読み、Photo AIの未確認財務、Evidence、Layer 3、メモ、J/K案内の不在を確認した。

この検証状態に対する追加R2レシートは自動審査で拒否されたため作成していない。既存の検証レシートとGit管理の監査記録を正本として併読する。GitHubへのpush、main統合、本番Workerデプロイ、Stripe本番往復、実ユーザーデータ復元はこの記録から完了扱いにしない。

## 2026-09-12 本番D1 migration適用前の保全と読み戻し

本番D1 `make-money-production-app`（ID `07affd4c-cac4-4998-843c-b5881fccab5e`）の0004/0005適用前に、全アプリテーブル0行を確認した完全exportを非公開R2へcreate-only保存した。保存直後のGETで双方のbytesとSHA-256が一致した。

- R2 SQL: `make-money-production-private/backups/d1/2026-09-12-pre-0004-0005/schema.sql`
- SQL: 3,569 bytes / SHA-256 `ef0e120ef1eeb268a5119ff291743a53da0251d805d904f569c59d10cce6ea31`
- R2 manifest: `make-money-production-private/backups/d1/2026-09-12-pre-0004-0005/manifest.json`
- manifest: 884 bytes / SHA-256 `0683b09961068e3f33075ea7142f55e8b8d6c5bbac2d6cfb552474a64cc9ddfc`
- 適用結果: `0004_newsletter_privacy.sql`、`0005_request_rate_limits.sql`を本番D1へ順序どおり適用。`wrangler d1 migrations list APP_DB --remote`は`No migrations to apply`。
- schema読み戻し: `newsletter_subscribers.user_id`、`unsubscribe_token_hash`、所有者index、解除tokenのpartial unique index、`request_rate_limits`表と制約を確認。同表は0行。

この記録はschema変更と空DBの適用確認であり、本番Workerデプロイ、実ユーザーデータ移行、本番認証・決済往復、production restoreの完了を意味しない。復旧手順と制限は [RECOVERY.md](RECOVERY.md) を参照する。

機械可読の監査記録は [2026-09-12-production-d1-migrations.json](recovery-evidence/2026-09-12-production-d1-migrations.json) に保存する。追加のR2レシートは自動審査により作成していないため、このファイルと既存R2 backup objectを併読する。

## 2026-09-12 lint警告遮断後の最終レシート

コードコミット `8d06ae0404a62196ed0f42cf2d96cd8fd396fb90` で、lintを`--max-warnings=0`へ固定した。現HEADでlint、typecheck、全Unit/Foundation/Architecture/Recovery、build、Workers bundle、preflight、依存監査、standalone E2E25件を再実行して成功した。

- R2: `make-money-production-private/architecture/8d06ae0404a62196ed0f42cf2d96cd8fd396fb90/verification-receipt.v1.json`
- サイズ: 2,044 bytes
- SHA-256: `799b5b26564e778432825426c673084ce1f791b3f65e16f9c87759f5afe24c62`
- 検証: remote R2 bindingを持つ一時ローカルWorkerでCreate-Only保存し、直後のGETで全bytes・SHA-256一致を確認。
- 文書: 前回の検証文書コミット `58cbeadab8dcc46c7001e0210ed895edb9b110d0` を含む。今回の追記コミットはこのレシートの保存後に作成する。

## 2026-09-12 最終状態レシート

文書コミット `96e715ea05fd0a99664020fbd9c5c1c25bbe7161` を含む最終検証状態を、非公開R2へ別keyで保存した。

- R2: `make-money-production-private/architecture/96e715ea05fd0a99664020fbd9c5c1c25bbe7161/verification-receipt.v1.json`
- サイズ: 3,661 bytes
- SHA-256: `f626e6df2ec1696a69fe6f0f1098e8b51dcb96356b78848541ef03c1667b942d`
- 検証: remote R2 bindingを持つ一時ローカルWorkerでCreate-Only保存し、直後のGETで全bytes・SHA-256一致を確認。
- 内容: コードコミット、文書コミット、lint/typecheck/unit274/Foundation11/architecture8/Python6/build/workers秘密値スキャン/deploy preflight/audit/E2E25、実WorkerのFoundation R2一覧・詳細・ブラウザ結果、GitHub push未実行と本番未検証の制限。

## 2026-09-12 standalone start統一後の最終レシート

コードコミット `5146dfa779c1239909a624ba7b0c13f5405664c3` で、`pnpm start` もPlaywrightと同じ `scripts/start-standalone.mjs` を起動するよう統一した。再ビルド、Workers build、lint、typecheck、unit/foundation/architecture/recovery、deploy preflight、audit、E2E25件を再実行して成功し、`pnpm start` の起動後にAPI応答を確認した。

- R2: `make-money-production-private/architecture/5146dfa779c1239909a624ba7b0c13f5405664c3/verification-receipt.v1.json`
- サイズ: 2,020 bytes
- SHA-256: `a1bede98fa4319592f34d6054f0f39d333eb4efb27af865664d789ce9f7069c3`
- 検証: remote R2 bindingを持つ一時ローカルWorkerでCreate-Only保存し、直後のGETで全bytes・SHA-256一致を確認。
- 制限: GitHubへのpush、main統合、本番Workerデプロイ、本番D1への0004/0005適用、Neon実データ移行、production restoreは未実施・未検証。これらをこのレシートから完了扱いにしない。

## 2026-09-12 pnpm案内統一の追補

文書コミット `02087f7aea22ac57981cd04c1b5bb281c9012b55` で、AI向け入口文書の実行例をリポジトリ標準のpnpmへ統一した。コード検証は直前の `5146dfa779c1239909a624ba7b0c13f5405664c3` と同一である。

- R2: `make-money-production-private/architecture/02087f7aea22ac57981cd04c1b5bb281c9012b55/verification-receipt.v1.json`
- サイズ: 2,032 bytes
- SHA-256: `0c33286594705e8a06f7b53db8e3bd86ae4239dd70e2f92a2f1577f98bcd1f95`
- 検証: remote R2 bindingを持つ一時ローカルWorkerでCreate-Only保存し、直後のGETで全bytes・SHA-256一致を確認。

## 2026-09-12 現行運用境界の再監査

文書コミット `71037a7` で、`CLAUDE.md` と `README.md` の自律push指示を、明示承認・対象確認・remote/CI/Ruleset読み戻し必須の運用へ修正した。白書冒頭にも履歴と現行指示の区別を追記し、`STORAGE.md` のD1 migration記述を現行状態に揃えた。

- 対象状態コミット: `71037a7`（`codex/reliability-boundaries`、このレシート作成前の作業ツリーclean、`git diff --check`成功）。この監査記録を含むコミットは `74c089d`。
- 検査: lint（警告0）、typecheck、Vitest274、Foundation11、architecture8、Recovery6、Next build/Paid392、Workers build/secret scan、deploy preflight、`pnpm audit --prod`、Playwright Chromium25が成功。
- 実ブラウザ: `http://127.0.0.1:3101/?entity=ent_photoai` を読み、Photo AIの未確認財務、Evidence、Layer 3、メモ、J/K案内の不在、⌘K検索とEscape閉じるを確認。
- 読み戻し: 本番D1 `wrangler d1 migrations list APP_DB --remote` は `No migrations to apply`。GitHubの対象branchは `c3dcd48...`、mainは `aa4e64...`。現HEADはremote branchへ未pushで、現HEADのGitHub CI実行は主張しない。

追加のR2検証レシート作成は自動審査で拒否されたため行っていない。既存R2の保全物、Git履歴、上記の読み取り証拠を併読する。本番Workerデプロイ、Stripe本番往復、production restore、定期バックアップ自動化は未実施・未検証であり、完了扱いにしない。

## 2026-09-12 現行コード・GitHub CI・R2 readback レシート

コード・監査文書コミット `057f4985249eb36c9ea2eec34e3cd77d8b76ad6a` を `origin/codex/reliability-boundaries` へpushした。GitHub Actions run `34689950523` は `lint`、`typecheck`、`unit test`、`build`、`E2E smoke` の5項目すべて成功し、PR #18は `OPEN` / `MERGEABLE` / `CLEAN` である。mainへのmergeは行っていない。

- R2: `make-money-production-private/architecture/057f4985249eb36c9ea2eec34e3cd77d8b76ad6a/verification-receipt.v1.json`
- サイズ: 1,194 bytes
- SHA-256: `43d0afef72a9b096cfff74f4d55c3cb8f44c157b19aab35d39a185db338834d7`
- 検証: 一意キーの未使用をWranglerで事前確認後に保存し、直後のWrangler GETで全bytesを取得。upload元とdownload元のSHA-256およびbytesが一致した。
- 内容: 最新コードSHA、ローカル検証（Vitest281 / Foundation11 / architecture11 / Recovery6 / Playwright26）、GitHub 5チェック、実ブラウザのPhoto AI未確認財務・Evidence・J/K無効・Escape終了の結果、未検証の本番境界。

このレシートはR2への保存とreadbackを証明する。Production Workerデプロイ、実ユーザーデータのNeon移行、定期バックアップ/RPO/RTO運用、production restore、mainへのmergeの完了は意味しない。
