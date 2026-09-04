# 金鉱録 (KIN-ROKOKU / Universal Business Foundation)

> **「世界中の『生々しい金儲けの事実と手口』を証拠付きで吸い上げて蓄積し、読者には『事業のカンニングペーパー』として熱狂させ、自身は『マネーの関所』として莫大な富を抜く。」**

資本主義の裏帳簿（誰が・誰から・どうやって金を抜いたか）の独占的アーカイブと、将来のあらゆる事業（Idea Spark / GOLDMINE / M&A仲介等）で半永久的に使い回すUniversal Data Foundationのフロントエンド兼データレポジトリです。

---

## 📖 プロジェクトの憲章・本質・設計思想

本プロジェクトの目的、4大本質、データ収集パイプライン、マネタイズ設計、およびロードマップについては、以下の憲章ドキュメントを必ず参照してください。

👉 **[PROJECT_CHARTER.md](./PROJECT_CHARTER.md)**（プロジェクト基本憲章・ロードマップ）

---

## 🚀 開発環境の起動

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# 本番ビルド検証
npm run build
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認します。

---

## 🏛 システムアーキテクチャの概要

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS (金融端末調 Institutional Slate & Dark Navy モノトーン)
- **Data Model**: `src/types/terminal.ts` / `src/data/terminalData.ts`
- **Payments**: Stripe API (`/api/checkout`, `/api/webhooks/stripe`)
- **Master Data**: Universal Data Foundation JSON スキーマ
