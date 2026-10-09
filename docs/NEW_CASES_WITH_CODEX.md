# 新しい事例を Codex だけで足す（1つの命令）

Codex に頼む時の1行: 「`docs/NEW_CASES_WITH_CODEX.md` を読んで、新しい事例を N 件足して」。Claude は使わない。

## 実行する命令

```
pnpm case:new --count 3                        # 候補を3件探して、最後まで通す
pnpm case:new --ids cand_a,cand_b              # queue にある候補を指定して通す
pnpm case:new --ids cand_a --redo              # 取り込み済みの候補を、調べるところからやり直す（調べる指示を直した後の比べ直し）
pnpm case:new --run-id <名前>                  # 止まった時。同じ名前でもう一度流すと続きから
```

オプション: `--research-effort`（候補探しと調べる段の深さ。既定 high）、`--write-effort`（文を書く段。既定 high）、`--effort`（照合・分析・監査。既定 medium）、`--concurrency`（既定2）、`--from discover|research|media|run|check`。公開（`catalog:publish`・本番反映）は `--publish` を付けた時だけ。付けない限り手元で止まる。

中身は 候補探し（`case:discover`）→ 調査記録と一覧への取り込み（`case:research`）→ 手元の索引へ合流 → 画像（`ensure-case-media`）→ 取得・照合・分析・監査・選別・画面の文・文の検査・公開データの作成（`case:run`）→ 形と文の検査（`case-pages:check`・`case-tags:check`・`case-text:verify`）。環境変数 `CASE_AGENT_LOCK=codex` を立てて子の処理まで流すので、どの段も claude を選べない（`scripts/reader-case/agent-call.ts`）。

終わると「何件できた・何件落ちた（理由）・手元で見る URL（`http://localhost:3070/?entity=<id>`）」を出す。人の目で見る物（画像の保留など）は止めずに一覧で出す。状態は `data/pipeline/case-new/<実行名>/`（`state.json`・`summary.json`・`logs/`）。

## 止まった時の見方

| 出たもの | 見る所 | 対処 |
|---|---|---|
| 落ちた `[research]` 見送り | queue.jsonl の `skipReason` | 数字の出典が取れない・薄い事例は見送りが正しい。別の候補で足りない分を探す |
| 落ちた `[analyze]`「照合で残った事実が無い」 | `data/pipeline/case-run/<実行名>-run/logs/` | 手元の索引に事例が無い時に出ていた。いまは `index` の段が自動で取り込む。それでも出れば調査記録の事実が出典と合っていない |
| 落ちた `[display]` | `data/pipeline/case-write-rejected/<id>.rejected.md` と `data/pipeline/case-write.jsonl` | 照合の落ちた所が末尾に書いてある。直すのは文ではなく指示・検査（下の表） |
| 画像「保留あり」「使える画像なし」 | `ensure-case-media` の出力 | 止めずに人の目で見る一覧に出る。公開前に1枚ずつ見る |
| 途中で固まった | 各段のログ | 同じ命令に `--run-id` を付けて続きから（各段は終わった所を飛ばす） |

## どの段に何の資料が渡るか

オーナーの指示を凝縮した1枚 `docs/owner/OWNER_RULES.md` は、**どの段にも必ず渡る**（`ownerContext` が絞り込みに関わらず付ける。`scripts/reader-case/owner-context.ts`）。元の長い記録 `OWNER_DIALOGUE_LOG.md` は渡さない（OWNER_RULES の各項目の番号から辿る）。新しい指示は OWNER_RULES に足せば次の実行から全段に効く。

| 段 | 指示本体 | 一緒に渡る資料 |
|---|---|---|
| 候補探し | `discover-prompt.md` | **OWNER_RULES**・READER_EYE・LEAD_LINE_SHEET・OVERVIEW_SHEET・DECIDED_UI |
| 調べる・直す・タグ | `collect-prompt.md` | natural-japanese SKILL・タグの一覧（case-taxonomy）・上の5枚 |
| 事実の照合・分析・監査 | `verify-prompt.md`・`analyze-prompt.md`・`audit-prompt.md` | 上の5枚 |
| 書く | `case-write/write-prompt.md` | 見本 Candy Japan・**OWNER_RULES**・READER_EYE・LEAD_LINE_SHEET・OVERVIEW_SHEET・natural-japanese SKILL・CASE_TEXT_STANDARD |
| 事実を照らす | `case-write/fact-prompt.md` | **OWNER_RULES** |
| 読む | `case-write/read-prompt.md` | 見本 Candy Japan・**OWNER_RULES**・READER_EYE・OVERVIEW_SHEET・natural-japanese SKILL・CASE_TEXT_STANDARD |
| 照合の差し戻し（直す） | `write-prompt.md` | 見本・**OWNER_RULES**・natural-japanese SKILL・CASE_TEXT_STANDARD |

書く・読む・直す段には DECIDED_UI（画面の部品の決定）を渡さない。文を書くのに要らないため。

確かめる試験: `scripts/reader-case/runner/case-new.test.ts`（候補探し・調べる・照合・分析・監査）と `case-write.test.ts`（書く・照らす・読む・直す）。

## オーナーの指摘は、どの紙に足せば次から効くか

指摘を指示文（`*-prompt.md`）に写して二重に持たない。足す先は1か所。

| 指摘の種類 | 足す先 |
|---|---|
| オーナーの指示そのもの | `docs/owner/OWNER_RULES.md`（全段に効く。元の記録は `OWNER_DIALOGUE_LOG.md`） |
| 一覧の1行の良い例・悪い例 | `docs/owner/LEAD_LINE_SHEET.md` |
| 概要の良い例・悪い例 | `docs/owner/OVERVIEW_SHEET.md` |
| 読む人の目線の根っこ | `docs/owner/READER_EYE.md` |
| 日本語の言い回し・使わない語 | `.claude/skills/natural-japanese/SKILL.md` |
| 数字・円換算・見出しの形の標準 | `docs/CASE_TEXT_STANDARD.md`（検査は `pnpm case-text:verify`） |
| 画面の形 | `docs/design/DECIDED_UI.md` |
| 承認済みの全体の見本 | `docs/owner/MY_CANDY_JAPAN_2026-10-08.md` |

## 守ること

合法な公開情報だけ。ログイン・有料の壁・規約で自動取得を禁じた所・CAPTCHA は越えない。読む人に真似の手順を書かない。出典に無い数字を書かない（推測には「（推測）」）。人物写真・同意の帯が写った画像は使わない。画像を R2 へ上げない。毎日自動で動かす設定や見張りは作らない。

## 後から足した検査と、画像の見え方

- 出典の番号は1から詰める／本文で使っていない通貨の断りは置かない／時間順の流れは5行以上。`pnpm case-pages:check`（lint に入っている）が見る。`data/case-pages-legacy.json` にある既存の事例では警告（件数だけ出す）、そこに無い新しい事例（case:new で作る物）では止める。書き出す時は `tidy`（scripts/case-write/run.ts）が番号と通貨の断りを機械で直し、5行未満は書く段へ書き直しに返す。
- 出典に無い見立ては、照らす段が「出典に無い見立て」として挙げ、受け取った側が文の最後に「（推測）」を付ける（消さない）。1行・概要に置けない見立てだけは外す。
- 画像: 取得は試すが、製品の画面が1枚も使えない事例は「製品の画面なし」と出す。手元の画面で見る時は 3071 番へ直接つなぐ（3070 番の中継は画像だけ本番から取るため、本番に無い事例は出ない）。
