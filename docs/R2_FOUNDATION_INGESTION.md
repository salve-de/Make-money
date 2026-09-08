# Foundation R2取り込み

このプロジェクトの新規調査データは、Make-Money専用の保管庫ではなく、Universal Foundationの共通データとして保存する。

```text
証拠原文（権利が許す場合） -> foundation-raw / foundation-restricted
調査bundle・会社・主張・利益・コスト・MoneySignal -> foundation-lake
```

旧 `universal` には新規データを書かない。

保存処理は実行環境に応じて自動で経路を選ぶ。

- Cloudflare Workers：`wrangler.jsonc` の4つのR2 bindingを使う。S3キーは不要。
- Node.js（ローカル・別サーバー）：`CLOUDFLARE_R2_*` のS3互換資格情報を使う。

どちらの経路でも、同じ作成専用Put、全件Preflight、保存後の読み戻し検証を通る。

## 保存入口

内部API:

```text
POST /api/foundation/ingest
Header: x-foundation-ingest-token: <FOUNDATION_INGEST_TOKEN>
Content-Type: application/json
```

リクエストは次の形にする。

```json
{
  "write_authorized": true,
  "bundle": {
    "schema_version": "research-bundle.v1",
    "run_id": "run_2026-09-08_example",
    "purpose": "make_money",
    "subject": { "query": "調査対象" },
    "agent": { "name": "research-agent" },
    "retrieved_at": "2026-09-08T00:00:00.000Z",
    "sources": [],
    "evidence": [],
    "entities": [],
    "claims": [],
    "metrics": [],
    "events": [],
    "relationships": [],
    "derived": [],
    "quality": {
      "unknowns": [],
      "conflicts": [],
      "warnings": [],
      "schema_validation": "PASS"
    }
  },
  "raw_evidence": []
}
```

`bundle` はUniversal Foundationの `research-bundle.v1` に適合している必要がある。`raw_evidence` を渡す場合は、Base64の原文と権利状態を指定する。`allowed_private_raw` は `foundation-raw`、`restricted_private_raw` は `foundation-restricted` に保存する。

Make-Money固有の情報は、専用の別形式に閉じ込めない。会社・人物・顧客・競合・プラットフォームは `entities` / `relationships`、誰がいつ何をしたかは `events`、売上・利益・費用・利益率・手取り・価格・MRR・ARR・GMV等は意味と期間を持つ `metrics`、誰から誰へ何のためにいくら動いたかは `money_signals`、その他の説明・未確認情報は `claims` と元の `research-bundle` に保持する。現在のMake-Moneyが使わない追加情報も、bundle内の元データを捨てない。

投入前に内部で `planned-writes.v1` を生成し、全オブジェクトのバケット・キー・SHA-256・サイズ・Content-Type・出典Evidence IDを確定する。全キーを先に確認し、衝突があればPutせず停止する。新規Put後は対象オブジェクトを読み戻してバイト数とSHA-256を確認し、APIレスポンスの `planned_writes`、`provider_calls`、`readback_verified`、`mutation_counts` に記録する。

## 動作条件

- `write_authorized` が `true` であること。
- `FOUNDATION_INGEST_TOKEN` がサーバー側に設定されていること。WorkersではSecretとして設定する。
- Node.js実行ではR2のアカウントID・Access Key・Secret Access Keyがサーバー側に設定されていること。Workers実行では不要で、R2 bindingを使う。
- 対象バケットが事前に作成済みであること。
- 既存キーは上書きしない。同じ内容は重複扱い、違う内容は衝突として停止する。
- 既存キーの中身はSHA-256で比較する。メタデータだけを根拠に同一扱いしない。
- 全オブジェクトを先にPreflightし、衝突があるRunでは一つもPutしない。
- Put後にGetObjectでバイト数とSHA-256を検証する。
- R2未設定時にモック成功を返さない。

## 対象バケット環境変数

```text
FOUNDATION_R2_RAW_BUCKET=foundation-raw
FOUNDATION_R2_LAKE_BUCKET=foundation-lake
FOUNDATION_R2_RESTRICTED_BUCKET=foundation-restricted
FOUNDATION_R2_PUBLIC_BUCKET=foundation-public
```

秘密情報は `.env.example` に値を入れず、実行環境のSecretとして設定する。

## Cloudflare Workersへ配備する場合

次の4バケットをCloudflareアカウント内に一度だけ作成し、対象アカウントへログインした状態で確認する。

```bash
npx wrangler r2 bucket create foundation-raw
npx wrangler r2 bucket create foundation-lake
npx wrangler r2 bucket create foundation-restricted
npx wrangler r2 bucket create foundation-public
npx wrangler r2 bucket list
```

取り込みAPIのトークンはソースへ書かず、次でWorkers Secretへ登録する。

```bash
npx wrangler secret put FOUNDATION_INGEST_TOKEN
```

配備・Workers実行経路の確認は次で行う。

```bash
npm run cf:typegen
npm run preview:workers
npm run deploy:workers
```

`wrangler.jsonc` の `remote: true` は、ローカルのWorkersプレビューでもローカル模擬R2へ誤保存せず、指定した実R2へ接続するための設定である。Cloudflareへログインしていない状態では成功扱いにしない。
