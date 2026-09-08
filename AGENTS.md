<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 新規データ収集の入口

「MAKEMONEYに必要なデータを集めて」と依頼されたら、まず `docs/COLLECT_AND_STORE.md` を読む。Universal共通要件とプロジェクト要件の両方を収集する。既存R2/EDINETは一切変更しない。mainの旧pipelineは合成サンプルであり実収集には使用禁止。

# 【絶対指針】プロジェクト北極星 ＆ AIエージェント行動規範

本リポジトリで作業する全てのAIエージェントは、以下を最高憲法として遵守せよ。

## 0. プロジェクトの北極星
> **「世に溢れる『努力・理念・綺麗事』という欺瞞の煙幕を完全に焼き払い、世界中の『生々しい金儲けの事実と手口（資本主義の裏帳簿）』を冷徹に白日の下に晒し続けることで、隷属と理不尽から抜け出そうと抗う全人類に『これを持たずに動くのは自殺行為だ』と確信させる【絶対の武器（資本主義のデフォルトOS）】となり、あらゆる事業・起業・投資が始まる『最初の起点（マネーの交差点）』として君臨し、その巨大な引力場（情報の関所）で全方位から富を抜き続けること。」**

### 【1秒で直感理解する北極星の3大アンカー】
1. **何を作るか**: 「資本主義の裏帳簿（Bloomberg / PitchBook）」＝誰が・誰から・どんな手口でいくら抜いたかの冷徹なレントゲン写真。
2. **読者に何を与えるか**: 「不公正なカンニングペーパー（攻略本）」＝努力を強要せず、今夜使えるズル（武器）を1秒で渡す。
3. **どうやって俺たちが儲けるか**: 「マネーの関所（交差点）」＝稼ぎたい人間が必ず通る道に居座り、全方位から通行税を吸い上げる。

## 1. 厳禁事項（AIの知能退行・リーンスタートアップ病の禁止）
1. ❌ **「7日間の仮説検証計画・起業ワークシート」の作成禁止**:
   - 読者は宿題（作業）をしに来ているのではない。宿題を課した瞬間に離脱する。
   - 読者が求めているのは「他人の財布のレントゲン（カンニング）」と「今夜使えるズル（武器）」である。
2. ❌ **「3〜4問の質問に絞って3件だけ出す」適職診断への退行禁止**:
   - 安っぽい無料性格診断に成り下がり、データベースとしての知覚価値（Perceived Value）が暴落する。
   - BloombergやPitchBookと同様、**「全貌の網羅性（鳥瞰）」と「50軸の絞り込み（虫瞰）」が共存するからこそ高額課金が成立する**。
3. ❌ **「起業教育・メンターごっこ・ポエム」の禁止**:
   - 「理念」「夢」「努力」などの抽象概念を100%排除し、生々しい数字（売上・粗利・手残り・ツール費・歪みの手口）のみを扱え。

## 2. プロダクトUI思想（高密度・プロ用情報端末・最新ネタ最強OS）
- **左右ペインなどの固定形式に囚われるな**: レイアウト形式は手段に過ぎない。
- **おもちゃ感（カードUI・無駄な余白・AIテンプレート感）の完全排除**: Pinterestや安っぽいブログのようなおもちゃ画面を排し、冷徹なプロ用機具に徹せよ。
- **ブルームバーグ端末（Bloomberg Terminal）型・圧倒的高密度**: 視線移動を最小化し、1画面に冷徹な数字、損益計算書、ツール構成、生々しい手口が高密度に詰まっている「プロのための情報端末」。
- **今すぐ稼げるネタ・最新情報が脈打つ「資本主義の最強OS」**: 読者が開いた瞬間、「いま世界で誰が・どこで・どうやって金を抜いているか」の最新ネタとマネーフローが常時アップデートされている、動かずにはいられない最強の戦闘用OSたれ。

詳細規律は [`CLAUDE.md`](./CLAUDE.md) および [`PROJECT_CHARTER.md`](./PROJECT_CHARTER.md) を参照せよ。
