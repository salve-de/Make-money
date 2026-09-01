# Implementation Plan

## 1. Stack

- Next.js App Router
- React / TypeScript
- CSS Modulesではなく、初期は一つのglobal design system
- Supabase PostgreSQL（本番データ、Auth、RLS）
- Vercel（Web、Route Handlers）
- 将来：queue / cron / object storage / search engine

## 2. Repository layout

```text
src/
  app/                 routes and layouts
  components/          reusable UI and client interactions
  lib/                 data, types, formatting, server helpers
supabase/
  migrations/          database schema
public/                 static assets
docs/                   product and operating documents
```

## 3. Demo-first architecture

Supabase環境変数がない状態でも、seed dataとlocalStorageで一通り操作できる。これにより、UI検証・Vercel preview・投資家/利用者へのデモを外部依存なしで行える。

本番では以下を差し替える。

- `src/lib/data.ts` → Supabase repository
- localStorage saves → user_saves table
- Demo submission → submissions table
- Static ranking → calculated materialized view

## 4. API

### POST `/api/submissions`

- JSON validation
- URL normalization
- Supabase configured: `submissions`へpending insert
- Supabase not configured: demo acceptance response

### Future

- POST `/api/reactions`
- POST `/api/claims`
- GET `/api/search`
- GET `/api/feed`
- POST `/api/corrections`

## 5. Security

- Service role keyはserver-only
- Clientへsecretを返さない
- Arbitrary URL fetchは初期APIでは実行しない
- Server-side validation
- Rate limit、CAPTCHA、abuse detectionは本番投稿前に追加
- RLSを有効にする

## 6. Data ingestion pipeline — future

1. Source discovery
2. Fetch according to rights / API terms
3. Raw document retention
4. Entity and money extraction
5. Normalize amount kind and period
6. Human review
7. Publish
8. Recheck schedule
9. Correction and history

## 7. Build and deploy

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

VercelはGitHub mainをProduction、feature branchesをPreviewへ接続する。

## 8. Current limitations

- Seed dataはUI検証用
- Auth未接続
- Saveはbrowser localStorage
- SubmissionはSupabase設定時のみ永続化
- Searchはclient-side dataset
- Rankは説明可能な固定スコアで、学習モデルではない
