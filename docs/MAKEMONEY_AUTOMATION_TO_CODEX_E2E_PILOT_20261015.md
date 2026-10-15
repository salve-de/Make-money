# MAKEMONEY｜自動収集1事例→原本納品→Codex取り込み→非公開R2→実UIまでの実証

作成：2026-10-15 JST。区分：**1件の試験・未承認・本番変更禁止**。責任者：MAKEMONEY事例収集（ChatGPT定期タスク）／独立した受入・実装・UI監査（Codex）。

## 0. 何ができれば完了か

**実際に自動収集が作った、出典・事実・読みやすい日本語の記事・有用な図解を含む新事例1件を、失わず保存・検証し、MAKEMONEYの既存UIのPC・スマホ画面で実際に読める。** テスト中の公開、価格設定、課金、本番カタログの更新はしない。

**「指示書作成」「調査したと報告」「JSONの形だけ合格」「Driveファイル名が見える」「PRを作成」「UIコードがある」はE2E完了ではない。** チェックの各段階に実行時の入力ID、成果物SHA、読戻し、コマンド結果、必要ならスクリーンショットを残す。推測や別ケースの過去成功を混ぜない。

## 1. なぜこの試験が必要か（現在確認できる実証データ）

Google Drive台帳 [MAKEMONEY_Intake_Control](https://docs.google.com/spreadsheets/d/14TphagEON004mn1a5qfEBFhrFN9dV_NUTT1tRxGJaCQ/edit) の Runs に、同日3件のScheduled生成記録がある。

| 収集run | ID / 実行時間（JST） | 生成の報告 | Drive格納 |
|---|---|---|---|
| Printful | `ent_printful_on_demand_20261015` / 16:32 | 出典10件・record37件・SVG1、JSON 50,735 bytes、SHA `468e7804605a5a6935b228ec93c7e90f709d4201fd0a148f3d53bf51e8eaacf8` | `BLOCKED_NOT_STORED` ／ import_documentに安全チェック拒否 |
| Morning Brew | `ent_morning_brew_20261015` / 17:30 | 出典8件・record40件・SVG1、JSON 48,816 bytes、SHA `8ef7f800a6e7902d0df857928be705c8ceb70d658ccc794bb752fa5977c2d711` | `BLOCKED_NOT_STORED` ／ ファイル参照を外部送信できない |
| Photopea | `ent_photopea_browser_editor_20261015` / 18:37 | 出典8件・record38件・SVG1、JSON 57,706 bytes、SHA `3a154cbe4b69a215049553367a9a910d0cc1f7671300a54848d6b0e3049f2e2b` | `BLOCKED_NOT_STORED` ／ import_documentに安全チェック拒否 |

**これらのSHAやRuns行は、元JSONを実際に取得できることを意味しない。** Artifacts / Casesはヘッダーのみ、正しいDriveの2026/10/15日付フォルダには旧typed-record-set原本34ファイルだけだった。旧34原本はこの記事3件でも完成記事34件でもない。直近のPhotopea原本を現行アクセス経路で取得できるか先に調べ、ファイルを実際に読戻せなければ保存済みと呼ばず、**別の未収集事例を単発で1件生成して実体を納品する**。

## 2. 起点と変更禁止

- GitHub `salve-de/Make-money`：最新オーナー全体方針はPR #228の `docs/MAKEMONEY_CASE_COLLECTION_SPEC_20261015.md`、新記事UIはPR #224、記事収集/編集手順はPR #225、一括取込実装候補は `feat/case-batch-intake-20261014`。未マージのPRをmainや本番に入っているとみなさない。
- 現時点の採用UIは**本文7分類（概要／仕組み／お金／集客／運営／経緯／成功の理由）＋別枠の出典**。PR #224の `src/shared/case-article.ts` / `CaseArticleView.tsx` / `CASE_ARTICLE.md` と実際のPlausible記事の最新改訂を照合。古い『6分類＋出典＝7』は誤り。
- 最新のPlausible実例を自然文・情報密度・見出し帯・罫線・固定目次・表示部品の参照にする。**別の新UIに置き換えない**。Plausible専用HTMLモックは旧版が残るため、採用前の比較資料であり必ず最新コード・記事と区別する。
- 現行本番カタログ、公開R2正本・公開ポインタ、料金・課金、デプロイ、外部公開、Cron/GitHub Actions/Worker、収集スケジュール、Universal Foundationの既存収集契約を勝手に変更しない。権利や実URLを不明なまま公開に進めない。
- PRへのコード修正、 isolated worktreeでのテスト、非公開のプレビュー・staging保存、文書・テストの改善は実施可。Codexが修正したものはレビュー用PRにまとめる。既存原本を破壊せず新しいrevisionを作る。

## 3. 1事例を作るChatGPTオートメーションへの契約

1. 事業の実像、誰が何を買うか、収益化、価格/実売上/利用数、最初の顧客、具体的な集客とその反応、拡大を支えた行動、運営、創業の転機などを、出典が確認できる範囲で調べる。ジャンル・国・規模は限定しない。事実の捏造や資料の無断転用は不可。
2. まず読者に何を伝えるかを考え、記事の見出し・自然な日本語を書きながら不足を追加調査する。後からfactsを機械的につなぎ合わせない。読者に価値が増えない段落や数字は載せない。
3. 読者向け本文：**概要・仕組み・お金・集客・運営・経緯・成功の理由＋出典**。共通の分類・順序は固定、材料がない章は空欄にしない。商品・料金・顧客・伸びた方法・理由が分かる固有の情報を優先。
4. 通常の成功事例で不要な赤字、一般リスク、事故、返金条件、抽象的成功法則、自明の注記、『利益ではない』『調査記録に残す』『未確認だから載せない』、制作メモ、同じ文章の反復を**表示しない**。理由の章は重複再掲ではなく、具体的な行動と売れた結果の関連を端的に説明する。
5. 図解・料金表・推移表・年表・商品画像は読者が理解しやすくなるなら作る。SVGはオリジナルで実体を保存。第三者画像の権利と引用には注意。図表の数のノルマは設けない。
6. 研究原本（sources, records, recordKeys,数値の時点、未採用のfacts）を内部に残す。同じ調査から完全なarticle、identity、必要なSVGが作れることを確認。
7. 新規原本は実際のR2 Tony's Chocolonelyケースと同じ `makemoney.r2.case-research-article-bundle.v1` に統一。researchは`make-money.collection-submission.v1`、articleは`make-money.case-article.v2`。独自のschemaを創作しない。article.reviewStateは`draft`、公開許可フラグはfalse。
8. 生成したバイトを保つ。非公開MAKEMONEY R2 stagingの `saveMakeMoneyJson` を呼んだら、返されたSHAで必ず `readMakeMoneyJson` し、JSON内容とSHAを照合。これは**公開正本R2ではない**。Driveに正しく保存できるならraw読戻しも行う。安全チェックや権限制限で拒否された経路を別媒体への逃避で迂回しない。原本をGitHub/Drive/R2に『保存済み』と偽らない。
9. JSONと互換ZIP（`batch-manifest.json`, `cases/<ID>/{identity.json,research.json,article.json,figures/*.svg}`）を実際に作り、可能ならこの会話にダウンロード可能なファイルとして納品。ソースの存在しないリンクは作らない。ZIP受け入れ時はSHAと`basedOn`の整合を保つ。

## 4. Codexの仕事：途中省略なしのE2E監査・必要な実装

以下を順番に実行し、各段階で入力→結果の実物と判定を残す。**問題があればPRで修正し、再実行してから合格にする。**

| # | 工程 | やること／合格条件 |
|---|---|---|
| 01 | 入力の実在 | ChatGPT単発Scheduled runの実行IDと正確なJSON/ZIP bytesを取得。Photopeaなど既存runのSHAしか無い場合は原本未取得と明記し、新しい1件で続ける |
| 02 | 原本ハッシュ | JSON原本の長さ、SHA256、schema/version、entity_id、run_id、revisionを計算。再読戻しが可能。出典・facts・実体のある原稿・図解を確認 |
| 03 | 読者価値 | 最初から記事を読み、冒頭で商品・顧客・具体的な儲け方・成功規模が分かるか。意味不明な文、調査メモ、否定注記、重複、低価値の数字・図、重複する成功理由を削る。事実を捏造せず、元研究は保全 |
| 04 | 7＋出典 | 最新PR #224の本文7分類、最後の出典に一致。章の有無は事例次第、順序は固定。元データの根拠キーと章の本文が一致 |
| 05 | 受入スキーマ | Tony形式bundleのルートと内側の各スキーマを実際にパース。旧型のMillion Dollar Homepage/Who Gives A Crapとは明確に区別。新規を1種類に固定 |
| 06 | 変換 | 完全な原本→`identity.json`, `research.json`, `article.json`, `figures/*.svg`を人手コピペなしで生成。ソース番号、recordKeys、`basedOn.submissionSha256`とraw researchのバイトSHAを照合 |
| 07 | 既存CLI | `scripts/case-articles/import-batch.py`および`scripts/case-articles/build.ts`等の実CLIを、別worktree・ローカルpreview onlyで実行。検査が通り、生成物に実case_idが存在する |
| 08 | 一覧と詳細 | 左側の事例一覧を壊さず、作った事例がレビュー用一覧に実在し、クリック・URL直開きで詳細へ移れる。データが届かず『一覧のみ』なら未完了 |
| 09 | 実UI | PC幅1440、幅768、スマホ390（必要なら320）の実ブラウザ。トップの見出し・数字・本文・目次・7分類・出典・図の表示／クリック、横スクロール・文字欠け・折返し・図の読めない文字・内部メモ漏出を確認。スクリーンショット保存 |
| 10 | R2 | staging/private R2へ書込み・読戻し可能な正規経路を実証。公開カタログやポインタには一切触れず、R2 stagingとcanonical publicを分ける。認証不足なら必要な権限・手順を明記 |
| 11 | 元データ保全 | 原JSONの同一SHAと、記事revision・変換後ファイルのSHA・図が追跡でき、再実行しても二重登録しない |
| 12 | エンド結果 | 1件の実在IDについて、生成・保存・受入・非公開R2・ローカルUIの結果（PASS/FAIL/BLOCKED）、URL/パス/SHA/スクリーンショットと修正PRをまとめる。本番未公開を確認する |

**検査対象の現行コード**：`src/shared/case-article.ts`, `src/features/company-inspector/ui/CaseArticleView.tsx`, `CaseArticleNav.tsx`, `CaseArticleBlocks.tsx`, `scripts/case-articles/{build.ts,lib.ts,reader.ts,import-batch.py,pack-batch.py}`, `scripts/prepare-catalog-release.ts --preview-articles`, `src/shared/reader-display.ts`, `src/lib/company-access/reader-case-projection.ts`, `package.json` scripts、PR #224/#225/#228、Drive/R2接続の実装。古い文書に『完成』と書いてあっても実機テストの代わりにしない。

**E2E試験方法（例。実装ブランチとコマンドの実在を先に確認）**：安全な別worktreeにPR #224相当の表示実装を用意し、`pnpm install --frozen-lockfile`、型・lint・対象testを実行。pilot ZIPを作り、`python3 scripts/case-articles/import-batch.py --bundle <pilot.zip>` で検証、候補の`pnpm case:batch:preview -- --bundle <pilot.zip>`などでレビュー専用生成、`CATALOG_RELEASE_DIR=... pnpm dev`から本体UIで開く。未マージブランチ間の差分を無批判に合流させず、必要な最小変更を別PRへ提出する。

## 5. 受け取るレポートの形（Codex・ChatGPTともに統一）

- **対象**：実在事例名、`entity_id`, scheduled `run_id`, JSON原本URI/ファイル、SHA256、byte数
- **内容**：どんな商売／最初の客／売り方／意味のある数字／独自の工夫が読めるか。読者に不要な文を何件修正したか
- **実体**：research records / sources / article topics / SVG の数、記事のrevision、原本と変換結果をつなぐ根拠
- **工程**：生成、原本読戻し、ZIP受入、ローカルUI、R2 stagingの各PASS/FAIL/BLOCKEDと実証
- **画面**：PC/スマホのスクリーンショットの実パス、表示したcase_id／URL、どの表示部品が読めたか
- **修正**：問題、根本原因、必要なコード・文書・オートメーション指示の最小修正、実コミット・PR、再検証
- **安全**：本番公開false、課金変化なし、デプロイなし、旧原本保全、完了していない項目にPASSを付けない

すべてPASSになって初めて「この1件を既存の自動収集→受入→UIまで通せた」と言える。Codexを起動する接続権限が無い場合は、Codex実行済みと偽らず、この仕様を作業指示として残し、実行主体と不足権限を明記する。
