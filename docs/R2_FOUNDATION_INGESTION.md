# Foundation R2取り込み

このプロジェクトの新規調査データは、Make-Money専用の保管庫ではなく、Universal Foundationの共通データとして保存する。

```text
証拠原文（権利が許す場合） -> foundation-raw / foundation-restricted
調査bundle・会社・主張・利益・コスト・MoneySignal -> foundation-lake
```

旧 `universal` には新規データを書かない。

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

## 動作条件

- `write_authorized` が `true` であること。
- `FOUNDATION_INGEST_TOKEN` がサーバー側に設定されていること。
- R2のアカウントID・Access Key・Secret Access Keyがサーバー側に設定されていること。
- 対象バケットが事前に作成済みであること。
- 既存キーは上書きしない。同じ内容は重複扱い、違う内容は衝突として停止する。
- R2未設定時にモック成功を返さない。

## 対象バケット環境変数

```text
FOUNDATION_R2_RAW_BUCKET=foundation-raw
FOUNDATION_R2_LAKE_BUCKET=foundation-lake
FOUNDATION_R2_RESTRICTED_BUCKET=foundation-restricted
FOUNDATION_R2_PUBLIC_BUCKET=foundation-public
```

秘密情報は `.env.example` に値を入れず、実行環境のSecretとして設定する。
