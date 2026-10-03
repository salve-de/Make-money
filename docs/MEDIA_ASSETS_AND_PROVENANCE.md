# 画像素材の取得と出所台帳（Media Assets & Provenance）

> **2026-10-03 収集方針の確認**: Make-Money の唯一の入口は [OWNER_INTENT.md](OWNER_INTENT.md)。実製品画面・利用場面・出力例を優先し、faviconやロゴだけで画像収集要件を完了にしない。取得・保存・商用表示の可否は別々に確認する。本更新は、本書の提供元制限・台帳判定・権利/保存/表示ゲートや第9章の既知の不整合を変更せず、無条件の転載許可も作らない。画像が取れない・表示できない場合は理由を記録し、別画像で偽装しない。

更新日: 2026-09-29
状態: v3（2026-09-29 #2）。v3 の追加は「画像は必須で、取れるものは取る」「App Store 掲載画像（`app_icon` / `store_screenshot`）の取得」「規則による自動判定 `auto-rule-v3`」「表示サイズの上限」（第2章・第6.2節・第7.2節・第9章・第11章）。v2 までの実装済みは「ローカルへの取得」「台帳スキーマ」「判定ログ（`decisions.jsonl`）とレビューCLI」「R2アップロードCLI」「画面表示（一覧のロゴ、インスペクターの画像ギャラリー）」。R2アップロードは `--dry-run` とテスト用の疑似ストアまで検証済みで、**R2への実書込み、公開ドメインの設定、本番の画面での表示確認はまだ行っていない**（オーナーが実行する。第5章・第11章）。

## 0. 先に読む3行

0. **画像は必須。取れるものは取る**（オーナー決定 2026-09-29 #2: アイコン、プレビュー画像（og:image）、ストア画像は取る）。ただし取る先は公式サイトと App Store の掲載画像だけで、下の1〜3は変わらない。
1. 画像は1枚ずつ「どこから取ったか（出所）」と「何を根拠に見せてよいか（権利根拠）」を台帳に残す。台帳に無い画像、有効な判定が `allowed` でない画像は表示しない。
2. 自動取得した画像は必ず `decision=held`（保留）で始まり、`manifest.json` は取得時点の記録として書き換えない。表示してよいのは、人が目視して `review-assets` で、または規則による自動判定 `auto-review`（reviewer `auto-rule-v3`、第7.2節）で判定ログ `decisions.jsonl` に追記し、**有効な判定が `allowed` かつ `subjectIsPerson=false`** になった画像だけ。スキーマと判定ログの検査がそれ以外を拒否する。
3. ランダムなWeb画像、人物写真、他人のチャート、SNS投稿の画像は取らない。迷ったら取らずに文字で表示する。
4. **実際に使うときの画面を最優先**（オーナー決定 2026-10-02）。取る・出す順は「ストアの画面写真 → 公式サイトに載った製品の画面写真（`screenshot_product`）→ アイコン」。`og_image` は製品の画面が写っている時だけ出し、ロゴ・飾り背景・文字だけの宣伝バナーは `blocked`（理由 `promo_banner_no_product`）にする。詳しくは第2.2節。

## 1. 目的

カタログを視覚的に厚くしたい。ただし画像は権利と信用の地雷になりやすい。そこで「出所と権利根拠が1枚ごとに追える画像だけを使う」仕組みを作る。

- 取得する（`scripts/media/fetch-official-assets.ts`）
- 記録する（`src/shared/media-asset-schema.ts` の台帳 `MediaAssetManifest`）
- 人が判定する（`held` → `allowed` / `blocked`。`scripts/media/review-assets.ts` が `decisions.jsonl` に追記する。第4.3節・第7章）
- 判定を通ったものだけ公開側へ出す（`scripts/media/upload-media-assets.ts`。第5章）
- 画面に出す（`GET /api/media`、一覧のロゴ、インスペクターのギャラリー。第11章）

既存方針との整合: [`COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md`](./COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md) の次の方針を、台帳の形にしたもの。

- 画像・チャート・ロゴ・人物は、許諾済みか自作だけを使い、作者、URL、ライセンス、帰属を記録する（**2026-09-30 廃止** → OWNER_INTENT 7章: 公式サイトのアイコン・og:image・ストア画像を出所付きで小さく使う（v3））
- スキーマで表せない許可を `allowed` と発明しない
- 保留にするのは該当の画像だけ。無関係な事実の表示は止めない

## 2. 取得元の優先順位（オーナー決定 2026-09-29）

下表は取得元・権利根拠の分類です。製品の実像を伝える収集・表示の優先順位は第2.2節に従います。生成イラスト・汎用図・ロゴ・faviconが見つかっても、実製品画面・利用場面・出力例の探索を完了扱いにはしません。取得や表示ができない場合は理由を残し、既存の権利・収集制限を守ります。

| 優先 | 取得元 | `rights.basis` | 主な `kind` |
|---|---|---|---|
| 1 | 自前生成: 確定済みの事実から描画したチャート、AI生成イラスト | `owned` | `generated_chart` / `generated_illustration` |
| 2 | 公式プレスキット・ブランド素材ページ（メディア利用条件を明記しているもの） | `provider_press_terms` | `press_kit`（`logo` / `product_image` も可） |
| 3 | 公式サイト・アプリストアの製品スクリーンショット、製品画像を当方が取得。製品の識別・説明に使い、公式ページを出典として明記し、削除依頼に応じる | `official_marketing_material` | `screenshot_home` / `screenshot_pricing` / `screenshot_product` / `product_image` / `og_image` / `favicon` / `app_icon` / `store_screenshot` |
| 4 | CC0 / CC BY / パブリックドメイン。ライセンス名と版、帰属表示を記録 | `open_licence` | `open_licence_image` |

取得CLIが自動で取るのは優先3のうち、公式サイトの `favicon` / `og_image` / `screenshot_home` / `screenshot_pricing` / `screenshot_product`（`fetch-official-assets`、製品画面は第6.1節）と、App Store の `app_icon` / `store_screenshot`（`fetch-app-store-assets`、第6.2節）だけ。優先1・2・4と `product_image` / `logo` は、今は人が取得して台帳に書く（CLI未対応）。

### 2.1 取得元の範囲（v3）

| 取得元 | 扱い |
|---|---|
| 公式サイト（登録可能ドメインが公式と同じもの） | 取る。robots・bot対策は第3章のとおり順守 |
| App Store | 取る。Apple の公開 iTunes Lookup / Search API（`https://itunes.apple.com/lookup`, `/search`）を使う。アフィリエイト向けにアートワーク表示を想定した公式 API。HTML のスクレイピングはしない |
| Google Play | **対象外**。公式 API が無く、HTML の取得は規約上グレー |
| SNS、第三者サイト、ニュース記事、公式ドメイン外のCDN（例 `storage.ghost.io`） | 取らない（`skipped_off_domain`）。Apple の画像CDN（`*.mzstatic.com`）だけは、API の応答が示した URL に限って取る |

ストア画像の権利区分は `official_marketing_material`（開発者自身がストアに掲載した販促素材）。用途は識別・説明の目的に限り、小さく表示し、出典リンクを付け、削除依頼に応じる。この区分は提供元ごとの許諾ではなくオーナーの決定であり、登録簿とは食い違う（第9章）。

### 2.2 実際の画面を優先する（オーナー決定 2026-10-02）

宣伝バナー（ロゴと飾り背景だけの og:image）は、事例で何ができるかを伝えないので意味がない。画像の目的は「その製品を使うと何が見えるか」を一目で伝えること。

| 優先 | 画像 | 取り方 |
|---|---|---|
| 1 | App Store のストア画面写真（`store_screenshot`） | 第6.2節の公式 API。運営会社が「実際の画面」として載せたもの |
| 2 | 公式サイトに載った製品の画面写真（`screenshot_product`） | トップ・機能紹介・使い方・ドキュメントの公開ページにある画像。ファイル名・alt・周りの文に dashboard / app / screenshot / editor / 画面 などがあり、横長で画面らしいもの |
| 3 | アイコン（`app_icon` / `favicon` / `logo`） | 一覧の小さな印用。製品画面の代わりにはしない |
| 4 | `og_image` | 出さない。自動判定は一律 `blocked`（`promo_banner_no_product`）にする。og:image / twitter:image はほぼ宣伝バナーで、画面が写っていても自動では見分けられないため。人が目視して画面だと確かめたものだけ `allowed` にできるが、ギャラリーの表示対象には入れない |

- ログイン後の画面を自分で撮らない。公開ページ以外から取らない（第3章のまま）。
- 表示は今までどおり小さく（長辺480px以下）、出典付き。背景・見出し画像などの飾りには使わない（著作権法の引用・軽微利用の範囲を外れるため）。

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

**`manifest.json` は取得時点の記録として不変**（オーナー決定 2026-09-29）。人が判定を変えても書き換えない。判定の変更は同じディレクトリの `decisions.jsonl` に追記し（第4.3節）、manifest と判定ログを合成した「有効な判定」を `readEffectiveManifest(entityId)`（`src/shared/media-asset-store.ts`）が返す。

### 4.1 項目

| 項目 | 型 | 意味 | 自動取得の値 |
|---|---|---|---|
| `assetId` | `ma_` + 24桁hex | ファイルのSHA-256の先頭24桁。`sha256` と食い違えば不正 | 自動 |
| `entityId` | `ent_...` | `data/entities-index.json` の id | 指定した id |
| `kind` | 列挙 | `logo` `favicon` `og_image` `app_icon` `store_screenshot` `screenshot_home` `screenshot_pricing` `screenshot_product` `product_image` `press_kit` `generated_chart` `generated_illustration` `open_licence_image` | 4種 |
| `sourcePageUrl` | URL | 見つけた、または描画したページ（リダイレクト後、`#` なし） | 自動 |
| `assetUrl` | URL または null | ファイルの取得元。当方が描画したスクリーンショットと生成物は null | favicon/og は元URL。`data:` のfaviconは null。`app_icon` / `store_screenshot` は Apple の画像CDNのURL |
| `retrievedAt` | ISO 8601 | 取得時刻 | 自動 |
| `capturedBy` | 文字列 | 取得ジョブID | `media-fetch-YYYYMMDD`（UTCの日付）。App Store は `media-appstore-YYYYMMDD` |
| `sha256` / `bytes` | hex64 / 整数 | 保存したバイト列のハッシュとサイズ | 自動 |
| `contentType` | `image/*` | **バイト列から判定した種類**（HTTPヘッダは信用しない） | PNG/JPEG/GIF/WebP/AVIF/ICO/SVG |
| `width` / `height` | 整数 または null | 画像サイズ。どちらかだけ null は不可 | 読めたとき |
| `rights.basis` | 列挙 | `owned` `provider_press_terms` `official_marketing_material` `open_licence` `unknown` | `official_marketing_material` |
| `rights.termsUrl` | URL または null | 利用条件のページ。`provider_press_terms` では必須 | null |
| `rights.licence` | 文字列 または null | 例 `CC BY 4.0`。`open_licence` では必須 | null |
| `rights.attribution` | 文字列 | 画像と一緒に出す出所表示。保留中も必須 | `出典: <名前> 公式サイト (<URL>)` |
| `rights.decision` | 列挙 | `allowed`（表示可）/ `held`（保留）/ `blocked`（使わない）。manifest の値は取得時点の記録で、有効な判定は第4.3節 | **`held`** |
| `rights.reviewedAt` | ISO 8601 または null | 判定した時刻。`allowed` と `blocked` では必須（有効な判定にはこの規則を適用する） | null |
| `rights.notes` | 文字列 | 判定の理由、確認事項。`blocked` では理由が必須 | 確認チェックリストの文言 |
| `storage.bucket` / `storage.key` | 文字列 | 原本の保存先。`upload-media-assets` がここへ書く（第5章） | `foundation-raw` / `media/<entityId>/<sha256>.<ext>` |
| `storage.publicKey` | 文字列 または null | 公開側コピーのキー。`allowed` のときだけ設定可。公開側は原本と**同じキー**。manifest では null のままで、有効な判定が `allowed` のときだけ合成した記録に入る | null |
| `subjectIsPerson` | boolean | 人物が主題なら true。`allowed` には false が必要 | **`true`**（下記） |

`subjectIsPerson` の自動取得値が `true` なのは「未確認」の意味（安全側）。目視して人物が主題でないと確認した人が、`review-assets --allow --subject-is-person false` で判定ログに記録する（manifest は直さない）。実例（2026-09-29の取得）: Photo AI の `og:image` とトップのスクリーンショットは人物写真のコラージュ、stevehanov.ca のトップにも人物写真がある。これらを `false` 既定で出すと、判定を流す工程が見落として `allowed` にしてしまう。

### 4.2 スキーマが強制するルール

- `assetId` は `sha256` の先頭24桁と一致する。`storage.key` は `media/<entityId>/<sha256>.<ext>` の形で、この記録の `entityId` と `sha256` に一致する
- `rights.decision=allowed` には、`subjectIsPerson=false`、`rights.basis` が `unknown` でないこと、`rights.reviewedAt` があることが要る
- `rights.decision=blocked` には `rights.reviewedAt` と、理由入りの `rights.notes` が要る
- `storage.publicKey` は `allowed` のときだけ設定でき、`media/<entityId>/` の下にある
- `generated_*` は `basis=owned` かつ `assetUrl=null`。`owned` は `generated_*` だけが使える
- `press_kit` は `provider_press_terms`（決定前は `unknown`）、`open_licence_image` は `open_licence`（同）
- `screenshot_home` / `screenshot_pricing` は `assetUrl=null`。`og_image` / `app_icon` / `store_screenshot` / `press_kit` / `open_licence_image` は `assetUrl` 必須
- 未知のキーは不可（`rights.decison` のような綴り誤りを通さない）。`manifest.json` の中で `assetId` は重複不可、`entityId` は1種類のみ

### 4.3 判定ログ `decisions.jsonl`

`data/media-staging/<entityId>/decisions.jsonl`。1行に1件のJSON。追記だけで、行を直さない・消さない。同じ資産に複数行あれば**最後の行が有効**。行の形（`MediaDecisionLineSchema`、`src/shared/media-decisions.ts`）:

| 項目 | 意味 |
|---|---|
| `assetId` | 対象。その entity の `manifest.json` にあるもの |
| `decision` | `allowed` / `held` / `blocked` |
| `subjectIsPerson` | 人物が主題なら true。`allowed` には `false` が必要 |
| `reviewer` | 目視した人。例 `owner-delegated-2026-09-29` |
| `reviewedAt` | 判定時刻（ISO 8601）。`review-assets` が押す |
| `note` | `allowed` は何を確認したか、`blocked` は理由（どちらも必須）。`held` は任意 |

合成のルール（`composeEffectiveManifest`）:

- 有効な判定 = 取得時点の記録に、その資産の最後の有効な行を重ねたもの。`rights.decision` `rights.reviewedAt` `subjectIsPerson` を行の値にし、`rights.notes` は行の `note` に、`storage.publicKey` は `allowed` のときだけ原本と同じキーにする。行が無ければ取得時点の記録のまま（`held`）
- 重ねた結果もスキーマで検査する。通らない行（例: `basis=unknown` への `allowed`）は**無視して報告**し、その前の状態を保つ。不正な行が原因で、より許可側の状態になることはない
- manifest に無い `assetId` の行も無視して報告する
- 行そのものが不正（JSONでない、キー違い、`allowed` なのに `subjectIsPerson=true` や `note` 空など）のときは、その entity の台帳全体を信用しない（読み取りは例外）。書きかけの `blocked` 行が壊れているのに、古い `allowed` が有効なままになるのを防ぐため。表示側は例外を受けたら、その entity の画像を何も出さない
- 表示してよいかは純関数 `isMediaDisplayable`（`src/shared/media-decisions.ts`）が決める。**有効な判定が `allowed` かつ `subjectIsPerson === false` のときだけ**真。それ以外（`held` `blocked`、人物、未確認、型が壊れた入力）は偽

## 5. 保存先とR2アップロード

```text
[取得]                              [原本: foundation-raw]                                    [公開: foundation-public]
data/media-staging/ (gitignore)     media/<entityId>/<sha256>.<ext>             ── 有効な判定が allowed かつ 人物でない資産だけ ──►  media/<entityId>/<sha256>.<ext>（同じキー）
  <entityId>/                       media/<entityId>/manifest.<retrievedAt>.json                                                  media/<entityId>/public-manifest.<asOf>.json
    <assetId>.<ext>        ──►      media/<entityId>/decisions.<timestamp>.jsonl     ──►                                          （UI が読む「いま出してよい画像の一覧」）
    manifest.json
    decisions.jsonl
```

- ローカルのステージング `data/media-staging/` は `.gitignore` 済み。ここで人が判定する（第7章）
- **`foundation-raw` へは全資産**（`held` `blocked` も）と、`manifest.json`、`decisions.jsonl` を保存する。原本は `media/<entityId>/<sha256>.<ext>`。台帳は取得のたびに内容が変わるので、時刻入りの名前にする
  - `manifest.<retrievedAt>.json`: `<retrievedAt>` はその manifest の記録のうち**最新の `retrievedAt`**（UTC、`YYYYMMDDTHHMMSSZ`）。中身は `manifest.json` のバイト列そのまま
  - `decisions.<timestamp>.jsonl`: `<timestamp>` は判定ログの**最新の `reviewedAt`**。中身は `decisions.jsonl` のバイト列そのまま。判定ログが無い、または空なら保存しない
- **`foundation-public` へは表示可の資産だけ**を、原本と同じキー `media/<entityId>/<sha256>.<ext>` で複製する。加えて `public-manifest.<asOf>.json`（`<asOf>` は台帳の最新の出来事＝最新の `retrievedAt` と `reviewedAt` の遅いほう）を書く。これが**画面が読む唯一の一覧**で、表示可の資産の `key` `kind` `contentType` 寸法 `attribution` `sourcePageUrl` だけを持つ。レビューのメモ、レビューした人の名前、held / blocked の資産は含めない（`src/shared/media-public-manifest.ts`）
- 時刻は台帳自身の時刻で、実行時刻は使わない。新しい取得も判定も無い状態で再実行しても、同じキーに同じ内容になり、結果は `identical` になる
- 保存はすべて **create-only**（`src/lib/storage/r2.ts` の `putR2ObjectCreateOnly`）。同じキーに同じ内容は `identical`、別の内容は `conflict` として報告して止める。上書きも削除もしない。書き込んだ各オブジェクトは、その場で GetObject して SHA-256 とサイズを照合する（[`architecture/R2_100_YEAR_OPERATIONS.md`](./architecture/R2_100_YEAR_OPERATIONS.md) の不変条件）
- 書く順番は、原本（資産 → manifest → decisions）→ 公開コピー → 公開 manifest。原本が1つでも `conflict` / `error` なら公開側は書かない。公開コピーが1つでも書けなければ、公開 manifest は書かない（一覧に載った画像が存在しない、を作らない）
- 公開の取り下げ（削除依頼、`blocked` への変更）は、資産を含まない**新しい公開 manifest** で表す。画面は最新の公開 manifest だけを読む。公開側の画像オブジェクトそのものを消すのは、CLIではなくオーナーの手作業（第8章）
- `foundation-public` は再生成できる投影物で、原本の代わりにしない。台帳の正本は `foundation-raw` の manifest と decisions

### 決定済み（オーナー決定 2026-09-29）

1. **削除依頼とLock。** `foundation-raw` の `media/` プレフィックスは、削除依頼に応じるため無期限Lockの対象外とする。バケット設定の変更は人が行う。コードと文書はこれを前提にし、Lockの有無を検査しない（設定の現状は未確認）
2. **判定の変更。** `manifest.json` は取得時点の記録として不変。判定の変更は `decisions.jsonl` への追記で持ち、最新行が有効（第4.3節）。当初案の `decisions/<時刻>-<assetId>.json` ではなく、1ファイルの追記ログにした

### アップロードコマンド

```sh
# 書かずに計画だけ確認（R2に触れない。資格情報も要らない。ローカルの台帳・ファイルのSHA-256は検査する）
node --import tsx scripts/media/upload-media-assets.ts --entity ent_keyence,ent_photoai --dry-run

# 実行（オーナー。Keychainから資格情報を渡す）
node scripts/with-r2-keychain-secrets.mjs node --import tsx scripts/media/upload-media-assets.ts --entity ent_keyence,ent_photoai
```

| オプション | 意味 |
|---|---|
| `--entity` | エンティティid（必須。カンマ区切りで複数） |
| `--dry-run` | 計画を表示するだけ。R2を読まない・書かない |
| `--out` | ステージングのディレクトリ（既定 `data/media-staging`） |

- R2の資格情報が無いと実行は失敗する。ローカルへ退避したりはしない。始める前に資格情報とバケット（`foundation-raw` `foundation-public`。環境変数 `FOUNDATION_R2_RAW_BUCKET` `FOUNDATION_R2_PUBLIC_BUCKET` で変更可）の到達性を確認する
- 計画に問題があれば、1件も書かずに止まる。例: 表示可の資産のファイルが無い、SHA-256が台帳と違う、`manifest.json` が壊れている、判定ログの行が不正。表示可でない資産のファイルが無い（削除依頼でローカルを消した、など）場合は警告にして、その資産だけアーカイブしない
- 実行後、`data/media-staging/upload-<開始時刻>.json` に受領記録（各オブジェクトの状態、SHA-256、読み戻しの成否。本文は含まない）を残す
- 終了コードは、全オブジェクトが `created` / `identical` で読み戻しを確認できたときだけ0

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
| `--kinds` | 実行する項目。`favicon,og_image,screenshot_home,screenshot_pricing` から選ぶ（既定は4つ全部）。一括取得は `--kinds favicon,og_image` でスクリーンショットを省く（v3） |
| `--skip-processed` | `<out>/progress.jsonl`（エンティティが終わるごとに1行追記）にあるidを飛ばす。途中で止めても再開できる（v3） |
| `--concurrency N` | 同時に処理するエンティティ数（既定1、最大8）。同じ登録可能ドメインのエンティティは同時に処理しない（v3） |

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
- **再実行**: `manifest.json` は追記のみ。既存の記録は書き換えない（判定は `decisions.jsonl` にあり、取得CLIは触らない）。同じバイト列は `already_in_manifest`。ページの内容が変わればスクリーンショットは別の `assetId` として追記される（不要なら手で消して `--validate`）。既存の `manifest.json` が不正なら、そのエンティティは失敗にして上書きしない
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

### 6.1 公式サイトの製品画面（`screenshot_product`、2026-10-02）

```sh
node --import tsx scripts/media/fetch-official-assets.ts --ids ent_a,ent_b --kinds screenshot_product --concurrency 4
```

トップページと、トップからリンクされた同じサイトの機能紹介・使い方・ドキュメントのページ（リンク文言が features / product / how it works / docs / 機能 / 使い方 / サービス など、またはパスがそれ。ブログ・料金・ログイン・採用・会社概要は除く）を最大3ページ開き、本文中の画像を集める。ログイン・フォーム送信・同意バナーのクリックはしない。robots.txt・403/429・CAPTCHA・公式サイト外は第3章のとおり回避しない。ページを下までスクロールして遅延読み込みの画像を出す。

画像の判定（純関数 `judgeProductImage`、`src/shared/media-product-screen.ts`、規則名 `product-screen-rule:v1`）:

| 結果 | 条件 |
|---|---|
| 採る（screen） | ページ本文にある（ヘッダー・ナビ・フッターは除く）。横長（幅800px以上、比1.05〜2.6）または縦長の端末比（高さ800px以上、幅比1:1.6〜1:2.4）。表示幅240px以上。かつ、パス・alt・class に決定的な手がかり（dashboard / screenshot / screencap / inbox / editor / interface / workspace / console、ダッシュボード / 管理画面 / 画面 など）がある |
| 採らない（promo） | SVG・ICO。パスまたは alt に og / ogp / poster / banner / seo / social / logo / people / testimonial / badge / avatar / award / star / icon / background / headshot などの語。class に logo / avatar / badge / icon / testimonial など。形が合わない（正方形、細長い、幅800px未満）。ヘッダー・ナビ・フッターの画像 |
| 保留（ambiguous） | 形は合うが決定的な手がかりが無い。弱い語（screen / admin / builder / report / demo / mockup / product / feature / app / ui / hero / preview など）は、商品写真・ブログの飾り画像・イラストにも付くため、それだけでは採らない。周りの見出し（Features など）も補助止まり。**保留のまま出さず、人（または Claude）が画像を見て実画面だけを許可する**（判定者名と見た内容を `decisions.jsonl` の note に残し、顔検出も通す）。`MEDIA_STAGE_AMBIGUOUS=1` で大きい順に最大枚数まで保存する |

- 画像は `srcset` / `<picture>` の最大幅のファイルを取る。ダウンロード後に実ファイルの寸法で規則をもう一度かける
- 画像のホストは `og_image` と同じ扱い: 公式の登録ドメイン配下、公式ページ自身が使うサイト作成ツールの配信ホスト、公式名で始まる自社配信ドメイン。それ以外の外部CDNは取らない（`skipped_off_domain`）
- 1事例あたり最大3枚。台帳の `rights.notes` に規則名・根拠・alt・class・見出しを残す（自動判定が同じ入力で判定し直せるように）
- `MEDIA_DEBUG_PRODUCT=1` を付けると、見つけた画像ごとの判定を表示する
- 実行記録の `screenshot_product` の `detail` に、開いたページごとの画像数と、判定の内訳（`screen` / `ambiguous` / `promo(理由)`）が出る

### 6.2 App Store の画像取得（v3）

```sh
node --import tsx scripts/media/fetch-app-store-assets.ts [--limit N] [--ids ent_a,ent_b] [--interval-ms 1100] [--out data/media-staging]
```

対象は `data/catalog-release.json` の公開記録。次のどちらかを満たすものだけ処理する。

1. 記録の `reaudit.sources[].url` か `officialUrl` に `apps.apple.com` のアプリURL（`…/id123456789`）がある。国コードはURLの `/jp/` などから取り、無ければ `us`。`lookup?id=` で引く。
2. 1が無く `officialUrl` がある。社名（括弧書きを除く）で `search?entity=software` を引き、**`sellerUrl` の登録可能ドメインが `officialUrl` のドメインと一致した最初の結果だけ**を採る。一致しなければ skip し、理由を `appstore-progress.jsonl` に残す。`artistViewUrl` は Apple の開発者ページで開発者サイトではないため辿らない。

取るのはアイコン1枚（`artworkUrl512`）とスクリーンショット最大3枚（`screenshotUrls`、無ければ iPad 用）。画像は API の応答が示した Apple の画像CDN（`*.mzstatic.com`, https）からだけ取り、中身が画像か・サイズ上限（6MiB）を検査する。台帳には `kind=app_icon` / `store_screenshot`、`basis=official_marketing_material`、`decision=held`、`sourcePageUrl=trackViewUrl`、`assetUrl`=画像URL、`attribution=出典: <名前> App Store 掲載画像 (<trackViewUrl>)` で追記する（既存の記録は書き換えない）。

- API は既定で1.1秒に1回（最短1秒）。403/429 は30秒から倍々で待って再試行し、3回続いたら実行全体を止める（`AppStoreRateLimited`、終了コード2）。止まったエンティティは未完了のまま残る
- 再開: 進捗は `data/media-staging/appstore-progress.jsonl`。`captured` / `nothing_new` / `skipped` は完了として飛ばし、`error`（HTTPエラー、画像が取れない）は次の実行で再試行する
- ローカルのみ。R2へは第5章のアップロードCLIで出す（オーナーが実行）

## 7. 許可（allowed）にするまで

1. 取得した画像を1枚ずつ開いて見る（`data/media-staging/<entityId>/`）。`review-assets --list` で、いまの有効な判定を一覧できる
2. 確認する
   - 人物が主題でない（顔・肖像のコラージュは不可）
   - 同意バナー、メール登録モーダル、個人情報、ログイン画面、地域・住所の表示が写っていない
   - ロゴ・faviconは識別用の小さい使い方に限る
   - 他社のロゴの羅列、記事画像、SNS、第三者のチャートが主題でない
   - 利用条件（`termsUrl`）に禁止条項が無い
3. `review-assets` で判定を追記する。`manifest.json` は直さない

```sh
# 使える: 人物が主題でないと目視で確認したときだけ。何を確認したかを --note に書く（必須）
node --import tsx scripts/media/review-assets.ts --entity ent_keyence --asset ma_52eecb624158aad6537a1d99 \
  --allow --reviewer owner-delegated-2026-09-29 --subject-is-person false --note "赤黒のKマークのみ。人物・バナーなし"

# 使えない: 理由を --note に書く（必須）。人物が主題なら --subject-is-person true
node --import tsx scripts/media/review-assets.ts --entity ent_photoai --asset ma_8409f3f64466207fb430e72f \
  --block --reviewer owner-delegated-2026-09-29 --subject-is-person true --note "人物写真のコラージュ"

# 保留に戻す
node --import tsx scripts/media/review-assets.ts --entity ent_photoai --asset ma_... --hold --reviewer <name> --note "再確認待ち"

# いまの有効な判定を見る（--entity を省くと全エンティティ）
node --import tsx scripts/media/review-assets.ts --list [--entity ent_photoai]
```

   - `--allow` は `--subject-is-person false` と `--note` が無いと拒否される。ステージングのファイルが台帳のSHA-256と違えば拒否される（審査した画像と、アップロード・表示される画像を同じにするため）。台帳のスキーマが認めない結果（`basis=unknown` への `allowed` など）も拒否される
   - `--block` / `--hold` で `--subject-is-person` を省くと、いま有効な値のまま記録する
   - 撮り直す場合も、古い記録は残して `blocked` にする
4. `node --import tsx scripts/media/fetch-official-assets.ts --validate --ids <id>` で `manifest.json` と実ファイルを検査する。判定ログは `review-assets` が追記のたびに検査し、`--list` の `PROBLEM` 行にも出る
5. R2へ出すのは第5章のアップロードコマンド。画面に出るのは、公開側の一覧に載ってから（第11章）

### 7.2 規則による自動判定（v4、reviewer `auto-rule-v4`。v3 の行も有効な判定として読む）

人手の代わりに規則で `decisions.jsonl` へ追記する。

```sh
node --import tsx scripts/media/auto-review.ts [--entity ent_a,ent_b] [--dry-run]
```

| 結果 | 条件 |
|---|---|
| `allowed`（`subjectIsPerson=false`） | ①`kind` が `favicon` / `app_icon` / `store_screenshot` / `logo`、または `screenshot_product`（台帳に残した根拠から第6.1節の規則で判定し直して screen のもの）、②バイト列から画像として読める、③顔が検出されない、④ファイルのSHA-256が台帳と一致 — の**すべて** |
| `blocked`（理由 `promo_banner_no_product`） | `og_image` は一律（宣伝バナーは実際に使うときの画面ではない）。以前の自動判定（`auto-rule-*`）が `allowed` にしていた行も、新しい `blocked` の行で上書きする。人の判定は触らない |
| `blocked`（`subjectIsPerson=true`） | 顔を検出した |
| 何も追記しない（`held` のまま） | 検査できなかった（Vision でも NSImage 経由でも読めない画像＝壊れたファイル、macOS 13 以前での SVG、ファイル欠落・不一致）／`screenshot_home` `screenshot_pricing`（同意バナーの写り込みがあるので自動では `allowed` にしない）／根拠の印が無い、または判定し直して screen でない `screenshot_product`／その他の `kind` |

- `note` に検査した内容（画像として読める、SHA-256一致、Vision の顔検出で何件か）を書く。バナーや文言の目視はしていない旨も書く
- すでに判定行がある資産（人手の判定、以前の自動判定）は触らない。再実行しても増えない
- 顔検出は macOS の Vision（`VNDetectFaceRectanglesRequest`）。この機械には Swift の開発ツールが入っていなかったため、同じ Vision を macOS 標準の JavaScript for Automation から呼ぶ `scripts/media/detect-faces.js`（`osascript -l JavaScript`）で実装した。Swift が使える環境なら同じ要求を Swift に置き換えてよい
- SVG は Vision が直接読めないため、`NSImage`（macOS 14 以降は SVG を読める）で描いたビットマップに同じ顔検出をかける。これで SVG も `allowed` / `blocked` になる。macOS 13 以前では読めず `held` のまま（2026-10-01 追加）
- 限界: 顔検出は写真の顔だけを見る。イラストの人物、横顔・小さな顔、文字だけのバナー、他社ロゴの羅列は検出しない。だから対象を「公式が自分で出した小さな識別・紹介素材」の kind に限り、表示サイズにも上限を置く（第11章）

2026-09-29の取得で見つかった実例と、その後の判定:

| 対象 | 見つかったこと | 判定 |
|---|---|---|
| Photo AI のトップ、`og:image` | 人物写真のコラージュ | 保留のまま（`subjectIsPerson=true`）。使うなら `blocked` にするか撮り直す |
| Photo AI の料金ページ | 人物なし。料金表とキャンペーン帯 | **`allowed`**（`owner-delegated-2026-09-29`、目視。利用条件ページは未確認） |
| Photo AI のfavicon | 未判定 | 保留 |
| stevehanov.ca のトップ | 人物写真あり | 保留のまま。使うなら `blocked` |
| Costco のトップ | メール登録モーダルが写り込む | 保留のまま。撮り直す（モーダルを押すのは禁止） |
| キーエンス の favicon（赤黒のKマーク） | 人物なし | **`allowed`**（同上） |
| キーエンス の `og:image`（白地にロゴのみ） | 人物なし | **`allowed`**（同上） |
| キーエンス のトップ | 人物なし、製品とロゴ中心 | 未判定（保留） |

## 8. 削除依頼が来たとき

権利者や本人から削除依頼を受けたら、次の順に行う。判断に迷っても、まず表示を止める。

1. **受付を記録する**: 依頼者、日時、対象の画像・URL、根拠を、次の手順の `--note` と `docs/worklogs/` の日付付き記録に残す
2. **表示を止める**: `review-assets --block --note <依頼の内容>` で判定ログに追記する（`manifest.json` は触らない）。続けて `upload-media-assets --entity <id>` を再実行する。当該資産を含まない**新しい `public-manifest.<asOf>.json`** が作られ、画面はそれ以降その画像を出さない（APIの応答キャッシュは60秒、ブラウザも60秒までで切れる）。ローカル開発（`local_staging`）では追記の直後から出なくなる
3. **公開側の画像そのものを消す**: 公開ドメインからは、オブジェクトを消すまで直接URLで見えてしまう。`foundation-public` の該当オブジェクト（`media/<entityId>/<sha256>.<ext>`）を**オーナーが手作業で削除**する。アップロードCLIは削除しない。`foundation-public` は再生成できる投影物なので、消してよい。CDNのキャッシュがあれば無効化する
4. **原本の扱いを決める**: `foundation-raw` の `media/` は無期限Lockの対象外（第5章）なので、依頼者が原本の削除まで求める場合は削除できる。削除は事前にオーナーの承認を得てから行う。削除しても、SHA-256と `blocked` の記録（墓標）は判定ログと `manifest.json` に残る。同じバイト列は同じ `assetId` になるので、ステージングの `manifest.json` が残っている限り、取得CLIが再取得しても `already_in_manifest` として `blocked` のまま保たれる
5. **差し替える**: 第2章の優先順位で次の候補を探す。自前生成（イラスト・チャート）、プレスキット、別ページの公式スクリーンショット、CC画像の順。見つからなければ画像なし（社名などの文字表示）にする。新しい画像も `held` から始め、第7章の確認を通す
6. **確認する**: `GET /api/media?entity_id=<id>` の応答から画像が消えたこと、公開URLが取得できなくなったこと（手順3のあと）を確認し、結果を受付記録に追記する

## 9. 既存の権利登録簿との関係

権利の判断は2層に分かれる。

| 層 | 場所 | 粒度 |
|---|---|---|
| 登録簿 | Universal Foundation `registry/rights/policy.*.v1.json`（提供元ごとの利用方針。use modeごとに `allowed` などを持つ。画像・メディアの公開表示は `public_media_display`。名称はオーナー指定で、実ファイルは未確認） | 提供元（ソース）単位 |
| 台帳 | 本書の `manifest.json` + `decisions.jsonl` | 画像1枚単位 |

現在の公開条件（オーナー決定 2026-09-29）:

- 画像を出してよいのは、**台帳の有効な判定が `allowed` かつ `subjectIsPerson === false` の資産だけ**。判定するのは純関数 `isMediaDisplayable`（第4.3節）で、アップロード（第5章）も、API（第11章）も、同じ関数を通る。`held` / `blocked` / 人物 / 未確認は出ない
- 人が `review-assets` で `allowed` にするまで、何も公開されない。自動取得だけで公開されることはない
- 権利ゲート `src/lib/foundation/publication-rights.ts` と `src/lib/company-access/public-entity.ts` は変更していない。画像はこれらとは別の経路（台帳の判定）で出る
- `official_marketing_material` は、提供元ごとの許諾ではなく、オーナーが2026-09-29に決めた区分（識別・説明目的、出典明記、削除依頼に応じる）。台帳のスキーマで表せない許可を `allowed` と書かない。足りないときは、足りない方針・スキーマを登録簿側で解決する（`COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md`）

**登録簿との関係（リード判断 2026-09-29）**: 台帳の人手判定は登録簿と矛盾しない。理由は次のとおり。

- 固定スナップショット `data/foundation-public-rights-snapshot.json` は UF commit 7e14b5e4 から再生成済みで、方針ごとに `public_media_display` を持つ。公式サイト方針 `rights.official-company-website.v1` は `restricted`（「提供元が再利用向けに公開している素材に限り、資産ごとの条件を記録したうえで表示」）。プレス配信も `restricted`。アプリストア・GitHub・SEC と Tier 2 の全提供元は `blocked`。
- 取得器 `scripts/media/fetch-official-assets.ts` は `src/shared/media-fetch-policy.ts` により、その entity の公式ドメイン（とサブドメイン）からしか取得しない。したがって台帳に載る資産はすべて公式サイト方針の対象で、`restricted` が要求する「資産ごとの人手確認と条件の記録」が、まさに `review-assets --allow --note` の判定行である。`blocked` の提供元（SNS のスクリーンショット、第三者の図表、有料記事）の素材は取得段階で台帳に入らない。
- **食い違い（v3）**: 上のスナップショットでアプリストアの `public_media_display` は `blocked` だが、オーナー決定（2026-09-29 #2）により App Store の掲載画像（アイコンとストア画像）は `official_marketing_material` として取得・表示する。**登録簿とこの実装は食い違っている**。実装は台帳の判定（1枚ごとの `allowed`）で表示を決め、登録簿の値を読まない。登録簿（UF `registry/rights/policy.*.v1.json`）の更新は UF 側の作業で、オーナーに渡す（このリポジトリからは行わない）。更新されるまで、App Store 由来の画像は「登録簿では blocked、オーナー決定で例外」として扱う。
- 以前の版（v1）が想定した「登録簿の `public_media_display` を AND する」機械的判定（表示時に `sourcePageUrl` から方針を解決し、entity の公式ドメインと突合する）は未実装。現状は取得時のドメイン制限と人手判定で同じ条件を満たしているが、公式ドメイン以外の取得経路を将来追加する場合は、この AND を `isMediaDisplayable` の手前に実装してから追加すること。

## 10. 既知の制約・未実装

- 未実装・未実施: R2への実書込み（オーナーが第5章のコマンドで実行）、`CLOUDFLARE_R2_PUBLIC_DOMAIN` を `foundation-public` に向ける設定、`media/` プレフィックスをLock対象外にするバケット設定の確認（人が行う）、登録簿との連携（第9章）、優先1・2・4の取得の自動化
- 本番の読み取り（`foundation-public` の公開 manifest を読む経路、第11章）は、疑似ストアのテストまでで、**実際のR2では未検証**
- 本番の読み取りは、`foundation-public` の `media/` 以下の一覧を1分キャッシュして最新の公開 manifest を探す方式（`src/lib/media/public-reader.ts`）。オブジェクトが2万件を超えると部分的な一覧を返さず503にするので、その規模になる前に索引オブジェクト方式へ移す
- ボット対策のあるサイトは取れない（`blocked_by_site`）。回避はしない
- スクリーンショットには同意バナーやモーダル、地域に応じた表示（例: Costco の「My Warehouse」）が写り込む
- 公式サイト判定は近似。og:image を別ドメインのCDNで配信しているサイトは `skipped_off_domain` になる。実行記録のURLを見て、人が扱いを決める
- 公式URLがトップから別パスへリダイレクトするサイトでは、`sourcePageUrl` はリダイレクト後のURL（例: `https://stevehanov.ca/blog`）
- キーエンス（`ent_keyence`）は `data/catalog-release.json` に入っていない。本番構成（E2Eの本番ビルドを含む）では、`/?entity=ent_keyence` は「詳細の公開確認が完了していない」の表示になり、一覧にもインスペクターにも出ない。画像を `allowed` にしても、キーエンスの詳細が公開されるまで画面には現れない。ギャラリーの画面確認は、リリースに入っている Photo AI で行っている
- 台帳スキーマは zod で書いた。zod はこれまで `eslint-plugin-react-hooks` 経由の間接依存だったため、`package.json` の `dependencies` に追加し、`pnpm-lock.yaml` の記載を合わせた（`pnpm install --frozen-lockfile` は本タスクでは未実行）
- 検証: `pnpm vitest run src/shared/media-asset-schema.test.ts src/shared/media-fetch-policy.test.ts src/shared/media-decisions.test.ts src/shared/media-asset-store.test.ts src/shared/media-display.test.ts src/shared/media-public-manifest.test.ts src/lib/media src/app/api/media src/platform/hooks/entity-media-loader.test.ts src/platform/components/grid/EntityLogo.test.tsx src/features/company-inspector/ui/EntityMediaGallery.test.tsx`（台帳スキーマ、判定ログの合成、表示条件、ストア、アップロード計画と実行、API、画面部品）。画面は `e2e/media-gallery.spec.ts`（`data/media-staging` にPhoto AIの許可済み画像が無ければskip）

## 11. 画面表示（API・UI）

### データ経路

| 環境 | 読み先 | 画像URL |
|---|---|---|
| 開発（`next dev`）とローカルE2E | `data/media-staging` の台帳 + `decisions.jsonl`（`local_staging`） | `/api/media/file?entity_id=&asset=`（ローカルファイルを台帳のSHA-256と照合してから返す） |
| 本番 | `foundation-public` の `media/<entityId>/public-manifest.<asOf>.json` のうち最新（`foundation_public`） | `CLOUDFLARE_R2_PUBLIC_DOMAIN` + `/` + 画像のキー。ドメインが無い（または https のオリジンでない）時は、アプリの `/api/media/file` が最新の公開目録に載っている画像だけを、目録のバイト数・sha256 と一致した時に返す（2026-10-01） |

環境変数（サーバー側。`src/lib/media/source.ts`）:

| 変数 | 意味 |
|---|---|
| `MEDIA_SOURCE` | `local_staging` / `foundation_public` / `off`。未設定なら `next dev` は `local_staging`、それ以外は `foundation_public`。他の値は `off`（何も出さない） |
| `MEDIA_STAGING_DIR` | `local_staging` の読み先を移す。E2Eのサーバーは本番ビルドをリポジトリの `data/media-staging` に向けるために使う（`playwright.config.ts`） |
| `CLOUDFLARE_R2_PUBLIC_DOMAIN` | `foundation-public` を配信するオリジン（例 `https://assets.example.com`）。**このドメインが `foundation-public` の `media/...` をルートで返す設定は人が行う（未確認）** |

### `GET /api/media?entity_id=<id>[&entity_id=<id>...]`

- 1回に40件まで、URL全体で8,192文字まで。id は台帳の形式（`ent_` で始まり英数字 `_` `-`、128文字まで）だけ。違えば400
- 応答は `make-money-media-response.v1`: `{ schema, source, available, reason?, entities: { <id>: [画像...] } }`。画像を持つ entity だけが入る。画像は `assetId` `kind` `url` `contentType` 寸法 `attribution` `sourcePageUrl` `retrievedAt`。**レビューのメモ、レビューした人、`held` / `blocked` / 人物の資産は含めない**
- `available=false` は、その環境では何も出さないという意味（画像は0件）。R2の読み取りに失敗すれば503
- キャッシュ: `local_staging` は `no-store`、それ以外は `private, max-age=60`
- `GET /api/media/file` は `local_staging` だけ。`allowed` かつ人物でなく、ファイルが台帳と一致する画像だけを返す。それ以外は404（`held` と `blocked` は「無い」と同じ扱い）。`nosniff` と `sandbox` のCSP付き

### 画面

- **一覧の各行**（`InstitutionalDataGrid`、モバイルカードも）: 社名の前に20px角の画像を出す。優先順は `logo` → `app_icon` → `favicon`（同じ種類が複数あれば最新）。宣伝の `og_image` は出さない（2026-10-02）。画像が無い行は何も出さない。表示中の行のidをまとめて（40件ずつ）APIに聞く。出典はツールチップ
- **インスペクター**（`EntityMediaGallery`）: 「事業の概要」の直下に「製品画像」。対象は、実画面（`store_screenshot` → `screenshot_product` の順に新しいものから、合わせて最大3枚）、続いて `screenshot_home` → `screenshot_pricing` → `app_icon`（各種類の最新1枚）。`og_image` は出さない（2026-10-02）。**各画像の下に、必ず出典（`attribution`）、出典ページへのリンク（`sourcePageUrl`、新しいタブ・`noopener noreferrer nofollow`）、由来の表記（`［公式サイト］` または `［App Store 掲載画像］`）を出す**（v3）。遅延読み込み。画像が読めなければ、その画像と出典ごと隠す。画像が1枚も無い事例には、セクション自体を出さない（**2026-09-30 廃止** → OWNER_INTENT 7章: 出すのは出典リンク付きの小さなサムネだけ。ギャラリー、拡大、ダウンロードは付けない）
- **表示サイズの上限（v3）**: 著作権法47条の5（軽微利用）の考え方に倣い、識別・説明に足りる小ささに限る。アイコン（`app_icon` / `favicon` / `logo`）は長辺128px以下、プレビュー（`og_image`、スクリーンショット）とストア画像は長辺480px以下のサムネイル。**守り方は表示側のCSS**（`EntityMediaGallery` が `maxWidth` / `maxHeight` を 128 / 480 に固定、`object-fit: contain`。一覧のロゴは20px）で、保存する原本とR2の公開コピーは縮小しない（公開コピーは原本と同じキー・同じバイト列という第5章の不変条件を保つため）。定数は `src/shared/media-display.ts` の `MEDIA_ICON_MAX_PX` / `MEDIA_THUMBNAIL_MAX_PX`。実画面は1事例3枚まで（`MEDIA_SCREEN_LIMIT`）
- `kind` を足すときは `src/shared/media-display.ts` の `MEDIA_LOGO_KINDS` / `MEDIA_SCREEN_KINDS` / `MEDIA_GALLERY_KINDS` を直す

### 確認手順

```sh
pnpm vitest run src/lib/media src/app/api/media src/shared/media-display.test.ts    # API・表示条件・部品
pnpm build && pnpm exec playwright test e2e/media-gallery.spec.ts                    # 画面（要 data/media-staging）
node --import tsx scripts/media/review-assets.ts --list                              # 有効な判定
```
