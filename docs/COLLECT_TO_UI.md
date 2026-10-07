# 新しい事例を集めて画面に出すまで（1枚の案内）

**これを読めば、新しい事例を集めて画面に出すまでが分かります。**
読む人は、人でもAIでも同じです。細かい決まりは、各段に付けた正本のリンク先にあります。食い違ったら正本が勝ちます（いちばん上は [`OWNER_INTENT.md`](./OWNER_INTENT.md)）。

最終更新: 2026-10-07。実在の事例 Keygen を1件、収集から画面まで通した試験（19か所で止まった）をもとに書いています。

---

## 1. 何を集めたいか

稼いでいる事業が「誰に・何を・いくらで売り、実際に何をして、どう伸びたか」を、出典つきの事実で集めます。
読む人が1件を開けば、その事業の仕組みと規模感が分かり、自分の判断に使える状態を目指します。
足りない所を作り話や一般論で埋めません。推測は推測と分かる形で、事実とは別の欄に置きます。

収集は広く柔軟に行います。集めた内容は事例ページ（一覧の文・概要・章・分析欄）に出るので、何が画面に出るかを意識して、必要な材料を最初の1回で漏れなく集めます。あとで同じ事例を調べ直す無駄を無くすためです。ただし画面用の文に整えず、集める層の記録の形のまま残します（整えるのは段10）。

- 何を・なぜ・どこまで: [`OWNER_INTENT.md`](./OWNER_INTENT.md)（2章: 集める10の領域、3章: 事実と推論、7章: 画像）
- 収集の全体の決まりと過去の失敗: [`DATA_COLLECTION_MASTER_GUIDE.md`](./DATA_COLLECTION_MASTER_GUIDE.md)
- 項目の名前と型の旧い仕様（OWNER_INTENT と食い違う所は「廃止」と注記あり）: [`GOLDEN_INGEST_SCHEMA.md`](./GOLDEN_INGEST_SCHEMA.md)

## 2. 集める層と、画面の層は別

| | 集める層 | 画面の層 |
|---|---|---|
| 何を書くか | 事実・出典・日付・数字。広く、捨てずに | 読む人向けの短い文 |
| お金 | 元の通貨のまま（例「月24ドル」） | 円換算の概算を添える（例「月24ドル（約3,600円）」） |
| 置き場所 | 調査記録 → `data/entity-additions/` → `data/entities-index.json` | `data/list-lines.json`（一覧の文）、`data/summary-lines.json`（概要）、`data/case-chapters.json`（章7つ）、`data/detail-lines.json`（分析欄の文）、`data/success-points.json`（成功の秘訣） |
| 書き方の正本 | [`research-record/README.md`](./research-record/README.md) | [`CASE_TEXT_STANDARD.md`](./CASE_TEXT_STANDARD.md)、[`CASE_CHAPTER_PROCESS.md`](./CASE_CHAPTER_PROCESS.md) |

集める層に画面向けの言い換えを書かない。画面の層に出典に無い数字を書かない。これが基本です。

## 3. 最初から最後までの手順

作業は専用の作業用コピー（git worktree）で行います。`data/entities-index.json` などの手元データがある場所で動かします。
「ids ファイル」は、事例IDを1行に1つ書いたテキストファイルです（例 `data/pipeline/keygen.ids`）。

| # | 段 | 実行すること | 変わるファイル | 落ちたら |
|---|---|---|---|---|
| 1 | 重複判定 | `pnpm dedup:check "社名"` と `pnpm dedup:check "公式ドメイン"`。`data/CLAIMED_TARGETS.txt` を検索し、無ければ末尾に社名を1行足す（予約） | `data/CLAIMED_TARGETS.txt` | 既にあれば新規に集めない。既存の事例を直す作業に切り替える |
| 2 | 調査記録を書く | 出典を開いて事実を書く。形は [`research-record/`](./research-record/) の見本どおり | 作業用の JSON（どこでもよい） | 下の 3 で落ちたら、表示の `#/...` を見て直す（README の「落ちた時の表示の読み方」） |
| 3 | 一覧に入れる | `node --import tsx scripts/reader-case/add-entity-records.ts --from-research <記録.json> --name <名前>` → `... add-entity-records.ts --apply` → `pnpm registry:sync` | コミットするのは `data/entity-additions/<名前>.json` だけ。`--apply` が書き換える `data/entities-index.json` と、`registry:sync` が書き換える `data/collected-registry.json` は手元で後の段を動かすためのもので、**コミットしない**（索引は約99MBで、GitHub の1ファイル100MBの上限に近い） | 形の検査の表示を読んで記録を直す。同じ id・同じ公式サイトがあれば足されない（`skipped` に理由） |
| 4 | 出典の本文を取る | `node --import tsx scripts/reader-case/fetch-sources.ts --ids <idsファイル>` | `data/source-cache/`（git に入らない） | 403・CAPTCHA・ログインの壁は越えない。取れない出典は照合に回らない（`data/verify/unreachable.json`） |
| 5 | 照合（事実が出典どおりか） | `build-verify-batches.ts --ids <idsファイル>` → `bash scripts/reader-case/run-verify.sh` → `merge-verdicts.ts --ids <idsファイル>`（いずれも `scripts/reader-case/`） | `data/verify/`、`data/reader-verdicts.json` | `run-verify.sh` が終了コード75で止まるのは正常。指示書 `data/runner/instructions/verify/` を別のAIが実行し、結果を `data/runner/inbox/verify/` に置いてから再実行する（[`pipeline/CLAUDE_RUNNER.md`](./pipeline/CLAUDE_RUNNER.md)） |
| 5b | 画像を取って判定する | 4章の命令（公式サイト・App Store から取得 → 自動判定 → 保留の分は人が判定） | `data/media-staging/<事例ID>/`（git に入らない） | 段9より前に済ませる。「使ってよい」が1枚も無い事例は選別で落ちる |
| 6 | 分析（根拠つきの推論） | `build-analyze-batches.ts --ids <idsファイル> --prefix batch-<名前>-` → `bash scripts/reader-case/run-pipeline.sh batch-<名前>-`（`PIPELINE_NO_PUBLISH=1` を付ける） | `data/analyze/`、`data/reader-analysis.json` | 75で止まったら 5 と同じく指示書を実行して再実行。落ちた項目は `data/analyze/dropped.json` に理由が残る |
| 7 | 統合 | 6 の命令の中で `merge-analysis.ts` が走る | `data/reader-analysis.json` | 数字を含む文が「式が無い」で落ちることがある（落とし穴の表 8） |
| 8 | 監査 | 6 の命令の中で `build-audit-input.ts` → `run-audit.sh` が走る | `data/audit/`、`data/publication-audits.json` | 75で止まったら指示書を実行して再実行。直すべき指摘は分析の段へ戻す |
| 9 | 選別（仕上げ済みか） | 6 の命令の中で `select-finished.ts` が走る | `data/catalog-finished-ids.txt`、`data/pipeline/select.json` | 落ちた理由は `data/pipeline/select.json`。画像が1枚も「使ってよい」になっていない事例も落ちる（4章） |
| 10 | 画面の層を書く | 一覧の文・概要・章・分析欄の文・成功の秘訣を書く（手順は [`CASE_CHAPTER_PROCESS.md`](./CASE_CHAPTER_PROCESS.md)）。別のAIに全行を出典と照らして確認させる | `data/list-lines.json`、`data/summary-lines.json`、`data/case-chapters.json`、`data/detail-lines.json`、`data/success-points.json` | 確認で出た指摘をすべて直し、直した後にもう一度確認する |
| 11 | 検査 | `pnpm case-text:verify`、`pnpm case-chapters:todo`、`pnpm lint`、`pnpm exec tsc --noEmit` | なし | 表示された行と理由を読んで、画面の層の文を直す |
| 12 | 公開データの作成 | `pnpm catalog:prepare` | `data/catalog-release.json`、`data/case-display.json`、`.catalog-release/` | 「撤回の明示が足りない」で止まったら、手元に既存の公開分の作業データが無いのが原因のことが多い（落とし穴の表 12） |
| 13 | 公開（**人の許可が要る**） | 画像を保存先へ上げる（`scripts/media/upload-media-assets.ts`）→ `pnpm catalog:publish`（R2 へ）→ `pnpm deploy:workers`（本番）→ 本番の画面で1件開いて確かめる | R2 と本番 | 5章を読む。許可が無ければ 12 までで止める |

- 段6〜9は `run-pipeline.sh` が1つの命令で続けて回します。止まった所から再実行すれば、済んだ段は飛ばします。
- 毎日の自動実行（[`pipeline/DAILY_RUN.md`](./pipeline/DAILY_RUN.md)）は 9 と公開版の計画までで止まり、公開はしません。
- **申請待ち（2026-10-07 時点）**: 段3の `--from-research` は、まだ main に入っていません（変更の申請 #164 の中）。入るまでは、#164 の作業用コピーの `scripts/reader-case/add-entity-records.ts` を使います。#164 には、段7の「式が無い」の食い違いの修正と、分析欄の文が無い事例を検査で落とす変更も入っています。

## 4. 画像

- **何を取るか（上ほど優先）**: ①App Store の画面写真 ②公式サイトに載った製品の画面写真 ③アイコン（一覧の小さな印用）。実際に使うときの画面がいちばん大事です。
- **出さない物**: ロゴと飾りだけの宣伝バナー（OG画像は自動で「使わない」になる）、人物写真、出所の分からない画像。ログインした後の画面を自分で撮ることもしません。
- **命令**:
  - 公式サイトから: `node --import tsx scripts/media/fetch-official-assets.ts --ids <id>`
  - App Store から: `node --import tsx scripts/media/fetch-app-store-assets.ts --ids <id>`
  - 自動判定: `node --import tsx scripts/media/auto-review.ts --entity <id>`
  - 人の判定: `node --import tsx scripts/media/review-assets.ts --entity <id> --asset <資産ID> --allow ...`（`--list` で今の判定を一覧）
- **自動判定の結果**: アイコン・ストアの画面写真・製品の画面写真は、顔が無く画像として読めれば「使ってよい」。公式サイトのトップと料金ページの画面写真は、同意バナー（クッキーの確認など）が写り込むことがあるので「保留」のまま残り、**人が目で見て判定**します。
- **どこに入るか**: 取得した画像と台帳は `data/media-staging/<事例ID>/`（git に入らない）。判定は同じ場所の `decisions.jsonl` に1行ずつ追記されます。公開の時に R2 の `foundation-raw`（全部）と `foundation-public`（使ってよい物だけ）へ上がります。
- 正本: [`MEDIA_ASSETS_AND_PROVENANCE.md`](./MEDIA_ASSETS_AND_PROVENANCE.md)、[`MEDIA_THUMBNAIL_AND_LIKENESS_POLICY.md`](./MEDIA_THUMBNAIL_AND_LIKENESS_POLICY.md)、[`OWNER_INTENT.md`](./OWNER_INTENT.md) 7章。

## 5. どこに保存されるか

| 物 | 置き場所 | git に入るか |
|---|---|---|
| 調査記録（一覧への追加分） | `data/entity-additions/<名前>.json` | 入る |
| 事例の索引 | `data/entities-index.json` | 今の版は入っているが、追加で書き換えた版はコミットしない（約99MB。手で直さず、`--apply` で手元に作り直す） |
| 出典の本文 | `data/source-cache/` | 入らない |
| 照合の結果 | `data/reader-verdicts.json` | 入る |
| 分析 | `data/reader-analysis.json` | 入る |
| 監査の受領書 | `data/publication-audits.json`、`data/audit/` | 入る |
| 画面の層の文 | `data/list-lines.json` ほか（2章の表） | 入る |
| 画像 | `data/media-staging/` → R2 | 入らない |
| 公開版 | `data/catalog-release.json` → R2 `views/make-money/catalog-v1/` | 入る（R2 へは公開の時だけ） |

- R2 への書き込みは新規作成だけで、上書きしません。書いた直後に読み戻して一致を確かめます。
- EDINET の保存先と、共通の土台の `universal` バケットは読むだけで書きません。
- 正本: [`architecture/STORAGE.md`](./architecture/STORAGE.md)、[`OWNER_INTENT.md`](./OWNER_INTENT.md) 10章。

## 6. 画面に何が出るか

| 画面の場所 | 元のデータ |
|---|---|
| 一覧の1行（何の事業か） | `data/list-lines.json`。無ければ事実の1文目 |
| アイコン | 「使ってよい」と判定されたアイコン画像 |
| 概要（2文目以降） | `data/summary-lines.json` |
| 章7つ: 実際にやったこと・つまずきと立て直し・時間順の流れ・戦略の核・出発点・価格の変遷・客の声 | `data/case-chapters.json`（材料の無い章は出ない） |
| 分析欄（料金、大手が手を出せない理由など） | `data/reader-analysis.json` の推論。読む人向けの文は `data/detail-lines.json` |
| 成功の秘訣 | `data/success-points.json` |
| 各行の出典リンク | 調査記録の `sourceUrl` と、章の各行の `source` |

- 画面の層の文は、元の事実の指紋（`factHash` / `textHash`）に結ばれています。元の事実が変わると、古い文は出なくなります。元を直したら画面の層も作り直します。
- 画面に出さない言葉（作る側の用語）は `data/reader-language.json` にあり、`pnpm case-text:verify` が見つけます。

## 7. 人の許可が要る所

次は、作業する人やAIが自分の判断で実行しません。オーナーの明示の許可を取ります。

- 公開側への書き込み: R2（`pnpm catalog:publish`、`upload-media-assets.ts`）、`pnpm ingest:incoming`（これも R2 へ書く）
- 本番反映: `pnpm deploy:workers`
- 削除（データ・画像・公開中の事例の撤回）
- 課金（有料サービス・API の利用）
- 公式サイトのトップ・料金ページの画面写真を「使ってよい」にすること（同意バナーの確認）

## 8. 既知の落とし穴（2026-10-07 の試験で止まった所）

| # | 起きたこと | 防ぎ方 |
|---|---|---|
| 1 | 調べた事例を一覧に入れる正式な入口が無かった。`ingest:incoming` は R2 へ書くので使えない | `add-entity-records.ts --from-research` を使う（#164。3章の注記） |
| 2 | 調査記録の書き方の見本が無く、手で書くしかなかった | [`research-record/`](./research-record/) の見本と必須項目の一覧を使う |
| 3 | 作業用コピーに出典の本文・画像・分析の作業データが無い | 各段がその場で作る。既存の公開分の作業データは、元の作業場所にしか無い |
| 4 | 形の検査で落ちた（`temporal.viabilityLabel` が無い、`unknownsNotes` が文字列だった） | README の必須項目を見て書く。見本を元に書き換える |
| 5 | 出典の取得 | 止まらなかった。そのまま使える |
| 6 | 照合が別のAIの結果待ちで止まる | 正常な止まり方。指示書を実行して結果を置き、再実行する。事実を書いた者と照合する者は、できれば分ける |
| 7 | 分析も別のAIの結果待ちで止まる | 6 と同じ |
| 8 | 分析の15項目のうち5項目が「数字に式が無い」で黙って落ちた | 指示書は「式は推定の時だけ」、検査は「金額・%を含む文は式が必須」で食い違っていた。#164 で、数字がすべて出典の事実にある項目は通るように直した。それまでは `data/analyze/dropped.json` を必ず見る |
| 9 | 監査が直す前の分析で進み、増えた項目は次の回に回った | 分析を直したら、監査をもう一度回す |
| 10 | 選別で「公開区分または根拠が無効」で落ちた（根拠カードが無い） | `--from-research` が `reaudit.sources` から根拠カードを作る。`reaudit.sources` を必ず書く |
| 11 | トップ・料金ページの画面写真が「保留」で止まった | 同意バナーの写り込みは人が見て判定する（7章） |
| 12 | 公開版の計画が「10 → 0（撤回10件）」で止まった | 作業用コピーに既存の公開分の作業データが無いため。新しい1件は `data/pipeline/select.json` の理由で確かめる。公開は元の作業場所で行う |
| 13 | 監査の2回目で仕上げ済みに入った | 9 と同じ。12 の止まりは作業用コピーのせい |
| 14 | 一覧の文の `factHash` の写し元が無かった。JSON の字下げを変えて全行の差分が出た | 新しい事例は `textFingerprint`（`src/shared/list-lines.ts`）で要約の事実 f1 から計算する。JSON は元のファイルと同じ2字下げで書く |
| 15 | 別のAIの全行確認で26行中15行が不合格（専門語、1行に答え2つ、出典より言い過ぎ、時期の食い違い） | 書いた後に必ず別のAIに出典と照らして確認させ、直した後にもう一度確認させる |
| 16 | `pnpm lint` が「登録の件数が索引と合わない」で落ちた | `--apply` の後に `pnpm registry:sync` を実行する |
| 17 | 選別が `data/catalog-finished-ids.txt` を新しい1件だけに書き換えた | 作業用コピーでのこの差分はコミットしない |
| 18 | 画面で見るには公開版が要るが、流れは公開版を作らない。分析欄はドル額に円換算が無く、専門語が残った | 確認だけなら手元で `prepare-catalog-release.ts` を動かし、確認後に元へ戻す。分析欄は `data/detail-lines.json` に読む人向けの文を作る（#164 で、無いと検査で落ちる） |
| 19 | コミットに入れてはいけない作業データがあった | `data/catalog-finished-ids.txt`（作業用コピーの版）、`data/pipeline/`、`data/audit/`、`.catalog-release/`、`--apply` 後の `data/entities-index.json` と `data/collected-registry.json` はコミットしない |
| 20 | 23件の通し試験で、調査記録の形の揺れ（数の欄の null、空の列挙、文字列の道具名、作業メモの観測、調査段の `RAW`）で取り込みが落ちた | `--from-research` が取り込み時にそろえる（数の空欄は0＋未確認の印、`RAW`・要審査・未審査・空は `PARTIAL`、作業メモは記録の外の `workNotes` へ、`pnl.sourceDoc` の空は公式の出典で補う）。変えた所は記録の `normalizedFromResearch` に残る |
| 21 | 記事ページの URL を持つ既存記録と、同じドメインの別事業が「同じ公式サイト」として弾かれた | 同じ公式サイトの判定は、URL がサイトの入口（パスなし）の記録だけで行う（取り込みと `check-ingest-quality.mjs` の両方） |
| 22 | 利用条件が未承認の第三者出典を引く事実があると、選別で「利用条件:sN」で落ちた | 組み立て（`projectReaderCase` の `allowSource`）で未承認の出典の事実を外し、review に `source-rights-unapproved` を残す。事実の ID がずれるので、照合と分析をやり直す |
| 23 | 分析の項目が400字超・出典に無い日付の数字で落ちた。事実の ID が変わった後に古い分析の項目が残り、監査の入力づくりが止まった | 分析の指示書に上限と「数字は basis の事実にある物だけ」を書いた。統合は根拠の事実が今の reader に無い項目を残さない。監査の入力は今ある束の分析だけを読む |
| 24 | 作業場所に既存の公開分の作業データが無いと、計画が「撤回の明示が足りない」で止まる（12） | 新しい事例だけを評価する時は `PIPELINE_CHANGED_ONLY=1` を付ける。今回の候補だけを評価し、公開中の事例は評価し直さずに引き継ぐ（中身が公開中と違えば目録づくりが止まる） |

## 9. 関連する正本

- [`OWNER_INTENT.md`](./OWNER_INTENT.md): 何を・なぜ・どこまで（いちばん上の正本）
- [`DATA_COLLECTION_MASTER_GUIDE.md`](./DATA_COLLECTION_MASTER_GUIDE.md): 収集の決まりと過去の失敗
- [`research-record/README.md`](./research-record/README.md): 調査記録の必須項目と見本
- [`pipeline/CLAUDE_RUNNER.md`](./pipeline/CLAUDE_RUNNER.md)、[`pipeline/DAILY_RUN.md`](./pipeline/DAILY_RUN.md)、[`pipeline/DISPLAY_CONTRACT.md`](./pipeline/DISPLAY_CONTRACT.md): 照合・分析・監査の流れと画面に出す項目
- [`CASE_TEXT_STANDARD.md`](./CASE_TEXT_STANDARD.md)、[`CASE_CHAPTER_PROCESS.md`](./CASE_CHAPTER_PROCESS.md): 画面の層の文の書き方
- [`MEDIA_ASSETS_AND_PROVENANCE.md`](./MEDIA_ASSETS_AND_PROVENANCE.md): 画像
- [`architecture/STORAGE.md`](./architecture/STORAGE.md): 保存先
