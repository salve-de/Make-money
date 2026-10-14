# MAKEMONEY｜他AIから受け取る複数事例の一括取り込み

更新：2026-10-14。対象：ChatGPTの定期タスク／別AIの収集担当／ローカルの取り込み担当。**GitHub Actionsは使用しない。** 本番R2・本番公開は一切実行しない。

## やりたいこと

1. 複数AIは新しい実事例を**原典調査→重要度判定→自然な掲載原稿→必要な図→品質確認**の順に制作する。
2. 各AIが同じ形式の**フォルダまたはZIP**で納品する。収集担当は他人のリポジトリを修正する必要がない。
3. 取り込み担当のAIが**1コマンドで全件検査→ローカルのMAKEMONEY本体UIに反映**する。審査待ちの記事は公開承認と区別する。
4. 合格した原稿と調査資料を、必要なときだけ `--install` でローカルの本体リポジトリへ正式に取り込む。R2保存と本番公開は別工程。

この「すぐ見られる」は**ローカルプレビュー**を意味する。まだCloudflare R2への自動保存や本番の一万件公開を完了した意味ではない。

## AIが納品するパッケージ契約

フォルダ構造は固定する。1バッチ最大150事例。すべて `reviewOnly: true` で、`approved` をAIが自称しない。

```text
my-batch/
  manifest.json                   # schema: make-money.case-batch.v1
  cases/
    ent_case_name/
      research.json                # 原典・事実・記録ID・時点・権利・未確認
      article.json                 # make-money.case-article.v2、原稿・図参照・recordKeys
      figures/                     # 必要な場合のみ独自のSVG
        one-factual-visual.svg
      README.md                    # 省略可。根拠・品質確認・差戻し事項
    ent_another_case/
      research.json
      article.json
```

`manifest.json`には `batchId`、`cases`（entityId・name・officialUrl・country・category）、ファイル別 `sha256`、`reviewOnly:true` を収録。数字と文章は `article.json` の `recordKeys` から `research.json.records` へ追跡可能でなければならない。SVGは外部参照・スクリプト・HTML埋め込みを禁止。

**大事な編集基準**：`docs/CASE_COLLECTION_EDITORIAL_STANDARD.md` と `docs/CASE_COLLECTION_AGENT_RUNBOOK.md` を読む。集客・料金・利益が全部公表されるとは限らない。8章は分類であり、章を機械的に水増ししない。見出しはその商売の特有の行動・構造・結果を直接示す。意味のない図は作らない。

## 今回の実サンプル

`fixtures/case-batches/20261014-diverse-cases-v1/`

- **Scrub Daddy**：整備工場に売れなかった素材を家庭のスポンジに転用。テレビで特徴を実演して販路を広げた。温度で硬さが変わる実用図。
- **Exploding Kittens**：発売前のカードゲームに219,382人が支援した。2015年の支援額と現在の商品価格、会社の利益を混同しない資金図。
- **Sleep Jar**：既存のPR #226の調査済み事例。今回のバッチには再収集として混ぜず、既存のローカル記事から併せて画面に表示。

### 1. 内容とファイルの検査だけをする

```bash
pnpm case:batch:preview -- --input fixtures/case-batches/20261014-diverse-cases-v1 --inspect-only
```

manifestとSHA、重複ID、参照関係、危険なファイル名などを検査。既存の本体データは変更しない。

### 2. 本体のローカルUIでまとめて確認する

プロジェクトの作業ブランチ（新しい記事形式PR #224＋Sleep Jar PR #226に積み重なる本ブランチ）で、依存関係を入れてから実行。

```bash
pnpm install --frozen-lockfile
pnpm case:batch:preview -- --input fixtures/case-batches/20261014-diverse-cases-v1
```

既存のケース記事スキーマ・図・本文・出典を検証して、無視対象の `.catalog-release-preview/` に**プレビュー専用の目録**を作成する。Next.jsの既存画面が起動し、全事例を選べる。

- http://127.0.0.1:3100/?entity=ent_scrub_daddy_20261014
- http://127.0.0.1:3100/?entity=ent_exploding_kittens_20261014
- http://127.0.0.1:3100/?entity=ent_sleep_jar_20261014

終了は Ctrl+C。記事が見えない場合は成功を装わず停止する。

**起動前の検査だけ**なら `--prepare-only` を付ける。`--port 3110` でローカルポートを変更可能。

### 3. 他AIからZIPを受け取る場合

**ZIP直下**に `manifest.json` と `cases/` が存在するように圧縮する。

Macのターミナルで：

```bash
cd fixtures/case-batches/20261014-diverse-cases-v1
zip -r /tmp/makemoney-cases.zip manifest.json cases
cd -
pnpm case:batch:preview -- --input /tmp/makemoney-cases.zip --prepare-only
```

入力されたパスはZIPまたはフォルダとして読み込み、ZIPのファイル名、サイズ、内容ハッシュを検査する。ファイルは任意のディレクトリへ直接解凍せずメモリで読み、確認後に専用の一時領域へ書き出す。

### 4. 内容をローカルの本体リポジトリへ保存する

レビュー用に見られることと、GitHubで管理する記事として取り込むことを区別する。明示的に以下を実行した時だけソースと目録用JSONを書き込む。

```bash
pnpm case:batch:preview -- --input /tmp/makemoney-cases.zip --install --prepare-only
```

書き込むものは `data/case-articles/<id>/`、`data/case-articles.json`、`data/entity-additions/gen5-case-articles.json` のローカルファイルだけ。既存IDは上書きせず停止。失敗時は取り込み分をロールバックする。Gitへのコミット・mainへのマージは自動では行わない。

**この操作でもレビュー状態はready_for_reviewのまま。** 本番R2・アップロード用マニフェスト・公開用ポインタは変更しない。

## 定期的な大量収集に向けた分担

- **ChatGPTオートメーションなど**：週・日などの合意した頻度で新規の候補発見と調査、記事の編集、図解の意味審査、完成したバッチの納品を担う。現在、定期実行自体は作成・再有効化していない。
- **別のAI（取り込み担当）**：納品物をまとめ、重複と形式を検証し、ローカルUIで目視レビューしてから、必要なバッチだけインストールする。
- **コード**：GitHubで管理するが、**GitHub Actionsは使わない**。過去にGitHub書き込みが安全保護で拒否されたため、納品ZIPからのローカル取り込み経路を必ず用意する。
- **R2・本番配信**：独立した品質・権利ゲートが確認できた時だけ、既存の正式な配信経路へ渡す。ローカルバッチを自動で公開承認しない。

一万件に拡張する場合も、1ファイル1万件の巨大JSONへ情報を固定するのではなく、バッチごとにIDと版を持って保持し、差分更新・個別検索・個別読込に移行する。今回の検証はまず**他のAIからの受渡し→ローカルの実画面表示**に対象を限定する。

## 他AIに送る一文

> MAKEMONEYの `docs/CASE_BATCH_DELIVERY.md`、`docs/CASE_COLLECTION_AGENT_RUNBOOK.md`、`docs/CASE_COLLECTION_EDITORIAL_STANDARD.md` を読んで、新しい事例を調査・原稿・図解・根拠・検査結果まで制作し、`make-money.case-batch.v1` のフォルダまたはZIPで納品してください。既存の事例ID、収集予約、品質・権利条件を確認し、未承認のまま渡してください。GitHub Actions、R2、本番公開は使わないでください。
