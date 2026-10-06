# 検索・共有の表示（付けたもの・確認方法）

## 公開前に必ずやること
- ビルド前に環境変数 `NEXT_PUBLIC_SITE_URL`（例 `https://<本番ドメイン>`）を設定する。ビルド時に埋め込まれるので、設定後に再ビルドする。未設定だと canonical・OG・sitemap・robots が `http://localhost:3000` を指す。
- 本番ドメインはコードに書いていない（`src/lib/site/url.ts`）。

## 付けたもの
| もの | 場所 |
|---|---|
| 基準URL | `src/lib/site/url.ts` |
| メタデータの部品（pageMetadata / noIndexMetadata / entityMetadata） | `src/lib/site/metadata.ts` |
| robots.txt | `src/app/robots.ts`（API・作業画面・個人ページ・メンテナンスを拒否、sitemap を指す） |
| sitemap.xml | `src/app/sitemap.ts` ＋ `src/lib/site/sitemap-entries.ts`（固定ページ＋公開目録の事例。R2・外部通信なし。5万URL上限で切る） |
| 共通の共有画像 | `src/app/opengraph-image.tsx`（欧文のみ。理由は下） |
| 404 / 500 / 最終砦 / メンテナンス | `src/app/not-found.tsx` `error.tsx` `global-error.tsx` `maintenance/page.tsx`、共通部品 `src/lib/site/StatusScreen.tsx` |
| サイト全体の構造化データ | `src/lib/site/json-ld.tsx`（WebSite のみ。評価・価格は付けない） |
| ルート別のメタデータ | 各ルート階層の `layout.tsx` |

ルート別:
- 検索に出す（canonical・OG・Twitter付き）: `/discover` `/welcome`
- 検索に出す（canonical なし。子の階層が継承してしまうため）: `/marketplace` 配下の説明、`/legal` 配下の説明
- noindex: `/alerts` `/execute` `/build` `/verify` `/success` `/compare` `/marketplace/new`（`/marketplace/businesses/new` と `mine` は既存の page.tsx が noindex 済み）
- 既存の page.tsx に title がある所は、page 側が優先される。

## 統合が必要な点（担当外のファイルのため未実施）
1. **ルート layout.tsx**: `metadataBase` の設定、`<SiteJsonLd />`（`src/lib/site/json-ld.tsx`）を `<body>` 内に追加。ルートの metadata に canonical は付けない（`/?entity=` の事例URLを子として継承してしまう）。
2. **トップ `/`（`src/app/page.tsx`）**: 事例の詳細は `/?entity=<id>` で、layout は searchParams を読めないため、事例ごとのタイトル・説明は page.tsx に `generateMetadata` を足す必要がある。部品 `entityMetadata()` は用意済み。公開目録の事例（`findCachedPublishableEntity`）だけ渡し、目録に無い・読めない時は `null` を渡す（名前を出さず noindex になる）。
3. **メンテナンスモード**: `docs/launch/MAINTENANCE_MODE.md` の差し込み案を `src/proxy.ts` へ。

## 共有画像が欧文だけの理由
同梱の書体は欧文のみ。日本語を描くには日本語フォント（OFL の Noto Sans JP の部分集合など）を取得して同梱する必要があり、ダウンロードにあたるため未実施。必要なら承認後に追加する。事例ごとの共有画像は、第三者画像を使わない方針のため作らず、共通画像を使う。

## 確認方法
- `pnpm exec vitest run src/lib/site`（robots・sitemap・メタデータ・構造化データ）
- e2e: `e2e/site-status.spec.ts`（404 が日本語、robots.txt・sitemap.xml が返る、個人ページ noindex、共有画像が PNG、メンテナンス画面）
- 公開後: Search Console に sitemap.xml を登録、共有デバッガー（X・Facebook・LINE）でトップと /discover を確認。
