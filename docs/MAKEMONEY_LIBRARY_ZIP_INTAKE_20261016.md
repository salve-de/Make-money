> **【2026-10-16 全AI向け最新正本へ統一】**：実際の収集・完成日本語記事・7本文分類＋末尾出典・文体・掲載画像/図表・根拠原本・経緯/改訂・独立品質判定は、[MAKEMONEY統一正本（PR #228、2026-10-16）](https://github.com/salve-de/Make-money/blob/docs/makemoney-owner-reality-20261015/docs/MAKEMONEY_CASE_RESEARCH_EDITORIAL_SSOT_20261016.md)と[誰でも使う収集実行手順](https://github.com/salve-de/Make-money/blob/docs/makemoney-owner-reality-20261015/docs/MAKEMONEY_COLLECTOR_START_HERE_20261016.md)を最優先。調査中から完成記事を編集し、収集断片の後付け連結で記事を作らない。旧本文の固定章・図数・利益表・直接保存要件や古い『最高正本』と矛盾する部分は**歴史資料**であり現行指示ではない。元記事全文をChatGPT/編集担当が完成し、Codexは原文保全・形式変換・非公開レビューUIを担当する。掲載・本番deploy・課金は別承認。本書とコードの現時点の検証状況は混同しない。

# MAKEMONEY｜ChatGPT Library ZIP → Codex受取（2026-10-16）

> 非公開の取込作業専用。この記事が読める・正確・掲載可能かどうかは、ZIPとコードの合格とは別。公開R2、本番目録、課金、deploy、新Cronを変更しない。
>
> 記事制作の正本：PR #228の `docs/MAKEMONEY_PUBLICATION_FIRST_CASE_WORKFLOW_20261016.md`。参照記事・UI：PR #224のPlausible Analytics。

## オーナーの操作

ChatGPT Library「Make money」から累積ZIP `MAKEMONEY_まとめてDL_最新版.zip` をダウンロードし、Macの `~/Downloads/MAKEMONEY-inbox/` に置く。累積版に欠落がある場合は、個別ZIPも一緒に置く。解凍・ファイル名変更・旧新マージ・重複選別・JSON編集はしない。

Codexへ「MAKEMONEYの未取込事例を全部取り込んで。公開せず非公開で表示して」と依頼する。

## Codexが実際に動かすコマンド

作業ブランチ `feat/library-article-intake-20261016` を利用する。

```bash
python3 scripts/case-articles/intake-library.py \
  --input "$HOME/Downloads/MAKEMONEY-inbox" \
  --out .catalog-release-preview/library-intake
```

返却されるJSONの `package` は `makemoney.case-batch.v1` の非公開レビューZIP。元のZIP、article.md、research-rights.json、画像参照、SVG、補足メタデータは、`original-zips/` と `source-cases/` に原本のまま保存する。変換後の article.json は必ず `draft`。記事の本文を自動要約して短縮する工程ではない。 research.json に作る記事行レコードは**受領原稿の出典表記を移しただけ**で、原典との独立照合を完了した証拠ではない。

まず既存インポータで検証だけ行う。

```bash
python3 scripts/case-articles/import-batch.py \
  --bundle "<CLIが返したpackage>" --repo .
```

問題がない場合に限り、ローカル・作業ブランチの非公開プレビューへ反映する。

```bash
python3 scripts/case-articles/import-batch.py \
  --bundle "<CLIが返したpackage>" --repo . --apply
```

`--apply` はローカルに原稿を置き、既存Reactデータを非公開プレビュー用に準備する。本番へは公開しない。元記事と異なる版が既存にある場合、現在の `import-batch.py` は衝突を理由に停止する。**Codexがその場で安全な改訂履歴保全を追加実装**し、原本を上書きしない。同じZIPの再取込で追加0件となることを確認する。

## 2026-10-16の実測

- 入力した実ファイル：44,735バイトの累積ZIP（Rightmove r1・Who Gives A Crap r1）、16,221バイトのWho Gives A Crap個別ZIP。
- 新しいPythonアダプターでは、2事例を識別して重複した個別ZIPの1件をスキップ。元ZIPを全て保全、2件のreview-onlyバッチを生成した。
- 同一ZIP再取込0件、改訂版r1/r2の併存・最新版選定、同一ID・同一revisionの内容衝突拒否、不正ZIPパス拒否、不存在出典参照拒否、既存保存物破損拒否を含む**合成フィクスチャ7テストがローカルでPASS**。
- Rightmove r1は創業・初期顧客・2002年前後の課金化経緯が弱いので編集不合格のまま。Who Gives A Crap r1は初客獲得・販路拡大の筋道が読めるが、原典独立照合と権利の審査は未完了。両方とも技術的にはdraft。

## 未実証（完了と報告しない）

- 実リポジトリ依存関係を用いた既存 importer/Zod/buildの実行。
- PR #224のReact詳細UIで、PC 1440px・タブレット768px・スマホ390pxの実ブラウザ表示・目次・表・SVG・出典動作確認。
- 更新記事の既存取り込み済みデータに対する長期版管理、多数ZIPの安定処理。
- PlausibleのR2保存原本そのもののSHAを使った独立読み戻し。今回はGitHubの同名記事を参照したが同一内容の実証ではない。
- 独立した原典・数字・画像権利の最終審査。本番公開・R2取り込み。

## Codexがここから完了させること

1. 既存 importer のローカル検証と非公開プレビュー作成。builderに表示上の制約があれば、調査の事実を損なわずレビュー段階でのみ安全に扱う。
2. 旧形式と新形式、累積と複数個別、旧版と改訂版の全部について原本・SHA・件数の追跡。曖昧な身元や出典の欠落は保留。
3. 元の良い日本語原稿と表示済み画面の差分を実測し、タイトル・本文・表・年表・出典・図解が意味を失っていないことを確認。
4. PR #224の既存UIへ記事を非公開表示し、1440/768/390pxの画面証拠を残す。コード・CIが通っただけでUI合格としない。
5. エラーを修正して実ZIPの取込試験を再実行し、成功／保留／未検証を区別してIssue #229へ報告。本番反映は別途オーナー承認待ち。

この設計はChatGPTによる毎時の調査・完成記事制作をCodexに移すものではない。技術形式への変換・受け渡し操作をCodex側で引き受け、オーナーの操作を極力少なくする。