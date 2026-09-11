# 認証と保存の検証記録

2026-09-12、アプリコミット `2520bda464a08496311dd466bf2bf2b1fd8a2260` に専用Firebaseのローカル設定を接続して検証した。

## 実際に通した経路

Firebase Authentication `make-money-salve-prod` のメール・パスワード認証 → 実際の署名付きIDトークン → ビルド済みOpenNext Worker → `APP_DB` binding → 隔離ローカルD1。

- ランダムな `example.invalid` メールとランダムパスワードで使い捨てアカウントを2件作成し、パスワードで再ログイン。メール送信は実施しない。
- `GET /api/analyst-notes` は未認証・不正トークンで401。
- 1人目のトークンで `PUT /api/analyst-notes` が200。続くGETで保存本文が一致。
- 2人目のトークンによるGETには1人目のメモが含まれない。
- finallyで検証アカウント2件を削除。トークンとパスワードはログ・Git・R2へ保存しない。
- D1 migration 0001〜0003は隔離ローカルDBに適用。本番D1とFoundation R2へ検証データを書かない。

## 再実行時の条件

専用FirebaseのSDK設定をGit対象外の環境へ注入して `pnpm build`、`pnpm bundle:workers` を実行する。別のWrangler設定で本番bindingを持たないローカルD1を用意し、migrationを適用してWorkerを起動する。実認証の登録・ログインAPIで得たトークンを上記APIに渡す。検証は所有する使い捨てアカウントだけを使い、失敗時も削除する。本番環境へ暗黙にfallbackさせない。

## 同時に実行した検査

- `pnpm lint`: エラー0、既存警告132。
- `pnpm typecheck`: 型・schema同期とも成功。
- `pnpm test`: Vitest236件、Foundation10件、Python6件と復元検証が成功。
- `pnpm build`: 成功。有料本文の配信漏れ検査84ファイル・392照合対象も成功。
- `pnpm bundle:workers`: 成功。
- `pnpm test:e2e`: Chromium25件成功。ここではR2未設定時のfallbackも検証しており、実R2全件監査を意味しない。
- 同コミットのGitHub必須チェック5項目はすべて成功。実行ID `34612332462`。

最初のビルドはサンドボックスのGoogle Fonts取得制限で失敗した。ネットワーク許可付きで再実行して成功した。検査自体は無効化していない。

## 残る本番条件

Googleログインの公開サポートメール、公開先の許可ドメイン、デプロイ先の環境設定、Stripe webhook署名秘密値と決済の往復検証、PR経由のmain統合、本番D1への保存・読み戻しが残る。ローカル結合検証と本番完了を区別する。
