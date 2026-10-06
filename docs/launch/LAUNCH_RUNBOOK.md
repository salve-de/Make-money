# 公開手順書と公開前チェック表

作成: 2026-10-06。この文書は「何をどの順で押せば公開できるか」「公開後に戻す手順」「公開前チェック表」の3つをまとめる。細部は同じ `docs/launch/` の各文書に任せ、ここは順番と判定だけを書く。

優先順位は、オーナーの最新の発言（台帳）> 変更申請 #128 の `docs/OWNER_QUESTIONS_AND_ACCEPTANCE_20261004.md` > `docs/OWNER_INTENT.md`（9/30版）。

この作業（公開周辺の準備）は、公開・本番反映・R2 書き込み・課金・本番設定の変更を一切していない。以下の手順の実行は、すべて公開する人（オーナーの許可を得た人）が行う。

## 1. 公開する内容の合格基準（事例の中身）

#128 で決まった基準。1つでも破れていれば公開しない。

- 根拠のない内容を埋めない。薄い事例は保留（保存したまま画面に出さない）。
- 事実のふりをした推論、捏造した発言、出典のない数字、仮置き費用による手残り: **0 件**。
- 出典が eBiz Facts だけの事例は、一次情報へ付け替えるまで出さない。
- 非公開の情報（private メタデータ、権利ゲートで止めた事例の本文・画像）が、公開 API・画面・サイトマップ・ビルド成果物に出ない。
- 根拠のある推定だけを、薄灰色の「推定」で示す。「推測確度 低/中/高」は表示しない。

**公開前の報告項目（必須）**: 「何件公開できるか」「何件が保留で、その理由の内訳」。数字は `data/catalog-release.json` と `data/case-display.json` から出す（手順は 4 章）。

## 2. 公開前に決めること・用意すること

| 項目 | 内容 | 誰が |
|---|---|---|
| 公開件数 | 2026-10-06 の決定: 公開対象は、新基準の通し（収集から品質確認まで）を通った事例だけ（まず10件）。main の公開目録 323 件は仕様に届いていないため公開対象にしない。`data/catalog-finished-ids.txt` には通し済みの案件IDだけを入れる（一覧は指揮チャットから受け取る。受け取るまでこのファイルは変更しない）。絞る場所はここだけ（`AUTOPILOT_OPERATIONS.md` 4章） | 指揮チャットと事例担当 |
| 本番ドメイン | 決まったら、ビルド前に `NEXT_PUBLIC_SITE_URL`（例 `https://example.jp`、オリジンのみ）を設定。ビルド時に埋め込まれる。未設定だと sitemap・OG が localhost を指す | 公開する人 |
| 運営者情報 | Worker の変数 `LEGAL_OPERATOR_NAME`、`LEGAL_REPRESENTATIVE`、`LEGAL_EMAIL`（任意で `LEGAL_ADDRESS`、`LEGAL_PHONE`）。未設定だと特商法は「準備中」、問い合わせは運用者向けの文になる | オーナー |
| 法務確認 | 規約・プライバシー・特商法は「ドラフト（要法務確認）」表示付き。`LEGAL_REVIEW_CHECKLIST.md` の論点を弁護士に確認し、確認後に `LegalPage` の `draft` 表示を外す | オーナー（法務判断） |
| 秘密情報（Worker の Secret） | `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`GEMINI_API_KEY`（生成AI）、`RESEND_API_KEY`、`NOTIFY_FROM_EMAIL`、`NOTIFY_CRON_SECRET`、`FOUNDATION_INGEST_TOKEN`。値は Git に入れない（`wrangler secret put <名前>`） | 公開する人 |
| 公開の Firebase 設定 | `NEXT_PUBLIC_FIREBASE_*`（`deploy:preflight` が検査する）。許可ドメインに本番ドメインを追加（Firebase コンソール） | 公開する人 |
| Stripe | 本番の Webhook エンドポイントを本番URLに登録し、署名鍵を `STRIPE_WEBHOOK_SECRET` に入れる。商品・価格の本番設定 | オーナー（課金設定） |
| アクセス解析 | `NEXT_PUBLIC_CF_ANALYTICS_TOKEN`（Cloudflare Web Analytics のトークン。未設定なら何も読み込まない。同意後のみ読み込む） | 公開する人 |
| 運営者（審査担当）の権限 | マーケット掲載は審査後に表示される。審査 API を使えるのは `users.role='admin'` の人だけ。本番D1で審査担当に admin を付ける操作が要る（オーナーが実施。手順と curl 例は `MARKETPLACE_REVIEW.md`。**付けるまで掲載は1件も公開されない**） | オーナー |
| 新しい migration | 0015（ニュースレターの確認メール方式）、0016（掲載の審査）。`deploy:workers` が本番D1に適用する。0015 は既存の購読者を「確認済み」にしない。0016 は既存の公開行を「審査待ち」に倒す（本番は現在どちらも0行の想定） | 公開する人 |
| 確認メールの送信 | `RESEND_API_KEY` と `NOTIFY_FROM_EMAIL`（Resend で認証したドメイン）と `NOTIFY_UNSUBSCRIBE_SECRET` か `NOTIFY_CRON_SECRET` が無いと、購読の確認メールが送れず、登録は確認待ちのまま配信対象にならない | 公開する人 |
| 死活監視 | 外部の監視サービスに `/api/health`（異常時 503）を登録。方法は `MONITORING.md` | 公開する人 |

### 2-2. 公開の直前にオーナーが行うことの一覧

1. 法務: 弁護士に `LEGAL_REVIEW_CHECKLIST.md` を確認してもらい、規約・プライバシー・特商法のドラフト表示を外す。
2. 運営者情報（`LEGAL_*`）と、本番ドメイン（`NEXT_PUBLIC_SITE_URL`）を決めて設定する。
3. Firebase: Web API キーに HTTP リファラー制限（Google Cloud コンソール）、許可ドメインに本番ドメインを追加。匿名ログインが有効か確認。
4. Cloudflare: 取り込み用・ダイジェスト用エンドポイントへのレート制限ルール。Web Analytics のトークン（任意）。
5. Stripe: 本番の Webhook 登録と署名鍵、商品・価格の本番設定。
6. Resend: 送信ドメインの認証。
7. 審査担当に admin 権限を付ける（上の表）。
8. 実ブラウザで確認: Google ログインのポップアップ、Stripe 画面への移動、事例画像、ビルダーのプレビュー、購読の確認メールのリンク、同意バー（スマホ幅も）。
9. 外部の死活監視に `/api/health` を登録。

## 3. 公開の手順（この順で）

前提: ローカルの `main` が最新で、変更申請の自動テストがすべて通っている。

1. **公開版を検査**（書き込みなし）: `pnpm catalog:check`、`pnpm catalog:screen-check`。
2. **件数と保留の内訳を確認**（4章）。オーナーの意図した件数と一致すること。
3. **環境の確認**: 2章の変数・Secret が入っていること。`pnpm deploy:preflight`（Firebase 公開設定・wrangler の本番識別を検査）が通ること。
4. **D1 の未適用 migration を確認**（読み取り）: `pnpm exec wrangler d1 migrations list APP_DB --remote`。`deploy:workers` は migration も本番に適用するので、内容を確認してから進む。
5. **バックアップを先に1回取る**: `BACKUP_AND_RESTORE.md` 3章の手順（D1 のエクスポート）。取れていなければ進まない。
6. **公開の実行**: `pnpm deploy:workers`。中身は「preflight → D1 migration → 公開版を R2 へ create-only 保存して読み戻し → Workers ビルド → deploy」。公開版の R2 保存がデプロイより先でなければならない（逆だと目録を読めず画面が出ない）。
7. **本番で確認**（5章のチェック表の「公開直後」）。
8. 問題があれば 6 章の戻し方へ。

定期実行（収集の自動運転、通知メール）は、公開と同時に有効にしない。有効化の条件は `AUTOPILOT_OPERATIONS.md` 6章。

## 4. 件数と保留の理由の出し方

```bash
node -e "const r=require('./data/catalog-release.json');console.log('公開',Object.keys(r.details).length,'元',r.sourceCount)"
node -e "const d=require('./data/case-display.json');const c={};for(const v of Object.values(d)){c[v.display]=(c[v.display]||0)+1}console.log(c)"
```

実測（2026-10-06、この作業フォルダの main）: 公開 323 件（元 3,341 件）。`case-display.json` は 3,312 件で、SHOW 323 / HOLD_QUEUE 1,611（順番待ち）/ HOLD_RESOURCE 748（eBiz のみ出典）/ HOLD_UNVERIFIED 424 / HOLD_THIN 200 / HOLD_SCHEMA 6。報告は「公開 N 件、保留 M 件（内訳: …）」の形にする。台帳の「20件だけ表示」とは別の数字なので、公開対象は通し済みの事例だけ（2章）。

## 5. 公開前チェック表

状態: 確認済み＝実際にコマンド・画面で確かめた。未確認＝書いただけ／まだ動かしていない。

| # | 項目 | 確認方法 | 状態 |
|---|---|---|---|
| A. 事例の中身 | | | |
| A1 | `catalog-finished-ids.txt` が通し済みの案件IDだけで、公開目録の件数と一致 | 4章 | 確認済み（2026-10-06）。新基準の通し済み10件＝公開目録10件で一致。引き継ぎ315件は公開対象から外した（削除ではない。一覧は `data/catalog-withdrawn-20261006.txt`）。保留は計3,315件。10件の最終監査は、手元専用の証拠（`data/source-cache`、`data/media-staging`。コミットしない）が必要 |
| A2 | 捏造・出典なし数字・仮置き手残りが0件 | 抜き取り監査（`OWNER_INTENT.md` 4章、#128 V03/V05）。事例担当の領域 | 未確認 |
| A3 | eBiz のみ出典の事例が画面・API・sitemap に出ない | `e2e/catalog-only.spec.ts`、sitemap の ID が公開目録のみ | 未確認 |
| A4 | 実在の事例を本番で開き、画像・出典・推定表示を目で確認 | 公開直後 | 未確認 |
| B. 法務 | | | |
| B1 | 利用規約・プライバシー・特商法・問い合わせが表示される | `e2e/launch-smoke.spec.ts` | 確認済み（2026-10-06 e2e 通過） |
| B2 | 法務の弁護士確認が済み、ドラフト表示を外した | `LEGAL_REVIEW_CHECKLIST.md` | 未確認（要法務確認） |
| B3 | `LEGAL_*` の運営者情報を本番に設定 | 本番の `/legal/tokushoho` に「準備中」が出ない | 未確認 |
| B4 | 同意バー: 選択前は解析を読み込まない／選択後に反映 | 単体テスト（18件通過）。実画面は未確認 | 一部確認 |
| C. 検索・共有・障害画面 | | | |
| C1 | `NEXT_PUBLIC_SITE_URL` を設定してビルド | sitemap・OG が本番ドメイン | 未確認 |
| C2 | robots.txt と sitemap.xml が返る。個人ページは noindex | `e2e/site-status.spec.ts` | 確認済み（e2e 通過） |
| C3 | 404・障害・メンテナンス画面が日本語で出る | 同上、`src/proxy.test.ts` | 404・メンテナンス画面は確認済み（e2e）。500・障害画面とメンテナンス切替の実機は未確認 |
| C4 | 共有画像（OG）が出る | 同上。日本語文字は未対応（英数字のみ） | PNG が返ることは確認済み（e2e）。見た目は未確認 |
| D. 安全性 | | | |
| D1 | 公開 API・バンドルに private メタデータ・保留事例が出ない | `SECURITY_REVIEW.md` | 事例詳細の内部情報の漏れ1件を修正（許可リスト方式、テスト通過）。ビルド後のバンドル走査は `check-paid-bundle` 通過、成果物内の秘密文字列走査は未実施 |
| D2 | セキュリティヘッダー（CSP 等）で Google ログイン・決済が壊れない | 本番相当の実画面でログインと決済の流れ | 未確認 |
| D3 | 費用が発生する API（生成AI・メール・決済）の認証とレート制限 | `SECURITY_REVIEW.md` | 生成AI・決済に上限を追加（テスト通過）。取り込み・ダイジェストのトークン総当たり対策は Cloudflare 側の設定が必要（未実施） |
| D4 | 依存の脆弱性（high/critical）の対処 | `pnpm audit` | 重大2件を解消（next 16.3.6、proxy-addr）。本番依存の高8件が残る（2026-10-06 実測）: undici・brace-expansion・source-map-js は wrangler／@opennextjs のビルド・開発側、@grpc/grpc-js は firebase の依存。公開前に依存の更新を検討（未実施） |
| D5 | 秘密文字列がリポジトリに無い | grep | 確認済み（走査で未検出。`SECURITY_REVIEW.md`） |
| E. 品質 | | | |
| E1 | lint・型検査・単体テスト・ビルド・E2E がすべて通る | CI（`quality.yml`） | ローカルで確認済み（2026-10-06）: lint、型検査、ビルド、e2e 84件、`pnpm test` 通過。GitHub の CI は変更申請 #141 で実行 |
| E2 | 主要画面のアクセシビリティ確認 | `QUALITY_GATES.md` | 未確認 |
| E3 | 表示速度（初回表示のデータ量） | `QUALITY_GATES.md` | 未確認 |
| F. 運用 | | | |
| F1 | `/api/health` が 200 を返す | 本番で確認 | e2e で応答の形は確認済み。本番は未確認 |
| F2 | 外部の死活監視に登録 | `MONITORING.md` | 未実施 |
| F3 | 公開直前に D1 のバックアップを取り、読み戻した | `BACKUP_AND_RESTORE.md` | 未実施 |
| F4 | 復元の演習を1回実施 | 同上 | 未実施 |
| F5 | 収集の鮮度確認が動く（R2 の最新 journal・公開版の一致） | `scripts/ops/check-freshness.mjs` | 鍵なしで失敗することだけ確認 |
| F6 | 定期実行は無効のまま | GitHub Actions・cron の設定 | 確認済み（この作業では有効化していない） |

## 6. 公開後に戻す手順

- **誤情報・権利の指摘で事例を引っ込める（最優先）**: 該当 ID を `data/catalog-finished-ids.txt` から外し、`pnpm catalog:prepare` → `pnpm deploy:workers`。門が1つなので、一覧・詳細・API・sitemap・通知から同時に消える。
- **公開版全体を前の版へ戻す**: 前の `data/catalog-release.json` と `data/catalog-finished-ids.txt` に戻す変更を作って main に入れ、`pnpm deploy:workers`。古い版のオブジェクトは R2 に残っている。履歴の書き換え（`git reset`・強制 push）はしない。
- **メンテナンス表示にする**: `MAINTENANCE_MODE.md`（`src/proxy.ts` への差し込み案。まだ入れていない）。
- **データ破損**: `BACKUP_AND_RESTORE.md` 4章（D1 Time Travel、独立コピーからの復元）。D1 の migration は戻せない前提。
- Workers のバージョンを直接戻す `wrangler rollback` は、OpenNext との相性を**確認していない**。使う前に公式文書で確認する。

## 7. この作業で入れていないもの（公開前に残る作業）

- ニュースレターの確認メール方式と、マーケット掲載の審査後表示は実装済み（2026-10-06 オーナー決定。本番D1適用・実メール送信・実ブラウザ確認は未実施）。審査画面・公開中の掲載の取り下げ API・審査待ち通知は未作成（取り下げは当面 D1 の直接操作）。
- **公開する人の設定**: Firebase の Web API キーの HTTP リファラー制限、Cloudflare のレート制限ルール、CSP の実ブラウザ確認（Google ログインのポップアップ・Stripe 画面への移動・事例画像・ビルダーのプレビュー）。
- 事例ごとのタイトル・説明・noindex（`src/app/page.tsx` に `generateMetadata` が必要。部品 `entityMetadata()` は用意済み。画面担当の領域）。
- 共有画像の日本語化（日本語フォントの同梱が必要）。
- 退会の画面（API だけある。規約は「メールで依頼」と書いてある）。
