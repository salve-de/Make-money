# 公開前の品質の門（アクセシビリティ・e2e・CI・表示速度）

作成: 2026-10-06。ここに書く「実行済み」は、この作業フォルダで実際に動かした結果がある事だけ。それ以外は「未実行」「未確認」。`pnpm build` は他の作業と衝突するため実行していない（実行は親が行う）。

## 0. 先に結論

- 公開前に**親が実行して結果を見る**もの: `pnpm test:e2e`（追加した `e2e/launch-smoke.spec.ts` を含む）、`pnpm lint`、`pnpm typecheck`、`pnpm test`。この作業では eslint（触ったファイル）と vitest（ops 配下）しか完走していない。
- アクセシビリティの自動検査ツール（axe-core、`@axe-core/playwright`、lighthouse、pa11y）は**この作業フォルダの依存に入っていない**ので、追加せず、手順（2 章）で代替する。
- CI の不足は 4 章に提案として書いた。workflow ファイルは編集していない。
- 表示速度は設計上の指摘だけ（5 章）。ビルド結果が無く、測っていない。

## 1. 実行した確認（この作業の範囲）

| コマンド | 結果 |
|---|---|
| `pnpm exec vitest run src/lib/ops src/app/api/health` | 成功（19件） |
| `pnpm exec eslint`（触った ts/tsx、e2e/launch-smoke.spec.ts） | 指摘なし |
| `node --test scripts/ops/check-freshness.test.mjs` | 成功（5件） |
| `node scripts/ops/check-freshness.mjs`（鍵なし） | 「確認できない」・終了コード 2（想定どおり） |
| `pnpm test:recovery` | 成功（`BACKUP_AND_RESTORE.md` 1 章） |
| `pnpm exec tsc --noEmit` | **未完了**。高負荷で長時間かかり、強制終了（SIGTERM）された。型検査の結果は無い。親が `pnpm typecheck` を実行すること |
| `pnpm exec playwright test e2e/launch-smoke.spec.ts` | **未実行**（ビルドが要る。親が実行） |
| `pnpm build` | 禁止のため未実行 |

## 2. アクセシビリティ（a11y）の確認手順

### 2-1. 現状（確認済み）

- `@axe-core/playwright`、`axe-core`、`lighthouse`、`pa11y` は `node_modules` にも `devDependencies` にも無い。**追加していない**。
- 既存 e2e は、役割（`getByRole`）・名前で要素を探している箇所が多く、見出し・ボタン・ダイアログの名前が取れること自体は暗黙に確認されている。ただし、色のコントラスト・キーボード操作・フォーカス・スクリーンリーダーの読み上げは、自動では見ていない。

### 2-2. 公開前に手でやる手順（15〜20分）

対象ページ: `/`（一覧）、`/?entity=<公開事例のID>`（詳細）、`/compare`、`/alerts`、`/legal/terms`、`/legal/privacy`、ログイン画面（ダイアログ）、同意バナー（表示時）。

1. **キーボードだけで操作**: マウスを使わず Tab / Shift+Tab / Enter / Space / Esc で、一覧 → 事例を開く → 閉じる → 検索 → ログインダイアログを開く → Esc で閉じる、まで行えるか。
   - フォーカスの枠が常に見えること。
   - ダイアログを開くとフォーカスが中に入り、Esc で閉じて元の場所に戻ること。
   - 同意バナーが出ている間も、本文を読み進められること（隠れて押せない物が無いこと）。
2. **見出し構造**: 各ページに h1 が1つ、見出しが飛ばない（h1 → h2 → h3）。`e2e/launch-smoke.spec.ts` は規約4ページの h1 と事例詳細の h2 だけ確認する。
3. **文字の大きさ**: ブラウザの文字サイズを 200% / ズーム 200% にして、文字が重ならず、横スクロールが必要な箇所が表以外に無いこと。スマホ幅（375px）でも同様。
4. **色の対比**: ブラウザ開発者ツール（Chrome の「要素の検査」→ 色の対比表示）で、本文・注記・無効なボタン・表のヘッダーを確認（本文は 4.5:1 以上が目安）。「AIっぽい色」を避ける方針（`docs/design/TERMINAL_UI.md`）とは別に、読めることを優先する。
5. **画像の代替テキスト**: 事例の画像（アイコン・製品画面）に `alt` があること。装飾だけの画像は空の `alt`。
6. **スクリーンリーダー**: macOS の VoiceOver（Cmd+F5）で、トップ → 事例詳細を上から読み上げ、ボタンの名前・表の見出しが意味の通る日本語で読まれること。
7. **動き**: macOS の「視差効果を減らす」を有効にして、画面が大きく動く演出が止まること（`prefers-reduced-motion`）。**未確認**: 実装が対応しているか。

結果は、ページ名・見つけた問題・直すかどうかを1行ずつ記録する（書き場所は親の判断）。

### 2-3. 自動検査を入れる場合の提案（依存の追加はオーナー判断）

- `@axe-core/playwright` を devDependency に追加し、`e2e/a11y.spec.ts` を作って上記ページに `new AxeBuilder({ page }).analyze()` を当て、`serious` と `critical` が 0 であることを検査する。まずは警告のみ（失敗させない）で始め、既存の指摘を整理してから失敗扱いにする。
- 追加は lockfile を変えるので、この作業では行わない。

## 3. e2e（Playwright）の現状と欠け

実行環境: `playwright.config.ts`（ポート 3100、standalone サーバー）。D1 は無い。CI では `catalog:prepare --artifacts-only` → `pnpm build` → `pnpm test:e2e`。

### 3-1. 既存の e2e（ファイル名から見た守備範囲）

| ファイル | 主な守備範囲 |
|---|---|
| `catalog-only.spec.ts` | 公開目録に無い事例は一覧・詳細・API に出ない |
| `honest-catalog.spec.ts` | 目録の正直さ（推定・未確認の表示など） |
| `company-inspector.spec.ts`、`restored-inspector.spec.ts`、`plain-japanese-inspection.spec.ts`、`inspector-actions.ts` | 事例の詳細画面と操作 |
| `navigation.spec.ts` | 画面遷移 |
| `discover.spec.ts`、`pr20-filter-regressions.spec.ts` | 検索・絞り込み |
| `media-gallery.spec.ts` | 画像 |
| `partners-hydration.spec.ts` | 画面の初期描画 |
| `audit-regressions.spec.ts`、`foundation-structured-observation.spec.ts`、`first-dollar-execution.spec.ts` | 監査の回帰、構造化された観測、実行ガイド |
| `site-status.spec.ts`（別担当） | 404、robots、sitemap、メンテナンスモード |
| `reader-fixture.ts` | 共通の読み込み補助 |

### 3-2. 欠けていた経路と、`e2e/launch-smoke.spec.ts` で補ったもの

| 経路 | 既存 | launch-smoke |
|---|---|---|
| トップ表示と画面エラー無し | 部分的 | 追加 |
| 事例詳細を直接開く（`?entity=`、公開目録の先頭から動的に選択） | 一部 | 追加 |
| 検索（絞り込み・該当なし） | あり | 追加（重複するが名前の決め打ちをしない） |
| 比較（`/compare`。IDなし・公開ID・公開外ID） | 薄い | 追加 |
| 未ログインの `/alerts` からログイン画面を開く・閉じる | 無し | 追加 |
| 規約4ページ（terms / privacy / tokushoho / contact） | 無し | 追加 |
| 404（画面と API） | `site-status` | 追加（重複） |
| `/api/health`（認証不要・no-store・内部情報なし） | 無し | 追加 |

実行は親が行う: `pnpm exec playwright test e2e/launch-smoke.spec.ts`（ビルド済みのスタンドアロンが要る）。**未実行**のため、アサーションが実画面と合うかは未確認。失敗したら、画面側ではなく先にテストの前提（見出しの階層、プレースホルダーの文言）を疑う。

### 3-3. まだ欠けている経路（この作業では追加しない）

- **ログイン後の経路**（保存条件の作成・メール受信の設定・退会）: Firebase と D1 が必要。ローカル e2e で再現できない。本番相当（ステージング）で手動確認。
- **決済**（Checkout → Webhook → 権限反映、解約、返金）: Stripe の**テストモード**で手動確認する。実課金は禁止。Webhook は `stripe listen` で転送して確認（`MONITORING.md` 2 章）。
- **同意バナー**（初回表示、同意・拒否、取り消し、再訪）: 別担当の実装。`src/lib/ops/analytics.test.ts` で同意ストアとの連動は単体確認済みだが、画面での操作は未確認。
- **スマホ幅**での主要経路（一覧・詳細・比較）。
- **メンテナンスモード中**の画面（`site-status.spec.ts` が持つ範囲外は未確認）。
- **共有リンク**（`?entity=` を SNS などに貼った時の表示、og 画像）: 別担当の領域。

## 4. CI（`.github/workflows/quality.yml`）の不足と提案

現状（読んで確認）: `lint`、`typecheck`、`unit test`、`build` を並列で実行。`E2E smoke` ジョブは `catalog:prepare --artifacts-only` → `pnpm build` → `pnpm test:e2e`。失敗時に `playwright-failure` を保存。`pnpm install --frozen-lockfile` を使用。同じ ref の古い実行は取り消す。

提案（優先順。**workflow は編集していない**。実施はオーナー判断）:

1. **`pnpm catalog:check` をジョブに追加**: 公開版が作れること・仕上げ済み一覧と公開版が食い違わないことを、マージ前に落とす。書き込みなしの検査（`AUTOPILOT_OPERATIONS.md` 3 章）。
2. **依存の脆弱性検査**: `pnpm audit --prod --audit-level=high` を、まずは `continue-on-error: true`（警告）で。レポートを見て、閾値を決めてから失敗扱いにする。
3. **a11y ジョブ**: 2-3 の axe 追加後に、まずは警告のみで。
4. **Playwright のブラウザキャッシュ**: `~/.cache/ms-playwright` を `actions/cache` で保存し、`playwright install` の時間を減らす。
5. **e2e に `launch-smoke` を含める**: 既存の `pnpm test:e2e` が全ファイルを実行するので、追加の設定は不要。
6. **バンドルサイズの記録**: `next build` の出力（ルートごとの First Load JS）をジョブのログかアーティファクトに残し、増加に気づけるようにする。
7. **`scripts/ops/check-freshness.test.mjs` を `test` に登録**: `package.json` の `test` / `test:architecture` にまだ入っていない（この作業では `package.json` を編集できない）。親が追加するか、`test:foundation` の対象に移す。
8. **通知メールのジョブ（`notify-digest.yml`）が、Secret・変数の未設定でも成功で終わる穴**: 未設定なら失敗にするか、警告を出す（`MONITORING.md` 6 章）。
9. **デプロイ前の確認ジョブ**（手動実行）: `deploy:preflight` と `catalog:check` を本番に触れず実行し、結果を見てから `deploy:workers` する。

## 5. 表示速度の指摘（ページは触らない・測っていない）

ビルド結果（`.next`）が無く、`pnpm build` も禁止だったため、数値は無い。コードを読んだ範囲の指摘:

1. **クライアントに入る公開目録の台帳**: `useCatalogEntities.ts` / `useSelectedEntityNavigation.ts` が `src/shared/catalog-membership.ts` を読み込み、`data/catalog-release.json`（約33KB、323件のハッシュ）が**ブラウザ用の JS に入る**。公開件数が増えるほど JS が大きくなる。件数が数千になるなら、サーバーで判定して結果だけ返す形を検討。
2. **未使用かもしれない大きな依存**: `echarts`、`lightweight-charts`、`@xyflow/react` が `src` から import されていない可能性がある（grep による確認。ビルドで確かめていない）。本当に未使用なら `package.json` から外すと、インストールとビルドが軽くなる（バンドルには入らないが、CI 時間と保守に効く）。
3. **トップの初期表示**: 一覧は `initialEntities=[]` で始まり、`/api/catalog` を後から読む。初回描画では空の表が見え、取得後に埋まる。サーバーで先頭の一定件数を埋め込むと、表示の体感が速くなる（ただし「自然な初期表示」の方針とレイアウトのずれに注意）。
4. **`/api/catalog` のキャッシュ**: `private, max-age=30`、1ページ100件。公開版が頻繁に変わらないなら、公開版のハッシュをキーにした共有キャッシュ（`public` + `s-maxage` + ETag）にすると、Workers の実行回数と応答時間が減る。ただし、公開版を差し替えた時の反映遅れとの兼ね合い。
5. **巨大な見本データ**: `mockLedgerData` 系は、lint の `findPaidClientImports` でクライアントへの到達が禁止されているため、現状は問題無い。ルールを緩めないこと。
6. **画像**: 事例の画像は `/api/media` 経由。`width`/`height` 指定、`loading="lazy"`、サムネイルの大きさ（方針は「小サムネ」）、`Cache-Control` を、実機で Lighthouse（ブラウザの開発者ツール）または PageSpeed Insights で確認する。**未確認**。
7. **測り方（公開前にやる）**: ビルド後に Chrome の Lighthouse（モバイル、シークレットウィンドウ）をトップと詳細で各3回実行し、LCP・INP・CLS の中央値を記録。目安は LCP 2.5秒以内、INP 200ms 以内、CLS 0.1 以内。本番では Cloudflare Web Analytics（同意後のみ）で実測する（`MONITORING.md` 7 章）。

## 6. 公開前の門（まとめ）

公開してよい条件の案（満たさない場合は公開しない）:

- [ ] `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` が成功（親が実行）
- [ ] `pnpm test:e2e` が成功（`launch-smoke.spec.ts` を含む）
- [ ] 2-2 の手順でキーボード操作と文字拡大を確認し、重大な問題が無い
- [ ] Stripe テストモードで購入 → 権限反映 → 解約を確認
- [ ] `/api/health` が本番で 200、外部監視の通知が届く（`MONITORING.md` 8 章）
- [ ] D1 のバックアップを1回取り、取れたことを確認（`BACKUP_AND_RESTORE.md` 3 章）
- [ ] 本番の `release` が手元の公開版と一致（`check-freshness.mjs --site-url`）
- [ ] 公開事例を3件ほど実際に開き、強い一行・事実と推論の区別・画像・作業の言葉が出ていないことを目で確認
