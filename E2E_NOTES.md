# 新規事例の一発通し試験（2026-10-07、Keygen）

対象: Keygen（https://keygen.sh、ent_keygen_f67d337b226e）。重複判定で未収集を確認済み。data/CLAIMED_TARGETS.txt に予約行を追加。

## 止まった所・手が要った所（逐次追記）

1. 収集 → 目録への追加: 新しく調べた事例を data/entities-index.json に入れる正式な入口が無い。
   - ingest:incoming（process-incoming.ts）は R2 へ書く（公開側への書き込みで禁止）。
   - add-entity-records.ts は別の公開目録からの抜き出し専用（--collect は manifest と artifacts が必須）。
   - 対処（道具側）: add-entity-records.ts に `--from-research <records.json> --name <name>` を足し、調査で書いた記録を形の検査つきで data/entity-additions/ に置けるようにする。
2. 収集そのもの: 記録 JSON（facts・reaudit.sources）を作る指示書や自動の段が無く、調査担当（人またはAI）が手で書くしかない。今回は私が出典を開いて書いた。
3. 作業用コピーには data/source-cache、data/media-staging、data/analyze などの作業データが無い（git 管理外）。各段がその場で作る前提で進める。
4. 目録への合流: add-entity-records.ts に --from-research を足して通した（記録 1件追加）。最初は形の検査で落ちた（temporal.viabilityLabel が必須、unknownsNotes は文字列の配列）。調査担当向けの記録の見本・必須項目の一覧が無いため、検査の誤りを読んで手で直した。
5. 出典取得（fetch-sources --ids）: 14件すべて取得。止まらず。
6. 照合（run-verify.sh）: サブエージェント待ち（指示書 data/runner/instructions/verify/batch-001.md）で止まる設計。私には Agent 道具が無いので、指示書どおり自分で判定し、引用は本文から機械で切り出して inbox に置いた。受理 1束、SUPPORTED 22・PARTIAL 4・NOT_SUPPORTED 0。
   - 注意: 事実を書いた者と照合した者が同じ（独立性なし）。引用の一致は機械で確認済み。
7. 分析（run-analyze.sh）: これもサブエージェント待ち。指示書どおり私が書いて inbox に置き、受理された。
8. 分析の統合（merge-analysis）: 15項目中5項目（STORY、PRICING、LOCK_IN、INCUMBENT_BLINDSPOT、TIMELINE）が number-without-formula で黙って落ちた。
   - 原因（道具側の食い違い）: 分析の指示書は「式（formula）は推定の時だけ」と言うが、受け入れ検査は「金額・%を含む文は式が必須」。事実の言い換えで数字を書くと必ず落ちる。取り込み経路（import-case-rebuild.ts）だけは「数字は出典に載っている値」を自動で入れて通していた。
   - 対処: scripts/reader-case/analysis-lib.ts の checkItem で、strictNumbers の時、式が無く・推定でなく・文の数字がすべて basis の事実にある項目に同じ式欄を入れて通すようにした。試験を1件追加（scripts/reader-case-number-origin.test.ts）。出典に無い数字は従来どおり落ちる。
9. 監査（run-audit.sh）: サブエージェント待ち。指示書どおり私が判定して inbox に置いた（FIX 3件: 「1人」と「特定の販売の場に乗らない」は事実に無い）。受理された。ただし監査は直す前の分析（10項目）の入力で続行したため、8 の修正で増えた項目は次の回の監査に回る。
10. 選別（select-finished）: Keygen は「事業の公開区分または根拠が無効」で落ちた。
   - 原因（道具側）: 公開区分の判定（hasValidEvidenceLocator）は根拠カード（evidenceCards）か観測（observationsStream）が要るが、--from-research で入れた記録には無かった。
   - 対処: add-entity-records.ts の --from-research で、根拠カードが無い時は reaudit.sources から出典の所在カードを作るようにした（--collect の --packs と同じ作り）。目録は HEAD の版から入れ直した。
11. 画像: fetch-official-assets.ts と auto-review.ts でアイコン1枚が「使ってよい」、宣伝用の og 画像は除外、ホーム・料金ページの画面写真2枚は同意バナーがあるため人の確認待ち（held）。画面写真を出すには人の確認が要る。
12. 公開版の計画: 作業用コピーには既に公開中の10件の作業データ（出典本文・画像・監査）が無いため、10件すべてが「仕上げ済みでない」になり、計画が「10 → 0（撤回10件）」になって止まった（撤回の明示が要る、で停止）。公開はしない指定なので害は無いが、作業用コピーでは選別が既存の公開分を再現できない。新しい1件の確認は data/pipeline/select.json の理由で見る。
13. 監査2回目（増えた項目）も私が判定して受理。Keygen は仕上げ済みに入った（data/catalog-finished-ids.txt）。流れは「撤回の明示が足りない」で止まるが、これは12の作業用コピー由来。
14. 章と概要: list-lines・summary-lines・case-chapters に Keygen を追加（章7つ・26行）。case-text:verify は通過、case-chapters:todo は「章が出る 1」。
   - 手が要った所: 一覧の文の factHash は手順書に「list-lines からそのまま写す」とあるが、新しい事例には写す元が無い。textFingerprint（src/shared/list-lines.ts）で要約の事実 f1 から自分で計算した。
   - 最初に JSON を1字下げで書いて全行の差分が出た（元は2字下げ）。手順書に書式の記載が無い。
   - success-points・detail-lines は今回は作っていない（任意と判断）。
15. 別AIの全行確認: codex:rescue（Codex、読み取り専用）に出典を開いて確認させた。26行中15行が NG（専門語「ソースコード」「本番」、1行に答え2つ、出典より言い過ぎ、比較対象のずれ、公開時期の食い違い）。指摘を反映して24行に直した（公開時期の行は出典が食い違うので外した）。直した後の再確認はまだ。
   - 手が要った所: 指示の「Agent ツールで codex:codex-rescue を呼ぶ」は私の環境に Agent ツールが無いため、codex-companion.mjs task を Bash で直接呼んだ。
16. lint: 最初は「data/collected-registry.json の件数が entities-index.json と合わない」で失敗。pnpm registry:sync（ローカルファイルだけを書く）で直して通過。--from-research の後に registry:sync が要ることが手順に無い。tsc --noEmit は通過。
17. 注意: select-finished が data/catalog-finished-ids.txt を Keygen 1件だけに書き換えた（作業用コピーでは既存10件が仕上げ済みにならないため）。この差分はコミットしない。
18. 画面確認（next dev --webpack -p 3060、ブラウザで画面の文字を読んだ）:
   - 画面に出すには公開目録（data/catalog-release.json と .catalog-release/）が要るが、流れ（PIPELINE_NO_PUBLISH=1）はそれを作らない。手元だけで prepare-catalog-release.ts --withdrawals（既存10件を外す一覧）を実行して作り、確認後に catalog-release.json と case-display.json は元に戻した（.catalog-release/ は未追跡のまま残っている。コミットしない）。
   - 見えたもの: 一覧に Keygen 1件、概要（一覧の文＋2文目以降）、章7つ・24行、各行に出典リンク（24本、15種のURL）、アイコン画像（手元の画像置き場から表示）。
   - 作る側の用語: 「SaaS」が1か所。分野の札「SaaS・ツール」（sector NICHE_SAAS の表示名）。全事例共通の表示で、この事例の文ではない。MRR・公式トップ・やり方・未確認・不明は0件。
   - 気になった点: 章の下の分析欄（料金・大手が手を出せない理由など）は detail-lines が無いため推論の原文のまま出ており、ドル額に円換算が無い（「月24ドル・49ドル・99ドル」「年10万ドル超」）、「ソースコード」「組み込み」が残る、物語に「2016年10月ごろ公開」（出典が食い違う時期）が残る。編集文 detail-lines を作れば直せるが、今回は作っていない。
19. コミットに入れないもの: data/catalog-finished-ids.txt（作業用コピーの選別で既存10件が消えた版）、data/pipeline/、data/audit/、.catalog-release/。そのためコミット後の状態で pnpm case-chapters:todo を回すと Keygen は「仕上げ済み」に入らない（仕上げ済みの一覧は本来の作業場所で選別し直す必要がある）。
