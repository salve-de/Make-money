# Foundation R2データのUI読取経路

## 目的

Make-Moneyの台帳画面で、Universal Foundationが正本として定義する既存の`foundation-lake`を読み取り、保存済みの事例を表示する。画面専用の正規データや、UI用の別R2インデックスは作らない。

## 読み取るデータ

- `ds.business.entities.core`: 事例一覧の正規Entity。キーの接頭辞は`datasets/ds.business.entities.core/v1/entities/`。
- `ds.business.research-bundles.derived`: 選択したEntityに紐づく既存の調査bundle。claims、metrics、money_signals、events、relationships、observations、derivedを、bundleの内容と検証状態を保ったまま詳細表示する。

関連するTyped Dataset（claims、metrics、money-signals等）は、bundleに保持された事実を表示するための共通データであり、Make-Money専用の別形式へ変換して保存しない。

## API

`GET /api/businesses?limit=100&cursor=<cursor>`

- Entityキーを既存R2の`ListObjectsV2`またはWorkers R2 `list`でページ取得する。
- 各Entityオブジェクトを読み取り、名前、種別、別名、識別子、ドメイン、状態、観測時点、Evidence IDを表示する。
- `nextCursor`と`hasMore`を返し、UIの「次の100件をR2から読む」で続きを取得する。

`GET /api/businesses?entity_id=<entity_id>`

- Entity本体を読み取った後、既存research-bundleを検索する。
- 読み取ったmetrics、money_signals、claims、events、relationships、observations、derivedを、`verification_status`、`origin_type`、期間、scope、basis、Evidence IDとともに表示する。
- 売上、利益、手取り、費用などは保存値がない場合に推測で補わず、「未確認」と表示する。

## 禁止事項

- UI表示のための新しいschema、R2保存方式、集約indexを追加しない。
- 既存Entity、Typed Dataset、research-bundleを上書き、削除、移動、改名しない。
- 静的な13件や仮の月商・利益を、R2の読取結果として表示しない。
- `canonical_identifier`をURLと決めつけない。HTTP URLまたは`domain:`だけを公開ページへのリンクにする。

## フォールバック

ローカル開発やR2 binding未設定時は、APIの`source`を`static`または`database`として返し、従来の台帳を維持する。R2データとして誤表示しない。R2が接続できている場合は、空の結果も`source: "r2_lake"`のまま扱い、静的データへ黙って戻さない。

## 将来の10万件対応

一覧はページ取得、詳細は選択時取得とする。検索・絞り込み・集計を10万件規模で行う場合も、正本データを変更せず、Foundationが承認した再構築可能なViewまたは検索基盤を別途利用する。Make-Moneyの画面コードで新しい永続インデックスを書き込まない。
