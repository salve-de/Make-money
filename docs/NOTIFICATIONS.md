# 新着メール通知

保存した検索条件に合う新着事例をメールで知らせる機能と、「新着をメールで受け取る」登録者への週1回のメールです。保存先の位置づけは [STORAGE.md](architecture/STORAGE.md) を参照。

## 何を送るか

| 種類 | 宛先 | 内容 | 二重送信を防ぐ単位 |
|---|---|---|---|
| 保存条件の通知 | 通知をオンにした条件を持つ利用者（`users` に保存されたメール） | 最新の便に載った事例のうち、条件に合うもの。1人1通、最大10件 | 便ごと（例 `20260929-09`） |
| 週1回のお知らせ | 「新着をメールで受け取る」の有効な登録者 | 最新の便に載った事例のうち最大10件。配信停止リンク付き | 週ごと（日本時間のISO週、例 `2026-W40`） |

- 新着は1日3回（日本時間 9・15・21時）の「便」で公開されます。配信は最新の便だけを読みます。
- 宛先は保存済みのメールだけです。メールが無い利用者と、メールが無い会員に自動で入る仮のアドレス（`…@anon.example.com`）には送りません。
- 送信前に `notification_sends` へ行を確保し、失敗したら戻します。同じURLを何度呼んでも、同じ便を二度送ることはありません。台帳に残るのは宛先の一方向ハッシュだけで、メールアドレスそのものは残りません。

## 保存条件のAPI

型は `src/shared/saved-search.ts`（`SavedSearch`）。すべてFirebaseのBearerトークンが必要です（無いと401）。

| 呼び出し | 入力 | 成功時の出力 |
|---|---|---|
| `GET /api/saved-searches` | なし | 200 `{ savedSearches: SavedSearch[] }`（新しい順） |
| `POST /api/saved-searches` | `{ name, query, filters, notify? }`（`notify` は省略すると通知オン） | 201 `{ savedSearch }` |
| `PATCH /api/saved-searches/[id]` | `{ name?, notify? }`（どちらか1つは必須） | 200 `{ savedSearch }` |
| `DELETE /api/saved-searches/[id]` | なし | 200 `{ success: true }` |

- 名前は1〜60文字、検索語は200文字まで（空でも可）。1人20件までで、21件目は400 `{ error: "保存できる条件は20件までです", code: "saved_search_limit" }`。
- `filters` は画面の `CatalogFilters` をそのまま渡せます。`bookmarks` は保存されず（空になる）、`filter: "BOOKMARKED"` は400です。
- 他人の条件と存在しないidはどちらも404 `{ error: "条件が見つかりません" }`。入力の誤りは400 `{ error: <理由> }`、本文が大きすぎると413、保存先が使えないと503です。

## 必要な環境変数

| 名前 | 必須 | 内容 |
|---|---|---|
| `RESEND_API_KEY` | 必須 | Resend のAPIキー（秘密） |
| `NOTIFY_FROM_EMAIL` | 必須 | 送信元。Resend で認証したドメインのアドレス。例 `Make Money <notify@example.jp>` |
| `NOTIFY_CRON_SECRET` | 必須 | 定期実行が `x-cron-secret` ヘッダーで送る合言葉（秘密。長いランダム文字列）。未設定だと配信URLは503を返します |
| `NEXT_PUBLIC_APP_URL` | 推奨 | メール内リンクのサイトURL。未設定なら、呼び出されたURLの先頭部分を使います |
| `NOTIFY_UNSUBSCRIBE_SECRET` | 任意 | 配信停止リンクの署名用（秘密）。未設定なら `NOTIFY_CRON_SECRET` を使います。合言葉を入れ替えても過去メールの停止リンクを生かしたいときに設定します |

`RESEND_API_KEY` か `NOTIFY_FROM_EMAIL` が無いと、配信は何も送らず `{ "skipped": "email_not_configured" }` を返します（エラーにはしません）。

Cloudflare の場合は `npx wrangler secret put RESEND_API_KEY` のように、値はSecretとして入れます。値はGitへ入れません。

## 定期実行のしかた

配信URLは `POST /api/notifications/digest` です。次のように呼びます。

```
curl -fsS -X POST -H "x-cron-secret: $NOTIFY_CRON_SECRET" https://<サイトのURL>/api/notifications/digest
```

- 週1回だけ呼ぶと、その時点の最新の便に載った事例だけが通知の対象です。
- 取りこぼしを減らすには、各便の少し後（日本時間 9:10・15:10・21:10）に毎日3回呼びます。同じ便は二度送られず、週1回のお知らせも週1通のままです。
- このアプリのWorkerは `fetch` だけを持ち、Cloudflare の Cron Trigger（`scheduled`）を受けません。定期実行は GitHub Actions の `.github/workflows/notify-digest.yml` が、日本時間 9:10・15:10・21:10 に呼びます（main に入ってから動く）。
- 動かすには、GitHub のリポジトリ設定で Secret `NOTIFY_CRON_SECRET`（サイト側と同じ値）と、変数 `SITE_URL`（例 `https://kinrokoku.example.jp`）を登録します。どちらかが無い間は、何も送らずに成功で終わります。手動実行（workflow_dispatch）もできます。
- 失敗（502など）は2回まで呼び直します。同じ便は二度送られないため、呼び直しても重複しません。

## 結果の見方

| 応答 | 意味 |
|---|---|
| 200 `{ release, sent, skipped, failed }` | `sent` 送った通数。`skipped` 今回は送らなかった宛先（すでに送信済み、または使えるメールが無い）。`failed` は0 |
| 200 `{ …, truncated: true }` | 1回の上限に当たった。メール200通で止まった場合は、もう一度呼ぶと続きから送る。事例150件・宛先5,000件（保存条件の行数、登録者数それぞれ）を超えた分は対象外で、呼び直しても増えない（そこまで増えたら見直す） |
| 200 `{ skipped: "email_not_configured" }` | メールの設定が無く、何も送っていない |
| 502 | 送信に失敗した宛先がある、または事例・新着を読めなかった。もう一度呼んで安全（足りない分だけ送る） |
| 401 / 503 | 合言葉が違う / `NOTIFY_CRON_SECRET` が未設定 |

## 配信停止

週1回のお知らせの停止リンクは `/api/notifications/unsubscribe`（署名つき）です。開くと確認ページが出て、ボタンで停止します。メールソフトの「配信停止」ボタン（`List-Unsubscribe`、ワンクリック）にも対応しています。保存条件の通知は、メール末尾の `/alerts` で条件ごとに止めるか削除します。

## 運用メモ

- 反映前に migration `0013_saved_searches.sql` を適用します（`pnpm db:migrate:remote`）。この作業では本番D1へ適用していません。
- `notification_sends` の古い行は消して構いません（最新の便・今週の行は残す）。
- 退会（`DELETE /api/user/me`）で保存条件も消えます。
