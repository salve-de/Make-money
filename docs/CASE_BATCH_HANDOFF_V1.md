# MAKEMONEY｜事例一括納品・一括取り込み契約 v1

更新日: 2026-10-14。**GitHub Actions、R2書込み、本番公開は使用しない。**

## 結論：他のAIへ渡す納品物は「ZIP 1個」でよい

今後、ChatGPT・定期タスク・外部AI・人間の調査担当は、**事例を読む人向けに完成させた記事と、検証可能な原調査データを同じZIPに入れて渡す**。別のAIは中身を構造と根拠で検査し、まとめてローカルのMAKEMONEYに取り込んでプレビューを作る。

- 調査の正本と表示原稿は別：`research.json` と `article.json`。図解は `figures/*.svg`。
- 全記事は既存の [CASE_COLLECTION_AGENT_RUNBOOK.md](./CASE_COLLECTION_AGENT_RUNBOOK.md)、[CASE_COLLECTION_EDITORIAL_STANDARD.md](./CASE_COLLECTION_EDITORIAL_STANDARD.md)、[CASE_ARTICLE.md](./CASE_ARTICLE.md) に従う。8分類の中身・重要度は事例ごとに変える。
- 出典・時点・原文確認の結果・人物／製品名・権利判断・未確認・編集判断は消さない。AIによる本文の自然さは独立レビューする。図は必要な時だけ。
- 未審査の記事は `reviewState: "ready_for_review"`。**パッケージ受理と公開承認は別**。他のAIが勝手に `approved` へ変更することは禁止。
- 納品にGitHubの書込み能力は要らない。安全制限で保存できなければ、**ZIPを作成し、人間がダウンロードして引き渡す**。外部AIがデータの保存先を創作しない。

## 1. バッチZIPの中身

解凍後のフォルダ構造（下記は例）：

```text
MAKEMONEY_case_batch_20261014/
  manifest.json
  cases/
    ent_1800gotjunk_20261014/
      article.json
      research.json
      figures/gotjunk-roles.svg
      README.md
    ent_shutterstock_20261014/
      article.json
      research.json
      figures/shutterstock-share.svg
      README.md
    ent_coolest_cooler_20261014/
      article.json
      research.json
      figures/coolest-delivery.svg
      README.md
```

`manifest.json`：

```json
{
  "schema": "make-money.case-batch.v1",
  "batchId": "multi-industry-pilot-20261014",
  "createdAt": "2026-10-14T10:35:00Z",
  "cases": [
    {
      "entityId": "ent_1800gotjunk_20261014",
      "files": {
        "article.json": "<SHA-256 of article.json>",
        "research.json": "<SHA-256 of research.json>",
        "figures/gotjunk-roles.svg": "<SHA-256 of svg>",
        "README.md": "<SHA-256 of README.md>"
      }
    }
  ]
}
```

実際のファイルでは文字列の例示部分を各ファイルの **64桁SHA-256** へ置換する。**ファイルのbytesが変われば指紋も変える。** `article.basedOn.submissionSha256` は `research.json` のbytesのSHA-256。

## 2. 取り込み手順（Macローカル）

**このブランチ** `research/case-batch-intake-20261014`（基盤PR #224＋Sleep Jar PR #226から派生）の独立作業場所で実行する。現在は **未マージの検証実装**。mainでは動くとみなさない。

初回：

```bash
git fetch origin research/case-batch-intake-20261014
git worktree add --detach ../Make-money-case-batch origin/research/case-batch-intake-20261014
cd ../Make-money-case-batch
pnpm install --frozen-lockfile
```

例えばダウンロードしたZIPをダウンロードフォルダに展開：

```bash
unzip -q ~/Downloads/MAKEMONEY_3事例_一括取り込みパッケージ_20261014.zip -d ~/Downloads/
```

**最短の確認方法（取り込み・検証・本体UI起動を1コマンド）**：

```bash
pnpm case:batch:review -- --from ~/Downloads/MAKEMONEY_case_batch_20261014
```

このコマンドはZIPを解凍済みであることが前提。マニフェスト検査→記事・図解・調査の検査→ローカル目録の生成→本物のNext.js開発サーバー起動を行う。URLをターミナルに表示する。**他の仕事のworktreeや本番設定へ影響しないため、独立したworktreeで実行すること。** 既に3100番を使っている場合は `--port 3110` を追加。

**ローカルプレビューまで1コマンド**：

```bash
pnpm case:batch:import -- --from ~/Downloads/MAKEMONEY_case_batch_20261014 --preview
```

取り込み前の検査だけ：

```bash
pnpm case:batch:import -- --from ~/Downloads/MAKEMONEY_case_batch_20261014 --check-only
```

画面を起動：

```bash
CATALOG_RELEASE_DIR="$PWD/.catalog-release-preview" pnpm dev -- --hostname 127.0.0.1 --port 3100
```

Safariで、実際のMAKEMONEY事例詳細画面を開く：

- http://127.0.0.1:3100/?entity=ent_1800gotjunk_20261014
- http://127.0.0.1:3100/?entity=ent_shutterstock_20261014
- http://127.0.0.1:3100/?entity=ent_coolest_cooler_20261014

**既存の `CaseArticleView` / `CaseArticleBlocks` がデータから描画する。** 別のHTMLモックを開く手順ではない。

この処理は、事例の原稿・調査・SVGをGit管理下の `data/case-articles/` に増やし、表示用 `data/case-articles.json` と、目録にない事例の身元 `data/entity-additions/gen5-case-articles.json` を生成する。公開版の `data/catalog-release.json` や `data/entities-index.json` は触らない。プレビューは `.catalog-release-preview/` へ隔離する。

## 3. 取り込み時の拒否条件

`scripts/case-articles/case-batch.mjs` が一括で検査する：

1. バッチID、事例IDの形式、重複ID、一覧に書かれていないファイル、意図しないパス／シンボリックリンク
2. 全ファイルのSHA-256、および記事にある研究データの指紋
3. 現行の `checkArticleDir` による記事スキーマ、出典番号、章順、円換算、SVG構造、`recordKeys`、行長
4. 既存IDと同一データならスキップ。内容が異なる場合は**自動上書きを止める**（訂正は別の版管理・レビュー手順）
5. 全件を事前検査してからコピー。生成失敗時は今回の新規事例と今回変更した表示用ファイルを復元する
6. `--preview` で生成後、ローカル目録の実物に事例IDが載ったことを読み戻す。表示が確認できない場合は成功と報告しない

**これは第一段階の受入器**。今のプログラムが全自動でリサーチや独立読者審査、商用権利確認をするわけではない。特に文章の意味・数値の原典照合は別検査。ZIPを読み込めても自動で `approved` にはしない。

## 4. 他のAIが次にすべきこと（コピペ用）

> MAKEMONEYのGitHubにある `docs/OWNER_INTENT.md`、`docs/CASE_COLLECTION_EDITORIAL_STANDARD.md`、`docs/CASE_COLLECTION_AGENT_RUNBOOK.md`、`docs/CASE_BATCH_HANDOFF_V1.md` を読み、事例の事実調査から重要度による編集、根拠付き日本語記事、必要な図解まで制作してほしい。既存事例と予約を調べて重複を防ぎ、実装中の `make-money.case-article.v2` 形式で各事例の `research.json`・`article.json`・`figures/*.svg` と、全ファイルのSHA-256を記載したバッチ `manifest.json` を作り、ZIPで納品する。記事の重要情報を冒頭に配置し、章間の意味的重複、内容がない図、出典なしの数字、不自然な日本語を独立評価して差し戻す。今は `ready_for_review` までに留める。本番公開、R2書込、GitHub Actions、定期タスクの追加・起動は禁止。保存権限が無ければZIPだけ納品する。

## 5. ChatGPTの定期実行にする時

- 定期実行が担当するのは **発見・調査・原稿・図解・ZIP納品まで**。ChatGPTの定期実行に、GitHub/R2への外部書込みを成功前提で要求しない。
- 日々の件数は品質と出典の確認に基づいて決める。**1万件の処理量・コストは実測で見積もる**。公開記事に必要な内容を減らして数を優先しない。
- 将来、作られたZIPが共有フォルダや連携サービスを経由して自動で受信できるときは、同じmanifest契約のまま別AI／ローカル受入器が取り込み、`--preview` でUIのローカル版まで生成する。
- ChatGPT定期実行がZIPファイルを保存・受け渡しできない場合は、実行ログや出典・成果物を失ったことを隠さず報告する。**GitHub等での保存成功を偽らない**。
- 現時点でスケジュールは **未設定・未有効化**。設定変更はオーナーの明示指示まで行わない。

## 6. 今回の実データ3件での実証範囲

- 1-800-GOT-JUNK?：現場回収、トラックの占有量で価格を決め、本部が加盟店売上から料金を受ける事業
- Shutterstock：制作物の使用ライセンスと権利者分配、2025年の売上構成
- Coolest Cooler：クラウドファンディングで資金を集めた後、製造・発送費の問題を経て閉鎖した事業

3件とも、Web原典を調べて文章とSVGを個別に編集した**実例**。この3件のZIPに限り、ファイルと原稿の識別子・出典参照・ハッシュ等を作成側で検査した。**MAKEMONEYの実際のMacのNext.js UIでのE2E試験、別AIの独立内容審査、R2本番書込み、1万件での性能試験は未実施**。それらを完了済みと扱わない。

**1万件への拡張課題：** 大きな `data/case-articles.json` の全件再生成や共通記事の一括配信を、ID分割保管・差分更新・検索索引・表示用APIの個別取得へ移行すること。現行の小ロット受入器を1万件完成済みと呼ばない。
