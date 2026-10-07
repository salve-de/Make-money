# 新しい事例を集めて画面に出すまで（1枚の案内）

**これを読めば、新しい事例を集めて画面に出すまでが分かります。**
読む人は、人でもAIでも同じです。細かい決まりは、各段に付けた正本のリンク先にあります。食い違ったら正本が勝ちます（いちばん上は [`OWNER_INTENT.md`](./OWNER_INTENT.md)）。

最終更新: 2026-10-07。実在の事例 Keygen を1件、収集から画面まで通した試験（19か所で止まった）をもとに書いています。

---

## 1. 何を集めたいか

稼いでいる事業が「誰に・何を・いくらで売り、実際に何をして、どう伸びたか」を、出典つきの事実で集めます。
読む人が1件を開けば、その事業の仕組みと規模感が分かり、自分の判断に使える状態を目指します。
足りない所を作り話や一般論で埋めません。推測は推測と分かる形で、事実とは別の欄に置きます。

収集は広く柔軟に行います。集めた内容は事例ページ（一覧の文・概要・章・分析欄）に出るので、何が画面に出るかを意識して、必要な材料を最初の1回で漏れなく集めます。あとで同じ事例を調べ直す無駄を無くすためです。事実の1文は、そのまま画面に出せる自然な日本語で書きます（2026-10-07 夜の決定。書き方の正本は `.claude/skills/natural-japanese/SKILL.md`、例は `DATA_COLLECTION_MASTER_GUIDE.md` Ⅶ）。出典の原文の引用は別欄 `quote` に残します。集める範囲は狭めません。取り込みが同じ検査を掛け、落ちた文は取り込まずに収集役へ差し戻します（段3）。

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
| 2 | 調査記録を書く | 出典を開いて事実を書く。形は [`research-record/`](./research-record/) の見本どおり。数字には1件ずつ種類・出来事の時点・原文の引用（15語以内）・出典URL・取得日を付け、創業と転機の事実を必ず入れる（README「数字の決まり」。Codex などに任せる時は `scripts/reader-case/collect-prompt.md` を渡す） | 作業用の JSON（どこでもよい） | 下の 3 で落ちたら、表示の `#/...` を見て直す（README の「落ちた時の表示の読み方」） |
| 3 | 一覧に入れる | `node --import tsx scripts/reader-case/add-entity-records.ts --from-research <記録.json> --name <名前>`（出力の `unconfirmedFacts` と `thinCases` が0件になるまで記録を直す。決まりを満たさない数字はその数字だけ分けられ、事例は止まらない）→ `... add-entity-records.ts --apply` → `pnpm registry:sync` | コミットするのは `data/entity-additions/<名前>.json` だけ。`--apply` が書き換える `data/entities-index.json` と、`registry:sync` が書き換える `data/collected-registry.json` は手元で後の段を動かすためのもので、**コミットしない**（索引は約99MBで、GitHub の1ファイル100MBの上限に近い） | 形の検査の表示を読んで記録を直す。同じ id・同じ公式サイトがあれば足されない（`skipped` に理由） |
| 4 | 出典の本文を取る | `node --import tsx scripts/reader-case/fetch-sources.ts --ids <idsファイル>` | `data/source-cache/`（git に入らない） | 403・CAPTCHA・ログインの壁は越えない。取れない出典は照合に回らない（`data/verify/unreachable.json`） |
| 4b | 画像を取って判定する | 4章の命令（公式サイト・App Store から取得 → 自動判定 → 保留の分は人が判定） | `data/media-staging/<事例ID>/`（git に入らない） | 段5より前に済ませる。「使ってよい」が1枚も無い事例は選別で落ちる |
| 5 | **ここから先は1本**: 照合から公開データの作成まで | `pnpm case:run --ids <事例ID,事例ID,…>`（`--ids-file <idsファイル>` でも可。公開はしない）。画像（段4b）は先に済ませる。中の順番と、落ちた時の見方は下の「3a」 | `data/reader-verdicts.json`、`data/reader-analysis.json`、`data/publication-audits.json`、`data/catalog-finished-ids.txt`、画面の層の5ファイル、`data/catalog-release.json`、`data/case-display.json`。所要時間は `data/pipeline/case-run.jsonl` | 最後に失敗した事例と理由が一覧で出る。直して同じ命令を再実行すれば、済んだ段は飛ばす |
| 11 | 検査 | `pnpm case-text:verify`、`pnpm case-chapters:todo`、`pnpm lint`、`pnpm exec tsc --noEmit` | なし | 表示された行と理由を読んで、画面の層の文を直す |
| 11b | 画面の自動監査（**必須**） | `pnpm build` の後に `pnpm reader-view:audit`（3100番が使用中なら `E2E_PORT=3110 pnpm reader-view:audit`） | なし（表は `test-results/reader-view-audit/report.md`） | 6b章。新しい違反が1つでもあれば落ちる。表の「事例・画面の箇所・該当文・規則」を見て画面の層の文を直す |
| 13 | 公開（**人の許可が要る**） | 画像を保存先へ上げる（`scripts/media/upload-media-assets.ts`）→ `pnpm catalog:publish`（R2 へ）→ `pnpm deploy:workers`（本番）→ 本番の画面で1件開いて確かめる | R2 と本番 | 5章を読む。許可が無ければ 12 までで止める |

- 段5は `pnpm case:run` が1本で流します（3a）。照合・分析・監査は AI をその場で呼ぶので、終了コード75の待ち合わせはありません。
- 毎日の自動実行（[`pipeline/DAILY_RUN.md`](./pipeline/DAILY_RUN.md)）は従来の `run-pipeline.sh` のまま、選別と公開版の計画までで止まり、公開はしません。
- **申請待ち（2026-10-07 時点）**: 段3の `--from-research` は、まだ main に入っていません（変更の申請 #164 の中）。入るまでは、#164 の作業用コピーの `scripts/reader-case/add-entity-records.ts` を使います。#164 には、段7の「式が無い」の食い違いの修正と、分析欄の文が無い事例を検査で落とす変更も入っています。

## 3a. 1本のコマンド `pnpm case:run`（2026-10-08〜）

```
pnpm case:run --ids a,b,c                # 公開データの作成まで。公開はしない
pnpm case:run --ids-file <idsファイル>   # 事例IDを1行に1つ書いたファイルでも指定できる
pnpm case:run --ids a --publish          # 最後に今の catalog:publish を呼ぶ（--publish を付けた時だけ）
```

オプション: `--from <段>`（その段から始める。段の名前は下の表。止まった所から続けたい時）、`--concurrency N`（同時に流す束・事例の数。既定4）、`--agent claude|codex|auto`（既定 auto = claude がログイン済みなら claude、無ければ codex。画面の文を作る `display:build` と同じ決め方）、`--model`、`--codex-effort`、`--max-attempts N`（束ごとに検査が拒否できる上限。既定3）、`--run-id`。

中身は次の順です。事例ごとに束を分け、AI の呼び出しは同時に最大4本まで流します。1件が落ちてもほかの件は止まりません。

| 順 | 段 | やること | 落ちた事例の扱い |
|---|---|---|---|
| 1 | fetch | 出典の本文を取る（`fetch-sources.ts`） | 取得の失敗は全件の失敗。取れない出典は照合に回らない |
| 2 | verify | 事実の照合（`build-verify-batches.ts` → AI → `merge-verdicts.ts`） | 束が検査を3回通らなければその事例は以降の段から外れる |
| 3 | source-check | 原文照合（`source-check.ts`） | 不合格の事例は「公開データの作成・公開から外す」だけで、ほかの段は続ける。直し方は 3.5 |
| 4 | analyze | 分析（`build-analyze-batches.ts` → AI → `merge-analysis.ts`） | 検査に通らない・入力が作れない事例は外れる |
| 5 | audit | 監査（`build-audit-input.ts` → AI → `merge-analysis.ts`）。監査済みの事例は飛ばす | 同上 |
| 6 | select | 仕上げ済みの選別（`select-finished.ts --keep-published`）。画像が「使ってよい」1枚も無い事例などはここで落ちる | 理由つきで外れる |
| 7 | display | 画面の文（`build-display.ts`）。事例ごとに別の作業場所で並列に作り、できた分を1つずつ実ファイルに反映する | 作れなかった事例は外れる。理由は `data/pipeline/display-build-failures.jsonl` |
| 8 | case-text | 文の検査（`pnpm case-text:verify`） | 落ちた行の事例が外れる（事例を特定できなければ全件） |
| 9 | prepare | 公開データの作成（`pnpm catalog:prepare --changed`）。原文照合で落ちた事例は含めない | 作れなければ段ごと失敗 |
| 10 | publish | `--publish` の時だけ `pnpm catalog:publish` | 公開データの作成が通っていなければ公開しない |

- **手元の証拠が要る段**: 選別（select）と公開データの作成（prepare）は、出典本文の保存（`data/source-cache/`）と画像台帳（`data/media-staging/`）を読みます。どちらもバージョン管理に入らないので、持っている作業場所で動かすか、持っている場所から連結してください。無い場所では「画像の権利または実体が未充足」「撤回の明示が足りない」で落ちます（落とし穴の表 12）。
- 各段の所要時間は `data/pipeline/case-run.jsonl` に1行ずつ（`runId`・段・開始時刻・秒・対象件数・失敗件数）。実行ごとの記録は `data/pipeline/case-run/<runId>/`（`logs/` に各命令の出力、`summary.json` に最後の一覧）。
- 束は `batch-r<runId>-NNN`（照合・分析）と監査の `in-999999…` で、1束に1事例。従来の `run-verify.sh` / `run-analyze.sh` / `run-audit.sh`（終了コード75で待つ版）は、毎日の自動実行と公開中の事例の直し（3b）がまだ使うので残してあります。
- 実体: `scripts/reader-case/case-run.ts`（順番と失敗の扱い）、`scripts/reader-case/runner/agent-run.ts`（束ごとにAIを呼んで受理するまで）、`scripts/reader-case/agent-call.ts`（`claude -p` / `codex exec` の呼び出し）。試験: `pnpm test:runner`。

## 3.5 出す前の原文照合（2026-10-07 追加。どの事例も必ず通す）

画面に出す前に、事実・数字・章の行を出典の本文と機械で照らす。作った側とは別の工程で、合格した物だけが画面の元になる。

1. `node --import tsx scripts/reader-case/source-check.ts --ids <事例ID>` で照らす（出典は `data/source-cache/` から読み、無ければ取る。取れなければ Web アーカイブを試す）。
2. 見ること: 引用が原文にある／数字が引用か原文にある／年が原文にある／数字の時点（年・月）が引用の近くか出典の公開日で裏づく／売上と呼べない数字（直接の支払いだけ・取扱高・アンケートの区分・別事業）に「売上」が付いていない。
2b. 不合格が1件でも残る間は終了コード1で終わる。公開の準備（`catalog:prepare`）へ進む前に必ずこの命令を通し、1が出たら進まない（`catalog:prepare` への組み込みは別の変更の申請で行う）。
3. 落ちた項目は `--apply` で再収集の指示書（`data/runner/instructions/recollect/<回>.md`）が出る。別の担当が別の出典・保存版を探し、直し方を訂正の台帳と同じ形で返す。`scripts/reader-case/apply-fact-corrections.ts` で当てる。 公開中の事例を直すと監査の受領書が無効になり、公開データ作りで目録から外れる。直したら対象を監査し直す（`build-audit-input.ts` → `run-audit.sh` → 別のAIが実行 → `merge-analysis.ts`）。出典本文の保存（`data/source-cache`）を照合で上書きすると元の引用が消えて「根拠の不一致」になるので、受領書の取り直しは元の保存で行う。手順はこの道具が実行後に表示する。
4. 3回で直らない項目は保留（`data/source-check/held.json`）。その項目だけ画面から外れ、事例全体は止めない。
5. 毎回の誤り率（落ちた数／照らした数）は `data/source-check/ledger.jsonl`。公開後は `--sample N` で抜き取って照らし直す。基準値は公開10件中7件（2026-10-07）。

数字には必ず「何の数字か」と「いつ時点か（出来事の日付。投稿日ではない）」を持たせる。強い名前（年商・月商・累計）は、原文がそう言っている時だけ。画面には出どころの印を出さず、出典は章の末尾に「出典1」「出典2」とまとめる。印は「推定」だけ。

## 3b. 公開中の事例を直した時の1本の流れ（人が付き添わない）

公開中の事例の文・数字を直すと（訂正の台帳を当てた、推論を直した、など）、公開の入力の指紋が変わり、前の監査の受領書が無効になる。何もしないと、その事例は公開の目録から外れる（外す承認は出さない。直して出し直す）。直したら必ず次の1本を通す。

```
bash scripts/reader-case/run-reaudit.sh <直した事例IDを1行ずつ書いた一覧>
```

| 段 | 何をするか | 備考 |
|---|---|---|
| 1 | 今の入力全体の監査の入力を作る（`build-audit-input.ts`） | 待ちで止まった後の再実行では同じ入力を使い続ける（タグは `data/pipeline/reaudit-<一覧のファイル名>.tag`。完了したら捨てる） |
| 2 | 別のAIが監査する（`run-audit.sh`） | 終了コード75ならサブエージェント待ち。出た指示書を別のAIに実行させ、結果を置いて同じ命令を再実行。自分で監査しない |
| 3 | 取り込み（`merge-analysis.ts`） | 審査で直した推論は `data/reader-analysis.json`、受領書は `data/publication-audits.json` |
| 4 | 反映（`case-reflect.ts`） | 受領書が審査した取り込み版にだけ、審査で直した推論を表示版（`data/case-reflect.json` の `approvedAnalysis`）へ届ける。取り込み出力（`data/case-import/`）が手元に無くても、反映記録の取り込み版から作る。受領書が審査していない版は通さない |
| 5 | 画面の文を作り直す（事例ごとに `build-display.ts --id <事例ID>`） | 一覧・要約・章・成功の秘訣・詳細のうち、古くなった層と足りない層を作る。別のAIの確認つき。手で書き換えない |
| 6 | 目録の確認（`prepare-catalog-release.ts --dry-run --changed`） | 外れる事例が0件なら終了コード0。残れば事例ID・理由を出して終了コード1 |

0件になったら `node --import tsx scripts/prepare-catalog-release.ts --changed <一覧>` で目録を更新する。

守ること:
- 推論の正本は `data/reader-analysis.json`。`approvedAnalysis` は反映の段が受領書と突き合わせて作る写しで、手で書かない。
- 出典本文の保存（`data/source-cache`）を照合などで上書きすると、元の引用が消えて「根拠の不一致」になる。受領書の取り直しは、審査した時の保存で行う。
- 手元にしかない証拠（画像台帳 `data/media-staging`、出典本文の保存）が無い作業場所では、公開の関門が通らない。持っている作業場所へつなぐ（コミットしない）。

## 3.6 試しに集めた事例を公開してよい形にする（2026-10-07 追加）

試しに集めた事例（例: 2026-10-07 の新規5件 Userlist・Rewardful・Ploi・Splitbee・Tuple。作業場所 `collect-trial-20261007` の `trial/*.json`）は、そのまま公開に入れない。公開するなら、普通の新しい事例と同じ道を通す。

1. 本番の作業場所で段1（重複判定と `data/CLAIMED_TARGETS.txt` の予約）からやり直す。
2. 調査記録を `--from-research` に通し、`unconfirmedFacts` と `thinCases` が0件であることを確かめる（試しの5件は、1回の差し戻しの後に0件）。コミットするのは `data/entity-additions/<名前>.json` だけ。
3. 段4〜9（出典の取得・照合・画像・分析・監査・選別）を通す。原文照合（3.5）で落ちた項目は再収集に回す。
4. 段10で画面の層を作り、別のAIに全行を確かめさせる。画面の1文が元の事実に辿れることの検査（[`pipeline/FACT_TRACE.md`](./pipeline/FACT_TRACE.md)）が入った後は、それも通す。
5. 段11の検査を通す。段12・13（公開データの作成と公開）は人の許可を取ってから。

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
- **日本語の自然さの関門**: 話し言葉・業界用語・説明のない略語（「非公開版で回した」など）は `data/natural-japanese.json`、文法の誤りは textlint（`.textlintrc.json`）、料金の欄の意味の通らないプラン名や返金などの付帯条件も、同じ `pnpm case-text:verify` が言い換えの候補つきで落とします。落ちた行は手で直さず、`pnpm display:build --repair-only` が行の位置・出典・印を保ったまま言い回しだけを直します（基準は `docs/CASE_TEXT_STANDARD.md`）。
- **層をまたぐ重複の作り直し**: 概要・成功の秘訣・分析欄・章で同じ数字や同じ話が重なると、画面の自動監査（`pnpm reader-view:audit`）が落とします。`pnpm display:build --dedupe`（`--list` で対象だけ確認）は、重なっている概要と分析欄の行だけを作り直します（章と成功の秘訣は動かさず、言い回しの直しもしません。同じ折りたたみの分析欄どうしの重なりは対象外）。作り直す側と確認する側は別のAIにします。

## 6b. 画面の自動監査（2026-10-07〜。新しい事例を足すたびに必ず通す）

人が画面を開いて全部読む監査を、機械に置き換えたものです。公開している全事例の一覧と詳細（概要・数字の帯・章・分析・成功の秘訣・出典）を、本番と同じサーバーで実際に描き、読む人に見える文に規則を掛けます。

- **実行**: `pnpm reader-view:audit`（中身は `e2e/reader-view-audit.spec.ts`）。自動テストの「E2E smoke」が `pnpm test:e2e` で毎回これも回します（定常の検査）。
- **一覧**: 一覧は10件ずつ段階で読み込むので、末尾までスクロールして全事例の行が描かれてから読む。
- **時間**: 公開10件で約10.5秒（2026-10-07、手元の実測。サーバー起動を含めて約13秒）。1件あたり約1秒なので、数百件になったら手分けして回す（Playwright の `--shard`）か、夜間の実行へ移す。
- **規則**（`scripts/reader-view/rules.mjs`、誤検出の確認は `scripts/reader-view/rules.test.mjs`）:

| 規則 | 落とすもの |
|---|---|
| a. 出どころの印 | 括弧の中の印と媒体の呼び名（「（本人申告）」「（保存ページ）」「（インタビュー）」「（作家のブログ、2009年3月）」「（Hacker News、…）」など）。単独の印は「推定」だけ出してよい |
| b. 出典 | 章・まとまりの中の、「出典1」「出典2」以外のリンク。同じ出典を章ごとに繰り返すこと |
| c. 料金 | 無料試用・カード不要・「PDFは無い」などの付帯条件、税・返金・別料金。帯の料金が長いこと（プラン名＋月額＋人数・回数の上限だけにする） |
| d. 概要 | 1行目が規模（人数・売上）でないこと、料金が2行以上あること、売り方の並べ立て（「支払い方は、A、B、Cの3つ」） |
| e. 同じ数字 | 同じ事例の画面の別の場所に、同じ値が2回以上（「65万人」と「650,000人」、「$5,472」と「5,472ドル」も同じ）。円換算の括弧と年号は数えない。数字が無くても、同じ言い回し（記号・空白を除いて連続14字）が別の場所に出たら同じ話の繰り返し（「Cool Tools経由はよく払い、Reddit経由はほぼ払わなかった」が2つの章に出る、など）。章末の出典の一覧は数えない |
| f. 略語 | 説明の無い英大文字の略語（固有名の一部と、誰でも分かる略語は通す） |
| g. 円換算 | 外貨の金額があるのに、同じ文に円が無いこと |
| h. 項目名と中身 | 項目名と数字の種類の対応表に合わないこと（「年商」の欄に、特定の支払いだけ・件数の数字など） |
| i. 画像 | 製品画面が1枚も出ていないこと（アイコン・ロゴだけでは足りない。[`OWNER_INTENT.md`](./OWNER_INTENT.md) 7章） |

- **事例データ側の検査（`pnpm case-text:verify`）との分担**: あちらは書いた文の1行ずつ、こちらは部品が組み合わさって画面に出た後にしか分からないこと（重複・出典の並べ方・印の残り・帯の項目名と中身・画像）を見ます。
- **既知の違反**: 直す担当が決まっている違反は `data/reader-view-known.json`（事例・規則・箇所・該当文・誰が直すか）。ここに無い違反は落ちます。直った違反が残っていても落ちます（一覧は減らすだけ）。初回の取り込みにだけ `READER_VIEW_WRITE_KNOWN=1` を付けて書き出しました。**新しい事例の違反をここに足して通すのは禁止**（その事例の画面の層の文を直す）。
- **保留の規則**（表には出すが落とさない）: d の「概要の1行目が規模」は、画面をそう作る変更が main に未統合のため保留。i の画像は、承認済みの画像の置き場（`data/media-staging`）が無い環境（自動テスト）では保留で、置き場がある手元か `READER_VIEW_IMAGES=1` で見ます。変更が入ったら `scripts/reader-view/rules.mjs` の `PENDING` から消します。

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
| 25 | 数字の帯（料金・手残り・売上の推測）の推論は編集文を通らず原文のまま出るので、外貨に円換算が無いと文の基準の検査で落ちた | 帯の1マスは、料金の事実の欄と同じく `withYenApprox` で円換算の概算を添えて出す。検査（`detail-coverage.ts`）も同じ文に掛ける |
| 26 | 公開10件中7件で数字が出典と合わなかった（直接の支払いを年商に、投稿日を出来事の日付に、読めない出典を確認済みに） | 集める時に数字ごとに種類・出来事の時点・引用・出典・取得日を付ける（README「数字の決まり」）。取り込みが決まりを満たさない項目だけを `unconfirmedFacts` に分け、収集役へ差し戻す |

## 9. 関連する正本

- [`OWNER_INTENT.md`](./OWNER_INTENT.md): 何を・なぜ・どこまで（いちばん上の正本）
- [`DATA_COLLECTION_MASTER_GUIDE.md`](./DATA_COLLECTION_MASTER_GUIDE.md): 収集の決まりと過去の失敗
- [`research-record/README.md`](./research-record/README.md): 調査記録の必須項目と見本
- [`pipeline/CLAUDE_RUNNER.md`](./pipeline/CLAUDE_RUNNER.md)、[`pipeline/DAILY_RUN.md`](./pipeline/DAILY_RUN.md)、[`pipeline/DISPLAY_CONTRACT.md`](./pipeline/DISPLAY_CONTRACT.md): 照合・分析・監査の流れと画面に出す項目
- [`CASE_TEXT_STANDARD.md`](./CASE_TEXT_STANDARD.md)、[`CASE_CHAPTER_PROCESS.md`](./CASE_CHAPTER_PROCESS.md): 画面の層の文の書き方
- [`MEDIA_ASSETS_AND_PROVENANCE.md`](./MEDIA_ASSETS_AND_PROVENANCE.md): 画像
- [`architecture/STORAGE.md`](./architecture/STORAGE.md): 保存先
