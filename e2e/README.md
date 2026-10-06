# Browser smoke

Run `pnpm exec playwright install chromium` once, then `pnpm build` and `pnpm test:e2e`.
The suite owns a production server on 127.0.0.1:3100 and refuses to reuse an unknown process.

The main smoke uses the existing checked-in Keyence entry through the real home page,
table, selection state, inspector, financial section, evidence section, and close keyboard
action. A second real dossier covers the hazard/loss presentation and dynamic evidence.
These tests assert checked-in content as rendering regression checks; they do not
independently verify the business claims. These two paths do not mock API responses.

Boundary tests intercept the businesses response with malformed Foundation JSON and
with a valid revenue-only company. They verify rejection preserves the core list,
and missing profit remains unknown without a fabricated financial waterfall.
An API test sends only an invalid strategy payload and requires HTTP 400, before
AI generation or database writes. No test routes or production fixture changes are used.
No R2, authentication, database, or payment credentials are needed in CI. Live R2
availability, authenticated billing, and remote data correctness are separate tests.
Failures retain screenshots and traces in test-results/ and playwright-report/.

Note regressions cover plain j/k/J/K outside fields and inside the analyst textarea,
persistence across reload, and continued button-based navigation. Isolated browser
contexts seed malformed note JSON (null, array, broken syntax, and a mixed valid/invalid
map), then verify rendering, exact recovery backup, retained valid notes, and edited
text after reload. No existing user browser storage is accessed.

Navigation coverage also checks ledger search and screener apply/reset, note reload and
company association, Playbook dataset tabs and company links, /macro redirect, and
Finder filtering, financial sheet open/close, and ledger/signals navigation. Browser
storage corruption cases seed only isolated Playwright contexts, preserving real user
browser data. These smoke cases do not prove the accuracy of legacy Finder strategy
estimates or static Playbook claims.

Official product images (`media-gallery.spec.ts`) are checked against the local staging ledger `data/media-staging`
(gitignored; the e2e server is started with `MEDIA_SOURCE=local_staging` and `MEDIA_STAGING_DIR`, see `playwright.config.ts`).
The spec reads what a human approved with `scripts/media/review-assets.ts` and asserts that exactly those images, with their
source text, reach the page and the media API, and that held or blocked images do not. Each test skips itself when nothing is
approved, so CI without that directory stays green. One test answers the media API for a list row with a real approved image
to check the row wiring; that interception is stated in the spec. It writes `test-results/media-gallery-photoai.png`,
`media-gallery-keyence.png` (Keyence is not in the catalog release, so a production build shows the notice, not the inspector)
and `media-list-logo.png`. See docs/MEDIA_ASSETS_AND_PROVENANCE.md, chapter 11.

## 会員導線の通し確認（ローカル専用）

`account-flow.spec.ts` は登録・ログイン・メニュー・会員設定・パスワード再設定・ログアウト・退会（任意で決済→解約）を通す。本物の Firebase・Stripe・D1 にはつながない。CI では環境変数が無いので skip する。

1. 認証エミュレーター：`firebase emulators:start --only auth --project demo-make-money`（ポートは firebase.json で 9139 などに。Java 不要）
2. ローカル D1：`pnpm db:migrate:local`（wrangler のローカル保存先に作る）
3. 決済の偽装（任意）：`STRIPE_MOCK_PORT=12111 STRIPE_MOCK_APP_URL=http://127.0.0.1:3131 node e2e/support/stripe-mock.mjs`
4. 開発サーバー（.env.local の本番設定を上書きする）：
   `NEXT_PUBLIC_FIREBASE_API_KEY=demo-key NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-make-money.firebaseapp.com NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-make-money NEXT_PUBLIC_FIREBASE_APP_ID=demo-app NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9139 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9139 STRIPE_SECRET_KEY=sk_test_local_mock STRIPE_WEBHOOK_SECRET=whsec_local_mock STRIPE_LOCAL_MOCK_HOST=127.0.0.1:12111 PRO_MONTHLY_PRICE_JPY=980 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3131 pnpm exec next dev --webpack -p 3131 -H 127.0.0.1`
5. `ACCOUNT_E2E_BASE_URL=http://127.0.0.1:3131 ACCOUNT_E2E_AUTH_EMULATOR=http://127.0.0.1:9139 ACCOUNT_E2E_STRIPE_MOCK=http://127.0.0.1:12111 pnpm exec playwright test -c e2e/account-flow.config.ts`

エミュレーターと偽装への切替は、`NODE_ENV` が production でなく、宛先が localhost で、プロジェクトが `demo-`・鍵が `sk_test_` のときだけ有効（`src/lib/firebase/emulator.ts`・`src/lib/stripe.ts`、単体テスト `src/lib/firebase/emulator.test.ts`）。画面写真は `test-results/account-flow/` に出る。
