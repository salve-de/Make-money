# 章の案（*-v2.md）を、画面用のデータ（JSON）に変換する手順書

日本語で作業・報告する。リポジトリのファイルは編集しない。出力は /tmp/claude-501/pilot/json/<事例名>.json。

## 入力
- /tmp/claude-501/pilot/<事例名>-v2.md（章の案。見出しは「やり方の具体／つまずきと立て直し／時間順の流れ／真似るべき戦略の核／出発点／価格の変遷／客の声」）
- /tmp/claude-501/pilot/<事例名>-research.md（調査メモ。出典URLが書いてある）
- 見本: /tmp/claude-501/pilot/gorails-v2.md と /Volumes/SS/Worktrees/Make-Money/chapters/data/case-chapters.json（GoRails の分）

## 出力の形
[{"entityId":"<id>","chapters":{"practice":[{"text":"…","source":"https://…"}],"turning":[…],"timeline":[…],"core":[…],"start":[…],"price":[…],"voices":[…]}}]
章のキーは practice / turning / timeline / core / start / price / voices。材料の無い章はキーごと出さない。

## 規則（検査で落ちる。必ず守る）
- 各行は text（90字以内）と source（その行の事実を実際に確認した出典の https URL。調査メモの出典から選ぶ。Wayback の保存版URLも可。出典が付けられない行は出さない）。
- 外貨（ドル・$・ルピー・ラック・クロール・ユーロ・ポンド）を含む行は、同じ行に「円」の概算（約◯円）を付ける。1ドル=150円、1ルピー=1.75円。
- 「0円」「未確認」「不明」「公開されていない」「書かれていない」「確認できない」「分からない」「非公開」を行に含めない。
- 「〜しよう」「〜しろ」「〜せよ」「〜してください」「〜すべき」を含めない。
- turning の行は必ず「前: …。後: …」の形（「前:」で始め、「後:」を含む）。
- 見出し＝答えの短い自然な日本語。難しい熟語・コンサル用語を使わない。印（本人・公式・第三者・推測）は行末の括弧に残す。
- v2 案の中で、次に当たる行は出さない: 運・追い風の話、創業者の前職や資金の話、続くか・依存リスク、作業時間、会社の売却・買収の話（時間順の流れの中の事実としてのみ可）、数字の本物らしさの注記、不満だけで終わる行（客の声は、不満は「初期の指摘とその後の対応」の形で出すなら可）。
- 「確認が要る点（画面には出さない）」の節に書かれた事項に関わる行は、確かな形に直す（食い違う数字・時期は出さず、確かな方だけにする）。
- 事例どうしで文を使い回さない。

## 章と一緒に作るもの（必須）
章だけでは、章の下の分析欄が推論の原文（円換算なし・専門語あり）のまま画面に出る。同じ事例について、次の2つも出力する。形と基準は docs/CASE_CHAPTER_PROCESS.md の「分析欄の編集文と成功の秘訣」。
- 分析欄の編集文（data/detail-lines.json の形）: 画面に出る推論1つにつき `{"entityId","analysisId","textHash","answer","note"}`。`analysisId` と `textHash` は `node --import tsx scripts/reader-case/detail-coverage.ts <entityId>` の出力から取る。答える材料が無い項目は `"answer":"-","hidden":true`。外貨には円の概算、data/reader-language.json の語と「公式サイトによると」「本人によると」は使わない。出典で確定できない年月は書かない。
- 成功の秘訣（data/success-points.json の形）: `{"entityId","points":[{"head","body","factId","factHash"}]}` を3〜5点。head はやった事（40字以内）、body は根拠の事実（140字以内）、factId・factHash は根拠にした画面の事実とその指紋。
出力先は章と同じ場所に、<事例名>.detail-lines.json と <事例名>.success-points.json。

## 報告
作った JSON のパス（章・分析欄の編集文・成功の秘訣）、出した行数、落とした行とその理由、出典を付けるのに迷った行を、短く報告する。
