# 事例の記事（case-article）

事例の詳細に出す、新しい記事の形式。旧形式の「章ごとの文」（`data/case-pages/<事例ID>.md`）と並んで使う。旧形式の事例はそのまま。

## 形

- 分類は7つで固定: 概要・仕組み・お金・集客・運営・経緯・出典。詳細の上に目次として固定で出る。データに無い分類は出ない。
- 章の中は、種類の決まった部品を並べる: 結論の1文、項目の行、段落、手順、料金の表、列のある表、年表、箇条書き、小見出し、図。
- 事例ごとに画面を手書きしない。どの事例も同じ表示部品（`src/features/company-inspector/ui/CaseArticleView.tsx`）がデータから描く。
- 定義は `src/shared/case-article.ts`。

## 置き場所

`data/case-articles/<事例ID>/`

| ファイル | 中身 |
| --- | --- |
| `article.json` | 掲載用の原稿（読む人向けの文と構成の正本）。各文は `recordKeys` で調査の記録に結ぶ |
| `research.json` | 元の調査データ（事実・数字・出典の正本）。受け取ったまま変えない |
| `figures/*.svg` | 自作の図。写真や外部の画像は入れない（既存の画像欄が審査して出す） |

`article.json` の `editorialChanges` に、原稿で変えた点を残す（円の概算の追加、画面から外して内部に持つ文、調査にあって記事に無い情報、記録に結べなかった文）。

## 流れ

1. `pnpm case-articles:build` … 原稿を検査し、画面用の `data/case-articles.json` を作る（`recordKeys`・審査の状態・編集の記録は画面用から外れる）。`pnpm lint` に検査（`--check`）が入っている。
2. 新しい事例は `node --import tsx scripts/case-articles/add-records.ts` で身元の記録（`data/entity-additions/gen5-case-articles.json`）を作る。
3. 公開版を作る時（`scripts/prepare-catalog-release.ts`）、**`reviewState` が `approved` の記事だけ**が事例の `reader.display.caseArticle` に入る。それ以外の記事は無いものとして扱い、その事例のこれまでの扱いを変えない。
4. 新しい事例を本番に出すには、身元の記録を事例の一覧（`data/entities-index.json`）へ合流させる手順が別に要る（公開データを作る直前に行う）。

検査の中身: です・ます調、一覧の1行40字、外貨の直後の円の概算（為替は `docs/CASE_TEXT_STANDARD.md`）、出典の番号、図のファイルと中身、分類の順、調査データの指紋、`recordKeys` が調査の記録にあること。

## 審査前の記事を手元の画面で見る

```bash
pnpm case-articles:build
node --import tsx scripts/prepare-catalog-release.ts --preview-articles
CATALOG_RELEASE_DIR=$PWD/.catalog-release-preview pnpm dev
```

未審査の記事も入れた版を `.catalog-release-preview`（git に入れない）へ書く。公開版の目録・事例の一覧・R2 は書き換えない。
