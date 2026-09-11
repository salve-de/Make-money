# 認証と保存の検証記録

2026-09-12、アプリコミット `2520bda464a08496311dd466bf2bf2b1fd8a2260` に専用Firebaseのローカル設定を接続して検証した。

## 現在の本番D1 schema状態（2026-09-12）

本番D1 `make-money-production-app`（ID `07affd4c-cac4-4998-843c-b5881fccab5e`）へ、`0004_newsletter_privacy.sql`と`0005_request_rate_limits.sql`を適用した。適用前に全アプリテーブル0行を確認し、完全exportを非公開R2へ保存してbytes・SHA-256を読み戻した。適用後はmigration一覧が`No migrations to apply`となり、ニュースレター所有者列・解除token hash・indexと`request_rate_limits`表をschemaから確認した。アプリデータは投入していない。

この状態は以下の「未適用」という過去の検証時点の記述を更新する。Firebaseの本番ユーザー導線、Stripe本番決済、本番Workerからのユーザー保存・読み戻しは別途未検証である。

## 実際に通した経路

Firebase Authentication `make-money-salve-prod` のメール・パスワード認証 → 実際の署名付きIDトークン → `FIREBASE_PROJECT_ID` runtime bindingを使うビルド済みOpenNext Worker → `APP_DB` binding → 隔離ローカルD1。

- ランダムな `example.invalid` メールとランダムパスワードで使い捨てアカウントを2件作成し、パスワードで再ログイン。メール送信は実施しない。
- `GET /api/analyst-notes` は未認証・不正トークンで401。
- 1人目のトークンで `PUT /api/analyst-notes` が200。続くGETで保存本文が一致。
- 2人目のトークンによるGETには1人目のメモが含まれない。
- finallyで検証アカウント2件を削除。トークンとパスワードはログ・Git・R2へ保存しない。
- D1 migration 0001〜0005は隔離ローカルDBに適用。本番D1とFoundation R2へ検証データを書かない。0004/0005の本番適用前の記述は当時の状態であり、現在は上記のとおり適用済み。

## 再実行時の条件

専用FirebaseのSDK設定をGit対象外の環境へ注入して `pnpm build`、`pnpm bundle:workers` を実行する。別のWrangler設定で本番bindingを持たないローカルD1を用意し、migrationを適用してWorkerを起動する。実認証の登録・ログインAPIで得たトークンを上記APIに渡す。検証は所有する使い捨てアカウントだけを使い、失敗時も削除する。本番環境へ暗黙にfallbackさせない。

## 同時に実行した検査

- `pnpm lint`: エラー0、既存警告132。
- `pnpm typecheck`: 型・schema同期とも成功。
- `pnpm test`: Vitest236件、Foundation10件、Python6件と復元検証が成功。
- `pnpm build`: 成功。有料本文の配信漏れ検査84ファイル・392照合対象も成功。
- `pnpm bundle:workers`: 成功。
- Worker配布物のビルドは `pnpm workers:build` 経由に固定し、dotenvの秘密値をビルドへ渡さない。生成済み `.open-next` は秘密値スキャンを通過させる。秘密はCloudflareへ実行時に登録する。
- `pnpm test:e2e`: Chromium25件成功。ここではR2未設定時のfallbackも検証しており、実R2全件監査を意味しない。
- 同コミットのGitHub必須チェック5項目はすべて成功。実行ID `34612332462`。

最初のビルドはサンドボックスのGoogle Fonts取得制限で失敗した。ネットワーク許可付きで再実行して成功した。検査自体は無効化していない。

## 残る本番条件

Googleログインの有効化・サポートメール設定と標準許可ドメインは完了した。デプロイ先の環境設定、Stripe webhook署名秘密値と決済の往復検証、PR経由のmain統合、本番D1への保存・読み戻しが残る。ローカル結合検証と本番完了を区別する。

## 2026-09-12 再検証追補

依存更新、未確認値の明示、ニュースレター所有者・匿名解除トークン、匿名書込みレート制限、R2 bindingのreadback検査を含む作業ツリーで、Vitest274件、Foundation11件、architecture8件、Python6件、E2E25件、Build、`pnpm audit --prod`、Workers秘密値スキャン、Wrangler dry-runを再実行して成功した。実ブラウザではPhoto AI詳細を表示し、次銘柄遷移、J/K入力で企業が切り替わらないこと、Escapeで詳細を閉じられること、未確認の財務値が「未確認」と表示されることを確認した。E2EはR2未設定時のfallbackを含むため、実R2読み取りや本番Workerの稼働証明ではない。0004/0005は隔離ローカルD1と復元演習で確認済みだが、本番D1へは未適用である。

継続監査では、Foundation R2の同一entity IDをローカル旧スナップショットより優先し、実Workerの一覧・詳細・ブラウザ描画で`source: foundation_lake`を確認した。検証レシートは非公開R2へCreate-Only保存し、保存直後のGETで全bytes・SHA-256一致を確認した（`72c7dc7cfcf65a89159a085c354601a6cebf44ca`、2,815 bytes、`7101e4350736c8a9800a86f5b109bc808dbd42566787d22faf08a1d2f2f97821`）。

## 2026-09-12 本番D1適用後の追補

上記のローカル認証検証後、本番D1へ0004/0005を加算適用した。事前exportは [復旧記録](RECOVERY.md) と [保存記録](PUBLICATION_RECEIPT.md) のkey・hashで追跡できる。適用後のschema・migration履歴・rate-limit表0行を読み戻したため、現在の本番D1はアプリコードが参照する列と表を持つ。実データが0行なので、ユーザーが存在する状態の認可・削除・復旧はまだ証明していない。
