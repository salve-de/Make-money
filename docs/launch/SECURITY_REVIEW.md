# 公開前の安全性レビュー（2026-10-06）

対象: `src/app/api/**` の全41経路、公開側への漏れ、セキュリティヘッダー、依存の脆弱性。
本番・R2・D1・Stripe への書き込みや実決済はしていない。秘密値は読んでいない。

## 公開前に必須（残件）

1. **ブラウザでの CSP 実機確認（未実施）**。CSP は強制（Report-Only ではない）で入れたが、`pnpm build` 禁止・共有フォルダのためブラウザ確認はできていない。公開前に次を確認する。
   - Google ログインのポップアップが開き、ログインが完了する
   - 月額・買い切りの決済画面（checkout.stripe.com）へ移動できる
   - 事例の画像（R2 の公開ドメイン含む）が表示される
   - ビルダーのプレビュー iframe が表示される
   - 問題が出たら `src/lib/security/headers.ts` の該当ディレクティブだけを緩める（根拠は同ファイル冒頭）
2. **ニュースレターの二重確認（ダブルオプトイン）**: **対応済み（確認メール方式、未実機確認）**。登録は「確認待ち」で保存し、署名つき・48時間有効のリンクを本人が開いて確定した人だけに配信する（migration 0015 は本番D1へ未適用、Resend での実送信は未確認）。
3. **マーケットプレイスの掲載の審査**: **対応済み（審査方式、未実機確認）**。掲載者が公開を申請すると「審査待ち」になり、運営者（`users.role = 'admin'`）が承認したものだけが公開される。公開中の掲載の内容を変えると審査待ちに戻る。承認時に URL を再検査する。運用手順は `docs/launch/MARKETPLACE_REVIEW.md`。migration 0016 は本番D1へ未適用で、審査 API の実機での動作・運営者トークンでの呼び出しは未確認。
4. **Firebase の Web API キーに HTTP リファラー制限をかける**（Google Cloud コンソール。キー自体は公開前提だが、他サイトでの悪用を防ぐ）。あわせて、匿名ログインが無効であることを確認する（クライアントは使っていない。プロジェクト設定は未確認）。
5. **取り込み用トークンの総当たり対策**。`/api/foundation/ingest*`・`views/rebuild`・`notifications/digest` は秘密値の定数時間比較で守られているが、失敗回数の制限は無い。Cloudflare のレート制限ルール（失敗の多い IP を止める）を入れる。トークンは十分に長いものを使う。

## 公開後でよい

- 認証済みの D1 書き込み系（analyst-notes PUT、bookmarks POST、execution-projects PUT など）に回数制限が無い。1人あたりの上限を入れる。
- `submissions` は、ログイン済みだと回数制限を通らない書き方になっている（`!user && ...`）。本人 ID 単位の上限に変える（既存テストの D1 モックに合わせて直す必要がある）。
- `checkout/status` の回数制限（Stripe の読み取りが毎回走る）。`/api/user/me`・`company-analysis` も、毎回 Stripe を読む。低リスク。
- `foundation/ingest`・`ingest/typed` の 502 応答が内部のエラー文を返す。トークン保持者（運用者）にしか届かないので低リスク。既存テストの文言確認を直してから固定文にする。
- ビルダーのプレビューは v0 が作った HTML を自サイトのオリジンから配信している。iframe は `sandbox`（`allow-same-origin` なし）で、プレビューの応答にもサンドボックスの CSP を付けた。長期的には別ドメインから配信する。
- `GET /api/entities/approve` は認証なしで、呼び出し側が渡した ID の承認状況だけ確認できる。低リスク。
- CSP の `script-src 'unsafe-inline'` を nonce 方式に変える（`proxy.ts` の変更が要る）。
- 高の脆弱性 11 件の残り（下の「依存」）を、上流の更新に合わせて解消する。

## 修正した内容

| 内容 | 変更 | テスト |
|---|---|---|
| 公開の事例詳細に、再監査メモの内部情報（担当者名・手法・内部メモ・権利判断など）が出ていた。出典・裏付けの文・監査日だけを許可リスト方式で公開 | `src/lib/company-access/public-entity.ts` | `public-entity.history.test.ts` に追加 |
| 生成AI（strategy-chat）に費用の上限が無かった。本人 ID あたり 60回/時、超過は 429。回数を数えられない時は AI を呼ばず内蔵推論で答える。500 応答が内部エラー文を返していたのを固定文に | `src/app/api/strategy-chat/route.ts` | `route.test.ts`（新規 5件） |
| Gemini の API キーを URL の問い合わせ文字列から、ヘッダー `x-goog-api-key` へ移動（ログ・履歴への混入防止） | `src/lib/strategy/gemini.ts` | `gemini.test.ts`・`idea-research/route.test.ts` を更新 |
| 決済画面の作成（checkout）に 20回/時、契約管理画面（billing/portal）に 30回/時の上限（本人 ID 単位）。回数を数えられない時は正規の購入を止めない | `src/app/api/checkout/route.ts`・`billing/portal/route.ts` | `checkout/route.test.ts`（新規 2件） |
| `views/rebuild` の 502 が内部のエラー文を返していたのを固定文に | `src/app/api/foundation/views/rebuild/route.ts` | 既存の固定文確認なし（目視） |
| セキュリティヘッダーを追加（下記） | `next.config.ts`・`src/lib/security/headers.ts`・`public/_headers` | `headers.test.ts`（新規 10件） |
| `next` を 16.3.4 から 16.3.6 へ（`next/og` の ImageResponse の遠隔コード実行、重大）。`@next/env`・`eslint-config-next` も同じ版へ。`proxy-addr` を 2.0.8 以上に固定（重大・IP 偽装、ビルド時の express 経由） | `package.json`・`pnpm-lock.yaml` | 下記のテスト結果 |

## セキュリティヘッダーの設計と根拠

実体は `src/lib/security/headers.ts`（純粋な関数）。`next.config.ts` の `headers()` から使い、OpenNext が `getNextConfigHeaders` で Workers にも適用する（後の規則の同名ヘッダーが前を上書きする。範囲は重ならないようにしてある）。

- **CSP（強制）**: `default-src 'self'`、`object-src 'none'`、`base-uri 'self'`、`form-action 'self'`、`frame-ancestors 'none'`。
  - `script-src`: 自サイト + `'unsafe-inline'` + `apis.google.com`。Next.js の描画用 inline script のため。nonce 方式は `proxy.ts` の変更が要るので公開後の課題。開発のみ `'unsafe-eval'`。
  - `connect-src`・`frame-src`: Firebase Auth のポップアップログイン（identitytoolkit / securetoken / www.googleapis.com / `*.firebaseapp.com` / 設定した認証ドメイン / accounts.google.com）。
  - `img-src`: 自サイト・data・blob・https 全体。画像の配信元が実行時の環境変数（R2 の公開ドメイン）で、ビルド時に決まらないため緩めた。画像は実行されないので影響は小さい。
  - フォントは自己ホスト（`next/font/google` はビルド時に取り込む）。Stripe は画面遷移のみで Stripe.js は読み込まないため、Stripe の許可は不要。
  - 本番のみ `upgrade-insecure-requests`。
- **付けないもの**: `Cross-Origin-Opener-Policy`（Firebase のポップアップログインが壊れる）。HSTS の `includeSubDomains`・`preload`（他のサブドメインや取り消しに影響するため。`max-age=31536000` のみ）。
- **その他**: `X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`Permissions-Policy`（カメラ・マイク・位置情報など全て無効）、`X-Frame-Options: DENY`。
- **ビルダーのプレビュー**（`/api/build/preview/*`）: 生成アプリを自サイトの iframe で見せるため、サイト全体の CSP から外し、`sandbox allow-forms allow-modals allow-popups allow-scripts allow-downloads; frame-ancestors 'self'`（`allow-same-origin` なし）と `X-Frame-Options: SAMEORIGIN` を付ける。
- **自前で CSP を付ける経路**（`api/media/file`・`api/notifications/unsubscribe`）は、全体の CSP を重ねない（どちらが勝つかが実行環境で変わるため）。
- **`public/_headers`**: Workers の静的アセット（ASSETS バインディング）はワーカーを通らず直接返るため、`next.config.ts` のヘッダーが効かない。そのため nosniff・Referrer-Policy・X-Frame-Options・Permissions-Policy、SVG への `sandbox` 付き CSP、`/_next/static/*` の長期キャッシュだけを `_headers` で付ける。
- 確認方法: OpenNext の `getNextConfigHeaders` を再現した手元の確認で、`/` と `/discover` に CSP と DENY、media/file と unsubscribe に全体 CSP なし、プレビューにサンドボックス CSP と SAMEORIGIN が付くことを確認した。CSP の値は OpenNext の `compile()` 失敗時のフォールバックでもそのまま保たれる。**実ブラウザでの確認は未実施（公開前に必須の 1）**。

## 公開側への漏れの確認

- 公開の入口は `data/catalog-release.json`（公開 323 件 / 元 3,341 件、承認候補は空）で絞る（`isCatalogId` / `filterToCatalog`）。一覧は許可リスト方式（`publicSummaryEntity`）。詳細は `publicEntity` が `meta`・`sourceMetadata`・`legacyDisplaySnapshot` を除き、今回 `reaudit` を許可リスト化した。
- 公開 323 件のうち、`reaudit` などの欄に eBiz の文言を含むものは 0 件（走査）。
- `sitemap` は公開カタログの ID だけ。`robots` は `/api/` などを拒否。
- `public/` は SVG のみ。追跡ファイルの環境ファイルは `.env.example` のみ（`.env*` は無視）。`NEXT_PUBLIC_*` は Firebase の Web 設定・`APP_URL`・`SITE_URL`・`APP_VERSION` のみ。
- `data/entities-index.json`（98MB・追跡）は `src` から import されておらず、バンドルに入らない。
- 秘密文字列の走査（`sk_`・`whsec_`・`AIza`・`-----BEGIN`・`AKIA`・R2 キー・Resend の `re_`）: 追跡ファイルの該当は、テスト用のダミー 2 か所のみ（`src/app/api/verification/stripe/route.test.ts:222`、`src/lib/verification/stripe-revenue.test.ts:308`）。
- 未確認: 本体フォルダの `.next`・`.open-next` の成果物（ビルド禁止・フォルダ外のため）。公開前のビルド後に `pnpm exec node scripts/architecture/check-paid-bundle.mjs` と、成果物内の秘密文字列の走査を行う。

## API 一覧（41経路）

認証: 「Bearer」= Firebase の ID トークンを検証（Cookie 認証は無いため CSRF の面は無い。例外はビルダーのプレビュー用チケット）。「秘密値」= 運用者用トークンの比較。回数制限: ○ = `consumeRequestRateLimit`。入力: 全経路で本文は `readJsonBody` / `readTextBody` により大きさを制限（`scripts/architecture/check-api-input.mjs` が検査）。

| 経路 | メソッド | 認証・所有者 | 回数制限 | 費用 | 備考 |
|---|---|---|---|---|---|
| analyst-notes | GET/PUT | Bearer・本人のみ | なし | D1 | 公開後に上限 |
| billing/plans | GET | 公開 | なし | なし | 価格表のみ |
| billing/portal | POST | Bearer・本人の契約のみ | ○（今回） | Stripe | メール一致では開かない |
| billing/status | GET | Bearer | なし | Stripe 読取 | |
| bookmarks | GET/POST | Bearer・本人 | なし | D1 | 公開後に上限 |
| build/context・export | GET | Bearer・本人 | なし | なし | |
| build/message・prepare・start・preview-ticket | POST | Bearer・本人 | ○ | v0（生成AI） | |
| build/preview/[sessionId]/… | GET | チケット | なし | なし | 認証情報を除去・https のみ・リダイレクト手動（SSRF 対策）。サンドボックス CSP |
| businesses | GET | 公開 | なし | なし | 公開カタログのみ |
| catalog | GET | 公開 | なし | なし | 公開カタログのみ |
| checkout | POST | Bearer | ○（今回） | Stripe | 金額はサーバー設定。二重契約を拒否 |
| checkout/status | POST | Bearer・本人 | なし | Stripe 読取 | 公開後に上限 |
| company-analysis | GET | 公開（有料部分は権利判定） | なし | Stripe 読取 | |
| entities/approve | GET/POST | GET 公開・POST Bearer | なし | なし | |
| execution-projects | GET/PUT | Bearer・本人 | なし | D1 | 公開後に上限 |
| foundation/ingest・ingest/typed | POST | 秘密値（定数時間比較） | なし | R2/D1 | 失敗回数制限なし（必須の 5） |
| foundation/views/rebuild | POST | 秘密値（定数時間比較） | なし | R2 | エラー文を固定化（今回） |
| health | GET | 公開 | なし | なし | |
| idea-research | POST | Bearer | ○ | Gemini | |
| marketplace/businesses 系 | GET/POST/PATCH | 所有者確認あり | ○ | メール | 審査方式（対応済み・未実機確認） |
| marketplace/listings | GET/PUT | Bearer | ○ | D1 | 審査方式（対応済み・未実機確認） |
| marketplace/reviews（一覧・approve・reject） | GET/POST | Bearer・運営者のみ（`users.role='admin'`） | なし | D1 | 新設。承認時に URL 再検査、読んだ版（revision）にだけ効く |
| media | GET | 公開 | なし | なし | 公開カタログのみ |
| media/file | GET | 公開 | なし | なし | ID を正規表現で検査・カタログ所属を確認（パス横断なし） |
| newsletter/subscribe | POST/DELETE | 公開 | ○（ログイン済みは本人ID単位、アドレス単位の上限も） | メール | 確認メール方式（対応済み・未実機確認） |
| notifications/digest | POST | 秘密値（定数時間比較） | なし | メール | |
| newsletter/confirm | GET/POST | 署名付き・期限あり | なし | なし | 自前の CSP（GETは画面だけ、POSTで確定） |
| notifications/unsubscribe | GET/POST | 署名付き | なし | なし | 自前の CSP |
| saved-searches・[id] | GET/POST/PATCH/DELETE | Bearer・本人 | 作成のみ ○ | D1 | |
| strategy-chat | POST | Bearer（鍵がある時） | ○（今回） | Gemini | 429・内蔵推論へ退避 |
| submissions | POST | 公開（ログイン時は本人） | ○（未ログイン時のみ） | D1 | |
| user/me | GET/DELETE | Bearer・本人 | なし | Stripe 読取 | |
| verification・verification/list | GET | 公開 | なし | なし | |
| verification/stripe | GET/POST | Bearer | ○ | Stripe | 鍵は保存せず、サイトの所有確認あり |
| webhooks/stripe | POST | 署名検証（`constructEventAsync`） | なし | D1 | イベント ID で重複を無視 |

エラー応答の内部漏れ: 修正前は strategy-chat・views/rebuild にあった。ingest 系は低リスクとして残件に記録。

## 依存（`pnpm audit`）

- 修正前: 26 件（低 4・中 9・高 11・重大 2）。修正後: 26 件のうち 重大 0（低 4・中 9・高 11）。
- 重大は 2 件とも解消（上記の `next` 更新と `proxy-addr` の固定）。
- 高 11 件の残りは、すべて開発・ビルド時の依存（`wrangler`/`miniflare` の undici、`eslint`・`eslint-config-next`・`@opennextjs/*` 内の `brace-expansion`・`braces`・`micromatch`、`next` 内 `postcss` の `source-map-js`）と、`firebase` 内の `@grpc/grpc-js`（Firestore 用。このアプリは Auth のみ使用）。Workers の実行時には入らない。上流の更新待ちとして公開後に追う。

## 確認コマンドと結果（すべて `Make-Money-launch` で実行）

- `pnpm exec vitest run src/lib/security src/app/api/strategy-chat src/app/api/checkout src/app/api/idea-research src/lib/strategy src/lib/payments src/lib/company-access/public-entity --testTimeout=60000` → 12 ファイル・204 件 合格
- `pnpm exec vitest run src/lib/company-access --testTimeout=60000` → 14 ファイル・111 件 合格（初回は高負荷でタイムアウト 3 件。時間制限を延ばして全件合格）
- `pnpm exec eslint`（触ったファイル）→ 指摘なし
- `pnpm exec tsc --noEmit`（全体）→ エラーなし
- `node scripts/architecture/check-api-input.mjs` → 合格
- `pnpm audit --json` → 重大 0・高 11（上記）
- 未実施: `pnpm build`（禁止）、ブラウザ確認、`pnpm test` 全体。
