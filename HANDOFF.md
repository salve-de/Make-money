# Make-Money 引継ぎ入口（2026-09-13 最新正本）

> **【別チャットのAntigravityへの最優先引継ぎ】**:
> ユーザーは長文指示を絶対に書かない。ユーザーの一言「勝ちの方だけ集めて」「地雷（負け）の方だけ集めて」「データ集めて（デフォルト7:3）」で完全自律稼働せよ。
> 追加の質問や手戻り確認は一切不要。以下の3大正本を読み、直ちに底引き網調査 ➔ P&L逆算 ➔ 完全体JSON精錬 ➔ R2保存まで完遂せよ。

## 1. 必読の最高正本
1. **出力JSONフォーマット・完全体テンプレート**: [`docs/GOLDEN_INGEST_SCHEMA.md`](docs/GOLDEN_INGEST_SCHEMA.md)
   - 必須10大属性、円換算P&L因数分解（Stripe手数料控除・創業者手残り純利）
   - `LOOT_BLUEPRINT`（略奪転用方程式）100%必須配備
   - 現場配管ツール原価（`operations.toolStack`）
   - 勝ち組テンプレート（4.1）および地雷組テンプレート（4.2: `financialStatus: 'POST_MORTEM'` ＆ `FATAL_BLEED` 必須）
2. **調査目録・9レーン・12領域・4大禁忌**: [`docs/MAKE_MONEY_COLLECTION_SCOPE.md`](docs/MAKE_MONEY_COLLECTION_SCOPE.md)
3. **100年R2完璧構造（保存先）**: [`docs/architecture/STORAGE.md`](docs/architecture/STORAGE.md)
   - Layer 1: 生原本 ➔ `foundation-raw/blobs/sha256/<hash>`（Create-Only、上書き禁止）
   - Layer 2: 保存票 ➔ `foundation-lake/journal-entry.v1/<id>.json`（追記専用）
   - Layer 3: 目録 ➔ `data/entities-index.json`（単一目録で1行JOIN）
   - **【絶対不可侵】**: `universal/data-assets/financials/`（EDINET正本領域）には1文字たりとも書き込むな・触れるな。
4. **横断自律収集契約**: [`docs/architecture/AUTONOMOUS_DATA_INGEST_PROTOCOL.md`](docs/architecture/AUTONOMOUS_DATA_INGEST_PROTOCOL.md)

- **勝ち組（業種・規模不問、構造的勝者）**: キーエンス（直販製造業）、Gymshark（D2Cアパレル）、マニー（ニッチ独占医療器具）、ShipFast（SaaSボイラープレート）、Carrd（軽量LPインフラ）、Formula Bot（業務痛みの財布）等
- **地雷組検死（業種・規模不問、巨額炎上・即死・規約変更死）**: Humane Ai Pin（過熱即死ハードウェア）、Fast（180億調達・月商60万即死フィンテック）、Quibi（2,000億炎上短尺動画）等

