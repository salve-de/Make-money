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
