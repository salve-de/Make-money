# 金鉱録 (KIN-ROKOKU / Universal Business Foundation)

> **「世界中の『生々しい金儲けの事実と手口』を証拠付きで吸い上げて蓄積し、読者には『事業のカンニングペーパー』として熱狂させ、自身は『マネーの関所』として莫大な富を抜く。」**

資本主義の裏帳簿（誰が・誰から・どうやって金を抜いたか）の独占的アーカイブと、将来のあらゆる事業（Idea Spark / GOLDMINE / M&A仲介等）で半永久的に使い回すUniversal Data Foundationのフロントエンド兼データレポジトリです。

---

## 🏛 プラットフォーム「3大ビュー（三位一体構造）」

本プラットフォームは、読者の心理・感情・欲求から逆算された3大画面で構成されています：

```
[最上部ナビゲーション]
  ├─ ① ポータル・特集 (PORTAL) ────── マクロトレンド、地雷市場(死体) ⇄ 金脈(生者)の直接対比
  ├─ ② 💡 アイデア台帳 (IDEAS_VAULT) ─ 手札ゼロから最短で現金を抜く実践アイデア・手口一覧
  └─ ③ 分析台帳 DB (TERMINAL) ────── 22社の実在損益計算書、ウォーターフォール、稼働インフラ
```

### 1. ポータル・特集 (PORTAL)
*   **地雷市場（死体） ⇄ 金脈市場（生者）直接対比レーダー**:
    *   ✕ 即死地雷（AI美女直売、店舗せどり、無差別LP制作）
    *   〇 最新金脈（TikTok Shop手元実演、海外OSS代理導入、富裕現場DX送客）
*   **金が唸る業界から個人が中抜き！合法的な受注・下請け逆転手口 TOP 4**:
    *   美容クリニック、地方町工場、不用品回収、補助金申請など、金持ち業界の財布から現金を吸い上げるモデル。

### 2. 💡 実践ビジネスアイデア台帳 (IDEAS_VAULT)
*   「で、結局俺は何をやればいい？」に応える専用ページ。
*   6大分類（富裕業界寄生、最新トレンド、元手ゼロ、スキル不要、完全1人、AI波乗り）で即座に絞り込み可能。
*   「標的」「突く業界のバグ」「仕掛ける現場手順」「収支算盤」「元ネタ企業リンク」を全カードに刻印。

### 3. 分析台帳 DB (TERMINAL)
*   22社の完全監査済みデータ。
*   損益流出ウォーターフォール（100円の売上に対する流出・手残り分解）。
*   稼働インフラ・武器庫（使用ツール一覧、月額コスト合計、代替困難度）。
*   創業者の背景と初動突破口（最初の100人を集めた泥臭いチャネルとDM）。

---

## 📖 重要ドキュメント・マスター白書

本プロジェクトのコア哲学、ユーザー心理分析、先行サービスの裏側、監査済みアイデア調書、およびロードマップは以下の白書にすべて永続記録されています：

*   👉 **[PROJECT_MASTER_HISTORY_AND_STRATEGY.md](./docs/PROJECT_MASTER_HISTORY_AND_STRATEGY.md)**（戦略マスター白書・永続意思決定台帳）
*   👉 **[PROJECT_CHARTER.md](./PROJECT_CHARTER.md)**（プロジェクト基本憲章・データパイプライン）

---

## 🚀 開発環境の起動

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# 本番ビルド検証（TypeScript型チェック含む）
npm run build
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認します。

---

## 🛠 技術スタック

*   **Framework**: Next.js 16 (App Router, Turbopack)
*   **Language**: TypeScript (Strict Mode)
*   **Styling**: Tailwind CSS (金融端末調 Institutional Slate & Dark Navy モノトーン)
*   **Data Models**: `src/types/terminal.ts` / `src/types/idea.ts`
*   **Data Sources**: `src/data/terminalData.ts` / `src/data/ideasData.ts` / `src/data/portalSignals.ts`
*   **Payments**: Stripe API (`/api/checkout`, `/api/webhooks/stripe`)
