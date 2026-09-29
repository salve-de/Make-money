# 画像素材の取得と出所台帳（Media Assets & Provenance）

更新日: 2026-09-29
状態: v1。実装済みは「ローカルへの取得」「台帳スキーマ」「台帳の検証」まで。**R2への書込み、foundation-publicへの複製、UIでの表示は未実装。**

## 0. 先に読む3行

1. 画像は1枚ずつ「どこから取ったか（出所）」と「何を根拠に見せてよいか（権利根拠）」を台帳に残す。台帳に無い画像、`decision` が `allowed` でない画像は表示しない。
2. 自動取得した画像は必ず `decision=held`（保留）で始まる。`allowed` にできるのは、人が目視して `subjectIsPerson=false` にし、`reviewedAt` を記録したあとだけ。スキーマがそれ以外を拒否する。
3. ランダムなWeb画像、人物写真、他人のチャート、SNS投稿の画像は取らない。迷ったら取らずに文字で表示する。

## 1. 目的

カタログを視覚的に厚くしたい。ただし画像は権利と信用の地雷になりやすい。そこで「出所と権利根拠が1枚ごとに追える画像だけを使う」仕組みを作る。

- 取得する（`scripts/media/fetch-official-assets.ts`）
- 記録する（`src/shared/media-asset-schema.ts` の台帳 `MediaAssetManifest`）
- 人が判定する（`held` → `allowed` / `blocked`）
- 判定を通ったものだけ公開側へ出す（設計のみ。第5章）

既存方針との整合: [`COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md`](./COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md) の次の方針を、台帳の形にしたもの。

- 画像・チャート・ロゴ・人物は、許諾済みか自作だけを使い、作者、URL、ライセンス、帰属を記録する
- スキーマで表せない許可を `allowed` と発明しない
- 保留にするのは該当の画像だけ。無関係な事実の表示は止めない

## 2. 取得元の優先順位（オーナー決定 2026-09-29）

上から順に探し、見つかった時点で止める。

| 優先 | 取得元 | `rights.basis` | 主な `kind` |
|---|---|---|---|
| 1 | 自前生成: 確定済みの事実から描画したチャート、AI生成イラスト | `owned` | `generated_chart` / `generated_illustration` |
| 2 | 公式プレスキット・ブランド素材ページ（メディア利用条件を明記しているもの） | `provider_press_terms` | `press_kit`（`logo` / `product_image` も可） |
| 3 | 公式サイト・アプリストアの製品スクリーンショット、製品画像を当方が取得。製品の識別・説明に使い、公式ページを出典として明記し、削除依頼に応じる | `official_marketing_material` | `screenshot_home` / `screenshot_pricing` / `screenshot_product` / `product_image` / `og_image` / `favicon` |
| 4 | CC0 / CC BY / パブリックドメイン。ライセンス名と版、帰属表示を記録 | `open_licence` | `open_licence_image` |

取得CLIが自動で取るのは優先3のうち `favicon` / `og_image` / `screenshot_home` / `screenshot_pricing` の4種だけ。優先1・2・4と `screenshot_product` / `product_image` / `logo` は、今は人が取得して台帳に書く（CLI未対応）。

## 3. 禁止事項

方針として使わない。自動取得で写り込んでいた場合は、第7章のとおり `blocked` にする:

- 人物の写真（顔・肖像が主題のもの）。`subjectIsPerson=true` は `allowed` にできない
- 第三者が作ったチャート・インフォグラフィック
- SNS投稿のスクリーンショット
- 有料記事（ペイウォール）の画像
- 装飾目的のロゴ利用（識別のための小さなロゴは可）

取得CLIが守る実装上の禁止事項:

- 公式ドメイン外へ出ない（ページ遷移・リダイレクト・画像URLとも。外へ出る場合は `skipped_off_domain` と記録）
- `robots.txt` が禁じるパスを取らない（`skipped_robots` と記録）
- bot対策（チャレンジ、CAPTCHA、403/429/503）を回避しない。`blocked_by_site` と記録して終わる
- ログイン、フォーム送信、同意バナーのクリックをしない。バナーやモーダルはそのまま写り込む
- 違法・規約違反すれすれの取得はしない（[`CLAUDE.md`](../CLAUDE.md) 2.2）。取るのは公開ページの通常閲覧で見える範囲だけ

## 4. 台帳（manifest）

1エンティティ1ファイルの `manifest.json`。中身は台帳レコードの配列。スキーマは `MediaAssetManifestFileSchema`（`src/shared/media-asset-schema.ts`、zod）。

### 4.1 項目

| 項目 | 型 | 意味 | 自動取得の値 |
|---|---|---|---|
| `assetId` | `ma_` + 24桁hex | ファイルのSHA-256の先頭24桁。`sha256` と食い違えば不正 | 自動 |
| `entityId` | `ent_...` | `data/entities-index.json` の id | 指定した id |
| `kind` | 列挙 | `logo` `favicon` `og_image` `screenshot_home` `screenshot_pricing` `screenshot_product` `product_image` `press_kit` `generated_chart` `generated_illustration` `open_licence_image` | 4種 |
| `sourcePageUrl` | URL | 見つけた、または描画したページ（リダイレクト後、`#` なし） | 自動 |
| `assetUrl` | URL または null | ファイルの取得元。当方が描画したスクリーンショットと生成物は null | favicon/og は元URL。`data:` のfaviconは null |
| `retrievedAt` | ISO 8601 | 取得時刻 | 自動 |
| `capturedBy` | 文字列 | 取得ジョブID | `media-fetch-YYYYMMDD`（UTCの日付） |
| `sha256` / `bytes` | hex64 / 整数 | 保存したバイト列のハッシュとサイズ | 自動 |
| `contentType` | `image/*` | **バイト列から判定した種類**（HTTPヘッダは信用しない） | PNG/JPEG/GIF/WebP/AVIF/ICO/SVG |
| `width` / `height` | 整数 または null | 画像サイズ。どちらかだけ null は不可 | 読めたとき |
| `rights.basis` | 列挙 | `owned` `provider_press_terms` `official_marketing_material` `open_licence` `unknown` | `official_marketing_material` |
| `rights.termsUrl` | URL または null | 利用条件のページ。`provider_press_terms` では必須 | null |
| `rights.licence` | 文字列 または null | 例 `CC BY 4.0`。`open_licence` では必須 | null |
| `rights.attribution` | 文字列 | 画像と一緒に出す出所表示。保留中も必須 | `出典: <名前> 公式サイト (<URL>)` |
| `rights.decision` | 列挙 | `allowed`（表示可）/ `held`（保留）/ `blocked`（使わない） | **`held`** |
| `rights.reviewedAt` | ISO 8601 または null | 判定した時刻。`allowed` と `blocked` では必須 | null |
| `rights.notes` | 文字列 | 判定の理由、確認事項。`blocked` では理由が必須 | 確認チェックリストの文言 |
| `storage.bucket` / `storage.key` | 文字列 | 原本の保存先（**予定**。R2書込みは未実装） | `foundation-raw` / `media/<entityId>/<sha256>.<ext>` |
| `storage.publicKey` | 文字列 または null | 公開側コピーのキー。`allowed` のときだけ設定可 | null |
| `subjectIsPerson` | boolean | 人物が主題なら true。`allowed` には false が必要 | **`true`**（下記） |

`subjectIsPerson` の自動取得値が `true` なのは「未確認」の意味（安全側）。目視して人物が主題でなければ `false` に直す。実例（2026-09-29の取得）: Photo AI の `og:image` とトップのスクリーンショットは人物写真のコラージュ、stevehanov.ca のトップにも人物写真がある。これらを `false` 既定で出すと、判定を流す工程が見落として `allowed` にしてしまう。

### 4.2 スキーマが強制するルール

- `assetId` は `sha256` の先頭24桁と一致する。`storage.key` は `media/<entityId>/<sha256>.<ext>` の形で、この記録の `entityId` と `sha256` に一致する
- `rights.decision=allowed` には、`subjectIsPerson=false`、`rights.basis` が `unknown` でないこと、`rights.reviewedAt` があることが要る
- `rights.decision=blocked` には `rights.reviewedAt` と、理由入りの `rights.notes` が要る
- `storage.publicKey` は `allowed` のときだけ設定でき、`media/<entityId>/` の下にある
- `generated_*` は `basis=owned` かつ `assetUrl=null`。`owned` は `generated_*` だけが使える
- `press_kit` は `provider_press_terms`（決定前は `unknown`）、`open_licence_image` は `open_licence`（同）
- `screenshot_home` / `screenshot_pricing` は `assetUrl=null`。`og_image` / `press_kit` / `open_licence_image` は `assetUrl` 必須
- 未知のキーは不可（`rights.decison` のような綴り誤りを通さない）。`manifest.json` の中で `assetId` は重複不可、`entityId` は1種類のみ

## 5. 保存先の設計（未実装）

```text
[取得（実装済み）]                  [原本（未実装）]                         [公開（未実装）]
data/media-staging/ (gitignore)     foundation-raw                            foundation-public
  <entityId>/                         media/<entityId>/<sha256>.<ext>           media/<entityId>/<assetId>.<ext>
    <assetId>.<ext>          ──►      media/<entityId>/manifest.json   ──►      （decision=allowed のものだけ複製）
    manifest.json                     create-only、書込み後に読み戻して          UI は manifest の publicKey だけ参照
                                      bytes と sha256 を照合
```

- ローカルのステージング `data/media-staging/` は `.gitignore` 済み。ここで人が判定する
- `foundation-raw` へは、原本 `media/<entityId>/<sha256>.<ext>` と台帳 `media/<entityId>/manifest.json` を **create-only** で保存する。同じキーに同じ内容は冪等、別の内容は衝突として止める。書込み後は必ずGETで読み戻す（[`architecture/R2_100_YEAR_OPERATIONS.md`](./architecture/R2_100_YEAR_OPERATIONS.md) の不変条件）
- `rights.decision=allowed` のものだけ `foundation-public` へ複製し、そのキーを `storage.publicKey` に記録する。`foundation-public` は再生成できる投影物であり、原本の代わりにしない
- UI は `allowed` かつ `publicKey` があるものだけを読み、必ず `rights.attribution` を添える。`held` / `blocked` は参照しない。SVG は `<img>` で読み込むだけにし、ページに直接埋め込まない
- 現在の `storage.bucket` / `storage.key` は「保存する予定の場所」を書いているだけで、R2にオブジェクトは無い

### 実装前にオーナーが決めること

1. **削除依頼とLockの衝突。** `foundation-raw` は「不変・削除禁止、権利確認済みの原本は無期限Lock」が標準。一方 `official_marketing_material` は「削除依頼に応じる」前提。`R2_100_YEAR_OPERATIONS.md` も「権利上削除が必要なデータを閉じ込める無期限Lockは禁止」と定めている。案: `media/` プレフィックスには無期限Lockを掛けない。代案: 判定前の画像は `foundation-restricted` に置き、`allowed` になってから移す
2. **`manifest.json` が create-only だと判定変更を上書きできない。** 案: `manifest.json` は取得時点の記録として不変にし、判定の変更は `media/<entityId>/decisions/<時刻>-<assetId>.json` として追記する。`foundation-public` 側の manifest（再生成できる）に現在の判定を反映する

## 6. 取得コマンド

前提: Playwrightのchromiumが入っていること（未導入なら `pnpm exec playwright install chromium`）。

```sh
node --import tsx scripts/media/fetch-official-assets.ts --ids ent_photoai,ent_keyence [--limit N] [--out data/media-staging]
```

| オプション | 意味 |
|---|---|
| `--ids` | カンマ区切りのエンティティid（必須）。`data/entities-index.json` の `officialUrl`、無ければ `url` を使う |
| `--limit N` | 先頭N件だけ処理する |
| `--out` | 出力先（既定 `data/media-staging`） |
| `--index` | 読み込むindex（既定 `data/entities-index.json`。テスト用） |
| `--validate` | 取得せず、手で編集した `manifest.json` をスキーマと実ファイル（サイズ・SHA-256）に照らして検査する。`--ids` を省くと全件。問題があれば終了コード1 |

取得するもの（1エンティティ、公式サイトのみ）:

1. `favicon`: `<link rel=icon>`（SVG、`sizes` が大きいものを優先）、無ければ `/favicon.ico`
2. `og_image`: `meta og:image` をダウンロード
3. `screenshot_home`: トップページの 1280x800 ビューポートPNG
4. `screenshot_pricing`: リンク文言が `/pricing|料金|price/i` に合う同一サイトのページ。ブログ記事・ヘルプ（`/blog/` `/docs/` `/help/` など）と現在のページは対象外。文言が長い（33文字以上）リンクは、URLのパス自体が pricing/plans/料金 のときだけ採る。ナビ内のリンクとpricing系パスを優先

出力: `data/media-staging/<entityId>/<assetId>.<ext>`、`manifest.json`、実行記録 `data/media-staging/run-<YYYYMMDDTHHMMSSZ>.json`。

動作の要点:

- **公式サイトの範囲**: URLの登録可能ドメイン（`www.keyence.co.jp` → `keyence.co.jp`）が同じものだけ。判定は公開サフィックス一覧を持たない近似で、未登録の接尾辞は「同じサイト」と広めに判定する側にずれる（`src/shared/media-fetch-policy.ts`）。IPアドレス、`localhost`、社内名は拒否
- **リダイレクト**: PlaywrightはHTTPリダイレクトの途中URLをroute対象にしないため、ブラウザに開かせる前にNode側で1ホップずつ同じ検査（公式サイト内か、robotsで許可か）をして、解決後のURLを開く。JavaScriptやmeta refreshでサイト外へ移動しようとしたページは移動をブロックし、`skipped_off_domain` にする
- **robots.txt**: ホストごとに1回取得。トークン `MakeMoneyMediaFetch`（User-Agent末尾にも付く）のグループ、無ければ `*`。ページと画像のパス＋クエリごとに判定。4xxは制限なし、5xx・429・取得不能は不許可（RFC 9309）。ページが描画時に読む下位リソース（CSS/JS/画像/iframe）は、通常のブラウザと同じく個別には判定しない
- **トラッカー**: Google Analytics、GTM、広告系など約40ホストへの通信は遮断（公式サイト自身は対象外）
- **画像の検証**: HTTPヘッダでなく中身で判定。HTMLのエラーページなど画像でないものは `failed`。上限 favicon 1MiB / og:image 8MiB
- **再実行**: `manifest.json` は追記のみ。既存の記録（人が変えた `decision` を含む）は書き換えない。同じバイト列は `already_in_manifest`。ページの内容が変わればスクリーンショットは別の `assetId` として追記される（不要なら手で消して `--validate`）。既存の `manifest.json` が不正なら、そのエンティティは失敗にして上書きしない
- **終了コード**: 個別の失敗があっても0（結果は実行記録）。引数、index、ブラウザ起動などの致命的エラーは1

実行記録のステータス:

| エンティティ | 意味 |
|---|---|
| `ok` | 試した項目がすべて取れた、または「無かった（`not_found`）」 |
| `partial` | 一部が失敗またはスキップ（robots、サイト外、エラー） |
| `failed` | 何も取れなかった、またはエラー |
| `skipped_robots` | トップページがrobots.txtで禁止 |
| `skipped_off_domain` | 公式サイト外へリダイレクト／移動しようとした |
| `blocked_by_site` | bot対策ページ、403/429/503 |
| `id_not_found` / `no_official_url` | indexに無い／取得できるURLが無い |

項目（`favicon` `og_image` `screenshot_home` `screenshot_pricing`）のステータス: `captured` `already_in_manifest` `skipped_duplicate`（同じバイト列を別kindで取得済み）`not_found` `skipped_robots` `skipped_off_domain` `not_attempted` `failed`。

## 7. 許可（allowed）にするまで

1. 取得した画像を1枚ずつ開いて見る（`data/media-staging/<entityId>/`）
2. 確認する
   - 人物が主題でない（顔・肖像のコラージュは不可）
   - 同意バナー、メール登録モーダル、個人情報、ログイン画面、地域・住所の表示が写っていない
   - ロゴ・faviconは識別用の小さい使い方に限る
   - 他社のロゴの羅列、記事画像、SNS、第三者のチャートが主題でない
   - 利用条件（`termsUrl`）に禁止条項が無い
3. 使える: `subjectIsPerson=false`、`rights.reviewedAt=現在時刻`、`rights.decision="allowed"`。使えない: `rights.decision="blocked"`、`reviewedAt`、理由を `notes` に。撮り直す場合も、古い記録は残して `blocked` にする
4. `node --import tsx scripts/media/fetch-official-assets.ts --validate --ids <id>` で検査する

2026-09-29の取得で見つかった実例（判定の目安）:

| 対象 | 見つかったこと | 扱い |
|---|---|---|
| Photo AI のトップ、`og:image` | 人物写真のコラージュ | `subjectIsPerson=true` のまま。`blocked` にするか撮り直す |
| Photo AI の料金ページ | 人物なし | 候補 |
| stevehanov.ca のトップ | 人物写真あり | 同上 |
| Costco のトップ | メール登録モーダルが写り込む | 撮り直す（モーダルを押すのは禁止） |
| キーエンス のトップ | 人物なし、製品とロゴ中心 | 候補 |

## 8. 削除依頼が来たとき

権利者や本人から削除依頼を受けたら、次の順に行う。判断に迷っても、まず表示を止める。

1. **受付を記録する**: 依頼者、日時、対象の画像・URL、根拠を `rights.notes` と `docs/worklogs/` の日付付き記録に残す
2. **表示を止める**: 台帳を `decision="blocked"`、`reviewedAt`、理由付き `notes` にし、`storage.publicKey=null` にする。`foundation-public` の複製を削除し、CDN・ブラウザのキャッシュを無効化する。`foundation-public` は再生成できる投影物なので、ここは即時に行ってよい
3. **原本の扱いを決める**: `foundation-raw` は削除禁止が原則。依頼者が原本の削除まで求める場合は、削除は事前にオーナーの承認を得てから行う（設計上の未決事項は第5章）。削除しても、SHA-256と `blocked` の記録（墓標）は台帳に残す。同じバイト列は同じ `assetId` になるので、ステージングの `manifest.json` が残っている限り、取得CLIが再取得しても `already_in_manifest` として `blocked` のまま保たれる
4. **差し替える**: 第2章の優先順位で次の候補を探す。自前生成（イラスト・チャート）、プレスキット、別ページの公式スクリーンショット、CC画像の順。見つからなければ画像なし（社名などの文字表示）にする。新しい画像も `held` から始め、第7章の確認を通す
5. **確認する**: UIが `blocked` の画像を参照しないこと、公開URLが取得できなくなったことを確認し、結果を受付記録に追記する

## 9. 既存の権利登録簿との関係

権利の判断は2層に分かれる。

| 層 | 場所 | 粒度 |
|---|---|---|
| 登録簿 | Universal Foundation `registry/rights/policy.*.v1.json`（提供元ごとの利用方針。use modeごとに `allowed` などを持つ。画像・メディアの公開表示は `public_media_display`。名称はオーナー指定で、実ファイルは未確認） | 提供元（ソース）単位 |
| 台帳 | 本書の `manifest.json` | 画像1枚単位 |

設計方針（UI表示を実装するときの条件）:

- 台帳が `allowed` でも、その提供元のポリシーで `public_media_display` が許可されていなければ公開しない。逆に、登録簿が許可していても、台帳が `held` / `blocked` の画像は公開しない。どちらか片方だけでは表示しない
- `official_marketing_material` は、提供元ごとの許諾ではなく、オーナーが2026-09-29に決めた区分（識別・説明目的、出典明記、削除依頼に応じる）。この区分の方針を登録簿に登録する手順は、Universal Foundation の正規手順（方針を追加 → このリポジトリの固定スナップショットを更新 → 通る範囲だけをテスト）に従う。登録されるまでは自動公開の対象にしない
- 台帳のスキーマで表せない許可を `allowed` と書かない。足りないときは、足りない方針・スキーマを登録簿側で解決する（`COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md`）

現状（2026-09-29に確認できた範囲）:

- このリポジトリの固定スナップショット `data/foundation-public-rights-snapshot.json`（`make-money-public-rights-snapshot.v1`）は、方針ごとに `commercial_use` と `public_fact_display` だけを持ち、`public_media_display` を含まない。`src/lib/foundation/publication-rights.ts` も `public_fact_display` までしか見ていない。したがって **画像の公開表示は登録簿と未連携**
- `public_media_display` を含むUniversal Foundation側の実ファイルは、本タスクでは読んでいない（**未検証**）

## 10. 既知の制約・未実装

- 未実装: R2書込み（raw / public）、判定用のレビューツール、UI表示、登録簿との連携（第9章）、優先1・2・4の取得の自動化
- ボット対策のあるサイトは取れない（`blocked_by_site`）。回避はしない
- スクリーンショットには同意バナーやモーダル、地域に応じた表示（例: Costco の「My Warehouse」）が写り込む
- 公式サイト判定は近似。og:image を別ドメインのCDNで配信しているサイトは `skipped_off_domain` になる。実行記録のURLを見て、人が扱いを決める
- 公式URLがトップから別パスへリダイレクトするサイトでは、`sourcePageUrl` はリダイレクト後のURL（例: `https://stevehanov.ca/blog`）
- 台帳スキーマは zod で書いた。zod はこれまで `eslint-plugin-react-hooks` 経由の間接依存だったため、`package.json` の `dependencies` に追加し、`pnpm-lock.yaml` の記載を合わせた（`pnpm install --frozen-lockfile` は本タスクでは未実行）
- 検証: `pnpm vitest run src/shared/media-asset-schema.test.ts src/shared/media-fetch-policy.test.ts`（台帳スキーマ、robots.txt、公式サイト判定、画像判定、料金ページ選択）
