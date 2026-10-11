# 03｜7版のモック・監査・アーティファクト台帳

## 1. 状態の読み方

- **PRESENT**：今回の環境で実バイト列を確認できた。
- **HASH_VERIFIED**：配布HTMLとZIP内HTMLの同一性、SHA-256を確認した。
- **REJECTED_DIRECTION**：次のユーザー発言で方向を否定された。細かな良い部品まで全て破棄する指示ではない。
- **REVISED_AFTER_AUDIT**：監査指摘を受けて次版へ進んだ。
- **LATEST_NOT_ACCEPTED**：最新の提示物だが、オーナーの最終受入はない。
- **REPORTED_QA**：当時の報告・保存ログ。今回の保存作業で新しく同じテストを再実行した意味ではない。

## 2. モックの一覧

|順|配布HTML|当時の構成・報告|その後の扱い|
|---|---|---|---|
|M01|`MAKEMONEY_Trends_20261011.html`|20需要テーマ、8成功パターン、詳細・保存・アイデア。116項目の操作確認との報告|個別の需要をいきなり読ませるとして却下|
|M02|`MAKEMONEY_Trends_FINAL_20261011.html`|4つの広い支払い行動、8分野、18発見、6仕組み。35項目との報告|一瞬で価値を感じない。空の分類の問題|
|M03|`MAKEMONEY_Trends_Rethink_20261011.html`|アプリ・中古・AI発注・旅行の分野レポートを先頭に置く|話題を広げても個別レポート先行。利用者をふるいにかけるとして却下|
|M04|`MAKEMONEY_Overview_20261011.html`|9需要×収益方式の見取り図、需要内の種類→具体例|分類表を見せるだけでページの価値・目的が弱いとして却下|
|M05|`MAKEMONEY_Trends_Complete_20261011.html`|需要/稼ぎ方/成功の3領域、12分析・15事業・22出典・6アイデア|記事ページから抜けていない。後にオーナーが監視コックピットを明示|
|M06|`MAKEMONEY_Cockpit_20261011.html`|8パネル、28観測・9分野・12事業・6共通構造。192項目との報告|監査で本実装前の改修が必要と判定。端末方向は維持|
|M07|`MAKEMONEY_Monitor_V2_20261011.html`|対象連動、該当なし、定義・範囲修正、スマホ、追跡・確認・メモ。31観測・14事業・6構造・5応用案|最新候補。オーナーは記録を依頼しただけで最終受入は未確認|

上の件数は各版の資料・報告の識別情報であり、世界の市場規模、MAKEMONEY本番件数、独立した調査数ではない。

## 3. 配布HTMLの原本ハッシュ

|配布HTML|bytes|SHA-256|
|---|---:|---|
|MAKEMONEY_Trends_20261011.html|128398|546fc801ba71a8b86d1f2860c2c58472ce7cff33a05307aca906dc29291179dd|
|MAKEMONEY_Trends_FINAL_20261011.html|77429|56681b41d3b74b915cecd2db5d8fe81671d7dce657c07663ed5921b00f88fb78|
|MAKEMONEY_Trends_Rethink_20261011.html|91826|d19e966bc1dab2a548628ba10c6e3270a46712a4959873e2ba0ec50b015919f7|
|MAKEMONEY_Overview_20261011.html|111846|8ada30072ce37c0ee1445e7c73da362bd625e08b7e5e2597f7e56134e8f01ccb|
|MAKEMONEY_Trends_Complete_20261011.html|104985|1694de9ae8c3cab36cfcde7ed1c067b3a5f02106d0092150fee31dce77858357|
|MAKEMONEY_Cockpit_20261011.html|116768|e5352c33d04b9771c682c2223f2e6d46a4d6b89778de5d1632d6efebbf01ef9a|
|MAKEMONEY_Monitor_V2_20261011.html|135398|4223e734aa3ab9744441ec52985372383efa33203b436ed388a33befa444c036|

## 4. 最新V2の編集・検証ファイル

元パッケージ内ディレクトリは `MAKEMONEY_Monitor_V2/`。

- `MAKEMONEY_Monitor_V2.html`：CSS・JavaScript・データを内包した配布物。
- `index.template.html`、`style.css`、`app.js`、`data.json`：再編集元。
- `build.py`：Python標準ライブラリによる再ビルド。今回の隔離コピーで実行し、配布物とバイト一致した。
- `README.md`、`RESEARCH.md`、`SOURCE_REGISTER.md`：当時の説明・調査・出典台帳。
- `test_ui.py`、`preview.py`、`QA_RESULTS.json`：当時の検証スクリプト・ログ。
- `MANIFEST.json`：当時の配布物マニフェスト。
- 画面：`desktop_overview.png`、`desktop_full.png`、`desktop_retail.png`、`desktop_watch.png`、`desktop_no_data.png`、`mobile_overview.png`、`mobile_retail.png`、`mobile_evidence.png`、`mobile_no_data.png`。

## 5. 旧コックピットの監査パッケージ

`MAKEMONEY_Cockpit_Audit_20261011.zip` は次を含む。

- `AUDIT.md`：7主要問題と修正方針、確認範囲。
- `audit_ui.py`、`ui_results.json`：代表操作の再現スクリプトと当時の実測。
- PCの初期、小売選択、日本選択、日本＋30日、1280px表示。
- スマホの初期、小売選択、観測一覧。

この監査は第6版が対象。第7版が同じ全問題を解決したことは、別の検証として扱う。

## 6. 保管方法と限界

この会話で確認できたのは、7つの配布HTMLと、それぞれの配布ZIP、1つの監査ZIP、会話へ添付された画面画像である。前段のPR #222でファイル名だけが記録されたさらに古いモックを、今回も全て回収したと主張しない。

アーカイブは原本を改稿せず保存する。元データに誤解されやすいラベルや旧版の欠点が残っていても、それを今回の現行推奨としない。修正は履歴・監査台帳で表現し、旧原本を無断上書きしない。

`ARTIFACT_MANIFEST.json` で、GitHub保存対象、ZIP内テキスト、画面/ZIPの識別記録のみの対象を分ける。原寸PNGと配布ZIPの全バイト列をGitHubへ格納したことは、台帳で明示していない限り保証しない。7版のHTMLとソース/データ/検証資料を再利用する入口を優先する。

フォントファイル、他社記事全文、認証情報は今回の引継ぎ対象に含めない。限定的なパターン検査で秘密情報らしい文字列がなかったことは、全面的なセキュリティ監査の代わりではない。

## 7. 原本を確認する際の注意

1. ファイル名の`FINAL`・`Complete`は採用状態ではない。
2. 画像だけを見て、フィルタ・保存・履歴が機能すると判定しない。
3. `set_content`での描画、`file://`からの起動、通常URLでの配信、Safari実機は別の検証。
4. 31観測・9市場資料・25出典レコード全体を混同しない。
5. 作り直す場合は最新V2のSHAを起点にし、変更した内容と検証対象のSHAを残す。
