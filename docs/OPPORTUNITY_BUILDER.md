# Opportunity Builder MVP

## Purpose

Make-Moneyの機会データを「読んで終わり」にせず、独自アイデアからそのまま動くMVPへ変換するための生成レイヤー。

現行MVPの流れ:

```
SYNTHESIS / 独自アイデア
  -> この事業を作る
  -> Build Spec
  -> Make-Money Builder
  -> v0 Platform API
  -> private preview proxy
  -> 同じ画面で追加修正
```

## Responsibility boundary

### Make-Moneyが持つ

- 機会データ、ユーザーの独自アイデア
- Build Spec
- Builder UI
- ユーザーとprovider chatの所有者対応
- providerの生成credits実績
- private previewへの認可
- ユーザー退会時のBuilderメタデータ削除

### v0に任せる

- ソースコード生成
- 生成中の実行環境
- private preview
- 同じchatへの追加生成

v0は交換可能な実行providerとして扱う。機会データ・Build Spec・ユーザー関係をprovider側へ固定しない。

## Cost boundary

- Make-Moneyが `V0_API_KEY` をserver-side secretとして持ち、生成時のprovider creditsを一旦負担する。
- `build_sessions.credits_cost` にAPIが返した実消費creditsを累積する。
- `BUILDER_DAILY_CREDIT_LIMIT` で1ユーザー24時間の実消費creditsに上限をかける。未設定時は5 credits。
- MVP段階ではユーザーへのcredits販売・請求はまだ実装していない。
- 本番Hosting、DB、Domain、AI APIなどの継続費をMake-Moneyが無制限に背負う設計にはしない。公開/claim機能を追加する際にユーザー所有へ分離する。

## Security

- `V0_API_KEY` は `NEXT_PUBLIC_*` に置かない。
- Firebase ID Tokenを検証し、build sessionは `user_id` で必ず所有者スコープする。
- v0 preview tokenをブラウザへ返さない。
- 認証済みユーザーへ短命のHttpOnly preview ticketを発行し、Make-Money serverがpreview tokenを付けてproxyする。
- preview upstreamの `Set-Cookie`、credential、forwarding headersを除去する。
- iframeはsandboxし、生成コードへ親Make-Money画面と同じorigin権限を与えない。
- Builder write APIはbody sizeとrate limitを持つ。
- 生成promptは秘密鍵直書き、架空実績、スパム・なりすまし・規約回避を禁止する。

## D1

Migration:

```bash
pnpm db:migrate:local
pnpm db:migrate:remote
```

New table: `build_sessions`

保存するもの:
- Make-Money user
- source idea
- provider / provider chat id
- Build Spec
- status
- preview ticket secret
- cumulative provider credits
- bounded error message

生成コード本体はD1へ複製しない。

## Provider configuration

Development:

```bash
V0_API_KEY=... BUILDER_DAILY_CREDIT_LIMIT=5 pnpm dev
```

Cloudflare production:

```bash
wrangler secret put V0_API_KEY
```

`.env.example` には値を置かず、変数名だけ記載する。

## Routes

- `GET /api/build/context?ideaId=...` — owned idea + Build Spec + latest session
- `POST /api/build/prepare` — client-only draft ideaを本人のD1へ保存
- `POST /api/build/start` — Build Specから新規v0 chatを生成
- `POST /api/build/message` — 同じ生成物を自然言語で修正
- `POST /api/build/preview-ticket` — private preview用HttpOnly ticket
- `/api/build/preview/[sessionId]/...` — private preview proxy
- `/build/[ideaId]` — Builder workspace

## Explicit non-goals of this MVP

まだ実装していないもの:
- Vercel/Cloudflareへのユーザー所有本番deployment
- GitHub export
- production secret provisioning
- automatic security/build/E2E gate for generated apps
- Build Creditsのユーザー課金
- Marketplace出品
- Stripe Connect seller onboarding / split payment
- SaaS/ソースコード/事業M&Aの販売フロー

これらは「生成できるか」を確認した後の第二段階。MVPでは外部builderへ離脱せず、Make-Money内で生成・preview・修正まで成立させる。
