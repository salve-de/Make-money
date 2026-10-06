# 掲載の審査（運営者の手順）

マーケットプレイスの掲載（Builder・外部サービスの `marketplace_listings`、事業の売買の `business_sale_listings`）は、審査を通ったものだけが公開される。
画面は作っていない。運営者は下の API を `curl` で叩く。秘密値はこのファイルに書かない。

状態: 実装とテストまで。本番D1への migration 0016 の適用と、本番での実機確認は未実施。

## 仕組み

| 状態 | 意味 | 公開側（一覧・詳細・問い合わせ・サイトマップ） |
|---|---|---|
| `draft` | 下書き | 出ない |
| `pending_review` | 審査待ち（掲載者が公開を申請した） | 出ない |
| `published` | 公開中（運営者が承認した） | 出る |
| `rejected` | 却下（理由は短文。掲載者本人だけが見える） | 出ない |
| `closed` | 募集終了（事業の売買のみ） | 出ない |

- 掲載者が公開操作をすると `pending_review` になる。掲載者は `published`・`rejected` を自分では付けられない（API が 400 で拒否する）。
- 公開中の掲載の内容（URL・説明・価格・月商など）を変えて保存すると、`pending_review` に戻る。内容が同じなら公開のまま。
- 却下された掲載は、掲載者が直して出し直す（`pending_review`）と、却下理由が消えて再び審査待ちになる。
- 事業の売買の問い合わせは、承認済み（`published`）の掲載にだけ送れる。
- サイトマップには個別の掲載ページを載せていない（一覧ページのみ）ので、審査前の掲載が載ることはない。

## 運営者になる条件

- Firebase でログインしたアカウントの `users.role` が `admin` であること（`/api/entities/approve` と同じ方式）。
- 認可は `Authorization: Bearer <Firebase ID トークン>`。トークンは約1時間で失効する。取得は、運営者のアカウントでサイトにログインした状態のブラウザから行う（取得手順の文書化は未整備）。
- `role` を `admin` にする操作は本番D1への書き込みなので、オーナーが行う。ここでは実行しない。
- `Origin` ヘッダーが付いていて自サイトと違うリクエストは拒否する（`curl` は `Origin` を付けないので通る）。

## 使い方

環境変数に値を入れて使う（値そのものはシェルの履歴に残さないよう注意）。

```bash
export BASE_URL="https://<サイトのドメイン>"
export ID_TOKEN="<運営者アカウントの Firebase ID トークン>"
```

### 1. 審査待ちの一覧（申請が古い順、最大50件）

```bash
curl -sS "$BASE_URL/api/marketplace/reviews" \
  -H "Authorization: Bearer $ID_TOKEN"

# 種類で絞る: listing（Builder・外部サービス）／ business（事業の売買）
curl -sS "$BASE_URL/api/marketplace/reviews?kind=business" \
  -H "Authorization: Bearer $ID_TOKEN"
```

返り値の `reviews[]` に、`kind`・`id`・`revision`・掲載内容（URL・説明・価格・月商など）が入る。掲載者のユーザーIDは返さない。
`revision` は「いま読んだ版」の印で、承認・却下にそのまま付ける。

### 2. 承認する

```bash
curl -sS -X POST "$BASE_URL/api/marketplace/reviews/approve" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kind":"listing","id":"<一覧の id>","revision":<一覧の revision>}'
```

- Builder・外部サービスの掲載は、承認時に商品URL・購入URLを再検査する（https のみ。ローカル・プライベートIP・IP直書き・認証情報つきは拒否）。通らなければ 422 で、承認しない。
- 事業の売買の掲載には URL 欄がない（本文に `://` も入れられない）ので、URL の検査はない。

### 3. 却下する（理由は200文字以内の短文、改行なし）

```bash
curl -sS -X POST "$BASE_URL/api/marketplace/reviews/reject" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kind":"business","id":"<一覧の id>","revision":<一覧の revision>,"reason":"事業の説明が実態と合っていません"}'
```

理由は掲載者本人の画面にだけ出る。公開側の応答・他人の応答には含まれない。

## 応答

| ステータス | 意味 |
|---|---|
| 200 | 承認・却下できた |
| 400 | 本文が正しくない（`kind`・`id`・`revision`・理由の形） |
| 401 | トークンなし・無効 |
| 403 | 運営者ではない、または別サイトからの要求 |
| 404 | 掲載が見つからない |
| 409 | 審査待ちでない（もう承認・却下された）、または読んだ後に掲載者が内容を変えた。一覧を読み直す |
| 422 | 承認時の URL 検査に通らない（`field` が `productUrl` か `checkoutUrl`）。承認していない |
| 503 | 保存・読み込みに失敗 |

409 は安全側の挙動で、見ていない内容を承認しないための仕組み（`revision`）。一覧を取り直して、新しい内容を確認してからやり直す。

## できないこと（今後）

- 公開中の掲載を運営者が非公開にする操作（取り下げ）。当面は、規約8章の「不適切な掲載は非表示・削除できる」に基づき、D1 の `status` を直接 `rejected` にするなどの運用になる（本番D1の書き込みはオーナー操作）。
- 審査待ちの通知（メール・画面）。運営者が一覧 API を定期的に見る。
- 審査用の画面。
