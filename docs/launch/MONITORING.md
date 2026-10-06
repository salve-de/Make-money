# 公開後の監視（何を・どこで・どの閾値で見るか）

作成: 2026-10-06。対象: 公開前準備のうち、アクセス解析・障害検知・監視。
状態: **設計と、手元で動くスクリプトまで**。外部の監視サービスの登録、Cloudflare 側の通知設定、定期実行はまだ何もしていない（オーナー確認のうえ別途）。

この文書で「確認済み」と書いたものは、この作業で実際に動かした結果がある。書いていないものは「未確認」。

## 0. 先に結論

| 見るもの | 見る場所 | 状態 |
|---|---|---|
| サイトが生きているか | `GET /api/health`（新設）とトップ `/` | コードとテストまで済み（本番には未反映）。監視サービスへの登録は未 |
| 決済が壊れていないか | Stripe の管理画面（Webhook の配信失敗） | 設計のみ。アプリ側の失敗は 503 で Stripe に再送される（コードで確認） |
| 自動収集が止まっていないか | `scripts/ops/check-freshness.mjs`（新設） | スクリプトとテストまで済み。本番 R2 への実行は未（鍵が必要） |
| 公開版が食い違っていないか | 同上 `--site-url` | 同上 |
| D1 の容量 | `wrangler d1 info`（読み取り） | 未実行 |
| Workers のエラー率 | Cloudflare の Observability（`wrangler.jsonc` に有効化を追加済み。**本番に反映されるのはデプロイした時だけ**） | 未反映 |
| 通知メールの失敗 | GitHub Actions の `Notify digest` | 既存。設定値が無いと「成功」で終わる穴がある（後述） |

## 1. 死活監視

### 1-1. `/api/health`

- 認証なし。キャッシュなし（`Cache-Control: no-store`）。
- 返すのは次の5項目だけ。内部のエラー文・件数・接続先・環境変数は返さない（テストで確認済み）。

```json
{ "status": "ok", "version": "unknown", "release": "de728c9b27c0", "time": "2026-10-06T00:00:00.000Z",
  "checks": { "database": "ok", "catalog": "ok" } }
```

| 項目 | 中身 |
|---|---|
| `status` | `ok` か `down`。どれか1つでも `ng` なら `down` |
| `version` | 環境変数 `APP_VERSION`（無ければ `NEXT_PUBLIC_APP_VERSION`）。安全な文字だけ通し、無ければ `unknown`。今は設定していないので `unknown` |
| `release` | 配備中の公開版（catalog release）の識別子。要約ハッシュの先頭12文字。公開データの印で秘密ではない |
| `checks.database` | D1 に `SELECT 1` が通るか |
| `checks.catalog` | 公開カタログの要約が読めて、件数が公開版の記録（`publishedCount`）と一致するか |

- 各確認の上限は4秒。超えたら `ng`。
- 正常は HTTP 200、異常は **503**。監視サービスは状態コードだけで判定できる。
- 確認済み: 単体テスト（`src/lib/ops/health.test.ts`、`src/app/api/health/route.test.ts`）19件成功。**実際の Workers・本番 D1 では未確認**（デプロイしていない）。
- 注意: `catalog` の確認は、起動直後（コールド）の最初の1回は R2 から公開版を読むため数秒かかり得る。1分ごとに叩けば常に温まっている。上限4秒で `ng` になる場合は、閾値（下表の連続失敗回数）で吸収する。
- 注意: メンテナンスモード（`docs/launch/MAINTENANCE_MODE.md`）に入ると `/api/` は 503 になる。メンテナンス中は監視を一時停止する（誤報を避ける）。メンテナンス前後の手順に入れる。

### 1-2. 外部の死活監視サービス（未登録）

候補: UptimeRobot（無料枠あり）、Better Stack、Cloudflare Health Checks。どれにするかは未確定（無料枠の条件は登録時に公式で確認する）。

| 監視先 | 間隔 | 異常の判定 | 通知 |
|---|---|---|---|
| `https://<本番>/api/health` | 1〜5分 | 状態コードが 200 以外、または 10 秒以内に返らない、を **2回連続** | オーナーのメール |
| `https://<本番>/` | 5分 | 状態コードが 200 以外、を2回連続 | 同上 |

- 本番 URL は、いまは `workers.dev` のもの（`scripts/reader-case/run-pipeline.sh` の既定値より。独自ドメインの有無は未確認）。
- どちらか片方だけ落ちた場合の読み方: `/api/health` だけ落ちる = D1 か公開カタログの問題。`/` だけ落ちる = 画面の配信かデプロイの問題。

### 1-3. 異常時の最初の動き

1. `curl -s https://<本番>/api/health` の `checks` を見る。
2. `database: ng` → Cloudflare の D1 の状態、直近のマイグレーション、`BACKUP_AND_RESTORE.md` の確認項目。
3. `catalog: ng` → R2 の公開版が在るか（`check-freshness.mjs` の `release-object` 項目）。公開版を入れ替えた直後なら `AUTOPILOT_OPERATIONS.md` の「戻し方」。
4. 直前のデプロイが原因なら戻す（`AUTOPILOT_OPERATIONS.md`）。

## 2. 決済（Stripe）

- Webhook の受け口は `POST /api/webhooks/stripe`（`src/app/api/webhooks/stripe/route.ts`）。コードで確認した応答:
  - 設定が無い・署名が違う・モードが違う: 400
  - 取り込みに失敗（D1 書き込みなど）: **503**（Stripe が同じイベントを再送する。コメントにも「全部書けるか、Stripe に再送させる」とある）
  - 成功: 200 `{ received: true }`
- 見る場所: Stripe の管理画面 → 開発者 → Webhook → 該当エンドポイントの「イベント配信」。
- 閾値（案）: 配信失敗が **1件でもあれば当日中に確認**。同じイベントが再送を繰り返して失敗し続けているなら重大（その購入者は有料機能を受け取れていない可能性）。
- Stripe 側の失敗通知メールの設定内容は、管理画面で確認する必要がある（**未確認**）。
- 照合（案・未実装）: Stripe の直近イベントの ID 一覧と D1 の `payment_events` を突き合わせるスクリプトは無い。公開直後は週1回、Stripe 管理画面の「支払い」と `payment_events` の件数を目で突き合わせる。
- 実課金・本番の Stripe には、この作業では接続していない。

## 3. 収集の自動運転（鮮度）

背景: 収集は別リポジトリ（`salve-de/universal-foundation`）の定期収集と Publisher（日本時間 8:50 / 14:50 / 20:50 に R2 へ書く。`docs/R2_SCHEDULED_WRITER_RUNBOOK.md`）で動く。この文書はその「設定上の予定」であって、本番で動いている証明ではない（同文書にも「配備を独立に確認せよ」とある）。だから外から鮮度を見る。

### 3-1. `scripts/ops/check-freshness.mjs`

読み取り専用。R2 には **List と Head だけ**を使う（Put / Delete / Copy を import していない）。鍵は環境変数から読むだけで、表示も保存もしない。

見る項目:

| id | 中身 | 異常の条件 |
|---|---|---|
| `journal-freshness` | `foundation-lake` の `journal/v1/YYYY/MM/DD/`（UTC の直近 `--days` 日、既定3日）の最新オブジェクトの更新時刻 | 最新が `--max-age-hours`（既定30）より古い、または1件も無い |
| `release-object:summaries` / `:discovery` | `data/catalog-release.json` が指す公開版オブジェクトが R2 にあるか（Head） | 無い（`catalog:publish` が未実行・失敗） |
| `release-match` | `--site-url` を渡した時だけ。本番 `/api/health` の `release` と、手元 `summaries.hash` の先頭12文字の一致 | 不一致（デプロイと公開版の順番の食い違い） |

終了コード: **0** すべて正常 / **1** 異常を検出 / **2** 確認できない（鍵が無い・接続できない・引数が違う）。「確認できない」を正常として扱わない。

実行例（鍵はキーチェーンから注入する既存の仕組みを使う。読み取りだけ）:

```sh
# 警告の目安（Publisher の1日3便のうち、1便以上落ちた）
node scripts/with-r2-keychain-secrets.mjs node scripts/ops/check-freshness.mjs --max-age-hours 14
# 重大の目安（丸1日以上、新しい journal が無い）＋ 本番の公開版との一致
node scripts/with-r2-keychain-secrets.mjs node scripts/ops/check-freshness.mjs --max-age-hours 30 --site-url https://<本番>
```

確認済み（この作業で実行した）:
- `node --test scripts/ops/check-freshness.test.mjs`: 5件成功（日付の遡り・閾値判定・一致判定・鍵が無い時に終了コード2）。
- 鍵なしで実行 → 「確認できない」と出て終了コード 2。

**未確認**: 本番 R2 への実行。鍵を使う読み取りのため、実行の可否はオーナーに確認する。

### 3-2. 閾値の根拠と未確定点

- Publisher は1日3便。通常は最新の journal が12時間以内に更新される。14時間は「1便落ちた」目安、30時間は「丸1日落ちた」目安。
- ただし **新しい調査が無い日は journal が増えない**可能性がある（その場合は故障ではない）。journal の増え方の実測が無いので、閾値は仮。最初の2週間は「警告だけ」で運用し、実際の間隔を見て決める（未確定）。
- journal の日付は書き込み時刻ではなく、中身の `recorded_at` の UTC 日付で決まる（`scripts/foundation-journal.ts` の `dateParts`）。そのため `--days 3` で前後にずれても拾う。

### 3-3. 実行の間隔（案・有効化しない）

- 手元の Mac からの手動、または既存の定期実行の仕組みに載せるかはオーナーが決める。**この作業では定期実行を作っていない・有効化していない**（GitHub Actions も追加していない）。
- 定期化する場合の条件は `AUTOPILOT_OPERATIONS.md` の「定期実行を有効にする前の条件」に従う。

## 4. D1 の容量

- 確認コマンド（読み取り）: `pnpm exec wrangler d1 info make-money-production-app`。**未実行**（本番に接続するため）。
- 上限: D1 は1データベース 10GB（`docs/architecture/STORAGE.md` の「D1（10GB上限、シングルスレッド）」）。
- 閾値（案）: 5GB で警告、8GB で重大（バックアップの export 時間も延びる。`BACKUP_AND_RESTORE.md`）。
- 現状の増え方は未測定。ユーザー数が少ない間は月1回で足りる。

## 5. Workers のエラー率とログ

- `wrangler.jsonc` に `"observability": { "enabled": true }` を追加した（このファイルの変更はこれだけ）。**デプロイした時に初めて本番に反映される**。反映後、Cloudflare の管理画面 → Workers → `make-money-app` → Observability でログ・エラーを見られる（画面の細かい名称は未確認）。
- 見る指標と閾値（案）:
  - エラー率（5xx）: 5分間で 1% を超える → 警告。5% を超える → 重大。
  - CPU 時間の超過（Cloudflare のエラー 1102）: 1件でも出たら確認。`src/lib/company-access/catalog-release.ts` のコメントに、過去に 1102 でカタログ API が落ちた経緯がある。
  - `/api/catalog` と `/api/businesses` の応答遅延。
- Cloudflare の通知（アラート）機能で上の閾値を自動通知にできるかは**未確認**。できない場合は、公開直後は目視（1日1回、Observability を開く）で運用する。
- ログ量が増えると無料枠を超える可能性がある。課金はオーナー確認が要るので、反映前に料金条件を公式で確認する（未確認）。

## 6. 通知メール（新着ダイジェスト）の失敗

- 仕組み（既存。`docs/NOTIFICATIONS.md`、`.github/workflows/notify-digest.yml`）: GitHub Actions が日本時間 9:10 / 15:10 / 21:10 に `POST /api/notifications/digest` を呼ぶ。失敗（502 など）は2回まで呼び直し、それでも失敗すれば `curl -f` で workflow が失敗する。GitHub は失敗を、リポジトリを購読している人にメールする（通知設定による。**未確認**）。
- **穴**: Secret `NOTIFY_CRON_SECRET` か変数 `SITE_URL` が無い間は、「送らずに成功で終わる」。設定漏れのまま公開すると、メールが1通も出ないのに緑のまま。公開前チェックに「この2つが入っていること」を入れる（`LAUNCH` 側の項目。`docs/NOTIFICATIONS.md` の手順）。
- 応答の読み方（`docs/NOTIFICATIONS.md`）: 200 `{ sent, skipped, failed: 0 }` が正常。`skipped: "email_not_configured"` は何も送っていない。502 は一部の宛先に送れていない。`truncated: true` は上限で止まった。
- 監視の追加案: Resend 側の送信失敗・バウンス率（Resend の管理画面）。閾値の既定は未確認。
- この workflow はすでに `schedule` を持つ。**この作業では変更していない**。

## 7. アクセス解析（Cloudflare Web Analytics）

- 実装: `src/lib/ops/analytics.ts`、`src/components/ops/AnalyticsLoader.tsx`。
- Cookie を使わない無料の計測。トークン `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` が**未設定なら何も読み込まない**（形式も検査する）。
- **同意前は一切読み込まない**。同意は `src/lib/legal/consent.ts` の `whenAnalyticsAllowed` を使う（未選択は「同意なし」。「必須のみ」を選んだ場合も読み込まない。同意後に取り消せば計測スクリプトの要素を取り除く）。
- 確認済み: 単体テスト（`src/lib/ops/analytics.test.ts`）9件成功（未選択・拒否・同意・取り消し・既に同意済みの再訪・トークンなし・DOMなし・不正なトークン）。**実ブラウザでの確認は未**（`layout.tsx` への差し込みが済んでいない・ビルドを回していない）。
- 取り消し時の限界: すでに動いた計測スクリプトの処理は、その画面を閉じる・読み直すまで止められない。取り消し後の次の画面読み込みからは読み込まれない。プライバシーポリシーの文言にこの点を合わせるかは法務の担当（要確認）。
- 差し込み方（`src/app/layout.tsx` はオーナー側の編集）: `Providers` の中に `<AnalyticsLoader />` を1つ置く。

  ```tsx
  import { AnalyticsLoader } from '@/components/ops/AnalyticsLoader';
  // <Providers> の子として
  <Providers>{children}<AnalyticsLoader /></Providers>
  ```
- トークンの取得: Cloudflare の管理画面で Web Analytics にサイトを追加して発行する（オーナー作業）。`NEXT_PUBLIC_` はビルド時に埋め込まれるので、設定後に再ビルド・再デプロイが要る。
- 計測データの扱い（保持期間・プライバシーポリシーへの記載）は法務側の担当と合わせる（未確定）。

## 8. 公開前チェック（この文書の分）

- [ ] `/api/health` が本番で 200 を返す（デプロイ後）
- [ ] 外部の死活監視に2本（`/api/health`、`/`）を登録し、通知先のメールを決める
- [ ] Stripe の Webhook エンドポイントの失敗通知が有効
- [ ] `check-freshness.mjs` を本番 R2 に対して1回実行し、結果を記録する（オーナー確認のうえ）
- [ ] `Notify digest` の Secret / 変数が入っている
- [ ] Observability がデプロイ後に有効で、ログが見える
- [ ] `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` を入れる前に、同意バーで「必須のみ」を選ぶと何も読み込まれないことを実ブラウザで確認する（ネットワークに `cloudflareinsights.com` が出ない）
