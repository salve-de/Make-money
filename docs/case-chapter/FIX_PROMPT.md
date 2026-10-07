# 確認の指摘を直す 手順書

日本語で作業・報告する。リポジトリは /Volumes/SS/Worktrees/Make-Money/chapters（ブランチ feat/case-chapters-20261007）。編集してよいのは次の3ファイルのうち、割り当てられた事例（entityId）の部分だけ:
- data/case-chapters.json（新しい章）
- data/detail-lines.json（画面に出ている旧い編集文。analysisId ごとの answer / note。textHash は元の文の指紋なので変えない。変えると表示されなくなるので、answer / note だけ直す）
- data/success-points.json（旧い「成功の秘訣」。head / body だけ直す。factHash は変えない）
他の事例の行・他のファイルは触らない。git は使わない（コミットしない）。
JSON の編集は、Python の短いスクリプトで「読む→自分の事例だけ変更→すぐ書く」を一度で行う（他の担当が同じファイルの別事例を同時に直すため、長く開いたままにしない）。書式は indent=2、ensure_ascii=False。

## 入力
確認報告（直す箇所の一覧）: 割り当てられた review-*.md（/tmp/claude-501/pilot/ 内）。調査メモ: /tmp/claude-501/pilot/<事例名>-research.md。

## 直し方
1. 報告にある「問題のある行」は、直す文案があればその文案どおりに直す。「削除」は行ごと消す。重複の指摘は、章どうしで片方を消す（情報の多い方を残す）。
2. 方針違反（資金・前職・売却・続くか・作業時間・不満だけで終わる行）は削除する。
3. 「要確認」とされた行は、調査メモで裏が取れなければ削除する（出典の無い事を足さない）。
4. 旧い編集文（detail-lines / success-points）の食い違いは、調査メモで裏が取れる正しい文に直す。裏が取れない記述は、その文から外す（文全体が成り立たなくなる場合は、その analysisId に "hidden": true を付ける。hidden の使い方は detail-lines.json の既存例を見る）。
5. 規則（検査で落ちる）: 1行90字以内（旧文は answer 60字以内・note 120字以内）、外貨には円換算（約◯円）、「0円」「未確認」「不明」「公開されていない」「書かれていない」「確認できない」「分からない」「非公開」を使わない、命令形（しよう・しろ・せよ・してください・すべき）を使わない、turning の行は「前: …。後: …」の形、各行に https の出典URL（source）。章の行が全部消えた章は、キーごと消す。
6. 日本語は短く自然に。難しい熟語を使わない。
7. 直した後、次を実行して通ること: cd /Volumes/SS/Worktrees/Make-Money/chapters && node scripts/architecture/check-case-text-standard.mjs （他の担当の編集で他事例の違反が出ることがあるが、自分の事例の違反は必ず無くす）。

## 報告
直した行数、削除した行、直さなかった指摘とその理由、検査の結果を短く報告する。
