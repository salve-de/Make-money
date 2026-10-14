# MAKEMONEY｜他AIの調査・記事・図解を一括取込して本体UIで確認

更新日: 2026-10-14。状態: **ローカル確認用の実装候補**。GitHub Actions、新規定期タスク、本番公開、R2書込みは行わない。

## できること

ChatGPT／別AI／人間が複数事例について、一次情報の調査、読者向けの日本語原稿、必要なオリジナル図解を作成する。それらを**1個のZIP**にし、受取側はSHA256・出典参照・記事形式・図の安全性を検査してから、**既存のMake-Money Next.js UIで全件を確認**できる。

これは1件ずつHTMLを手編集する方式ではない。各事例に独立した `research.json`、`article.json`、`identity.json`、必要な `figures/*.svg` を持たせ、既存の `scripts/case-articles/build.ts` と `scripts/prepare-catalog-release.ts --preview-articles` に渡す。既存デザイン、見出し帯、目次、文字体系を変更しない。

## 作る側のAI：必ず読む資料

1. `docs/OWNER_INTENT.md`
2. `docs/DATA_COLLECTION_MASTER_GUIDE.md`
3. [共通の重要度・編集・図解基準（PR #225）](https://github.com/salve-de/Make-money/blob/docs/case-editorial-collection-20261014/docs/CASE_COLLECTION_EDITORIAL_STANDARD.md)
4. [AIに渡す具体的な制作・検査手順（PR #225）](https://github.com/salve-de/Make-money/blob/docs/case-editorial-collection-20261014/docs/CASE_COLLECTION_AGENT_RUNBOOK.md)
5. `docs/CASE_ARTICLE.md` と現行 `src/shared/case-article.ts`、`scripts/case-articles/build.ts`

全事例を8章へ同じ項目数で埋めない。**事業ごとの主役を選ぶ。見出しは「何をしてどうなったか」を直接書く。** 架空の原価や利益を補完しない。重複する説明・意味のない図を掲載しない。原典の記録と編集済み原稿を分離し、本文各行の `recordKeys` は元記録に実在させる。最終掲載判断とライセンス検査は別。

## 制作例：複数事例をZIPにまとめる

`data/case-articles/ent_<ID>/` に実際の原稿・根拠・図を用意する。リポジトリに直接アクセスできないAIは同じ構造を一時フォルダに作成し、ZIPを利用者に渡してよい。

```bash
python3 scripts/case-articles/pack-batch.py \
  --cases-dir examples/batch-intake \
  --id ent_scrub_daddy_batch26 \
  --id ent_exploding_kittens_batch26 \
  --id ent_bark_batch26 \
  --batch-id mm-20261014-pilot-3 \
  --out ./MAKEMONEY_3cases.zip
```

ZIPはルートの `batch-manifest.json` と `cases/<case-id>/{research.json,article.json,identity.json,figures/...}` を含み、ファイルごとに SHA256 とバイト長が記録される。**1バッチ上限50件**。1万件ならバッチを繰り返し、品質基準は変えない。ZIPにはGitHubの書込み権限もR2のAPIキーも入れない。

## 受取側（Mac）：ZIP1個から既存のMAKEMONEY画面へ

初回のみ、**既存の開発フォルダを汚さない別worktree**を作る。

```bash
git fetch origin feat/case-batch-intake-20261014
git worktree add --detach ../Make-money-batch-preview origin/feat/case-batch-intake-20261014
cd ../Make-money-batch-preview
pnpm install --frozen-lockfile
pnpm case:batch:preview -- --bundle ~/Downloads/MAKEMONEY_3cases.zip
```

ブラウザで実際の事例詳細を開く：

- `http://127.0.0.1:3100/?entity=ent_scrub_daddy_batch26`
- `http://127.0.0.1:3100/?entity=ent_exploding_kittens_batch26`
- `http://127.0.0.1:3100/?entity=ent_bark_batch26`

同じコマンドで、**ZIPにある全事例を一括取り込む**。すでに同じバイト列の事例はスキップし、IDが同じなのに内容が違うときは停止する。次の配信バッチでも、既存のローカル記事は保持される。

**ZIPの事前検証だけ**（ファイルを取り込まない）：

```bash
python3 scripts/case-articles/import-batch.py --bundle ~/Downloads/MAKEMONEY_3cases.zip
```

**取り込みと実UIデータの確認だけ**（サーバーは起動しない）：

```bash
pnpm case:batch:preview -- --bundle ~/Downloads/MAKEMONEY_3cases.zip --prepare-only
```

データは `data/case-articles/<case-id>/`、プレビュー用の生成物は `.catalog-release-preview/batch/` に保存される。`CATALOG_RELEASE_DIR` をこのプレビューに設定して既存のNext.jsを起動。追跡対象の `data/catalog-release.json`、`data/case-articles.json`、R2の公開ポインタや実際の本番データは書き換えない。

## 品質・安全の自動検査

- ZIPサイズ・ファイルハッシュ・ファイルリスト・危険なパス・シンボリックリンク、未知のファイルを検査する。
- 同じID／同じ公式ドメインの重複を拒否。書き換えではなく明示的な改訂として扱う。
- 調査記録と記事のハッシュ、KPI・本文の `recordKeys`、引用番号、SVG参照、悪意あるSVG要素を検査する。
- 既存のZod/TypeScript原稿ビルダーを実行し、実際のローカル表示目録に各IDが現れたことを読戻して確認。無ければ処理を失敗にする。
- すべて `review_only`。**ZIP受理もローカル表示も「公開承認」ではない**。出典本文、商用画像権利、完成文章と図のわかりやすさは別のQA対象。

## 定期的なAI収集と、一括取り込みの境界

**収集側**は、ChatGPT Automationsや人間が選ぶ別のスケジューラで、たとえば「毎回3〜10件」を調査し、**ZIPとして納品**する。**取り込み側**は、他のAIまたはMacでZIPをこのCLIに渡す。受け取るAIは原稿を手で貼り直さず、検証と実UIプレビューを実行するだけ。

GitHub ActionsのワークフローやCron、R2への直書きは今回導入しない。頻度とバッチ件数、ChatGPTからのファイル受渡しは、実際の定期生成に利用できる機能と権限を確認してから設定する。GitHubへ直接書けない回があってもZIP納品を継続できるが、**ファイルが作成されなかった場合に納品成功と報告しない**。

**既存パイプラインの残る課題**：新記事の完全自動編集・独立原典監査、商用掲載権検査、1万件でのR2分割保存・検索索引・部分更新、Safari実機での本体UI検査。本書と3件のサンプルがこれらを解決済みという意味ではない。
