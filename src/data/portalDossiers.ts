import { CompanyRecord } from '../types/terminal';

export interface DossierData {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  leadParagraph: string;
  whyNow: {
    heading: string;
    description: string;
  }[];
  moneyFlow: {
    victimOrBuyer: string;
    bait: string;
    profitTrap: string;
    takeHomeRate: string;
  };
  stepByStepPlaybook: {
    phase: string;
    action: string;
    detail: string;
  }[];
  recommendedTools: {
    name: string;
    role: string;
    cost: string;
  }[];
  relatedCompanyIds: string[];
}

export const DOSSIER_COLLECTIONS: Record<string, DossierData> = {
  'collection-passive': {
    id: 'collection-passive',
    badge: 'RESEARCH 01 / 限界費用ゼロ型ストック収益',
    title: '限界費用ゼロ型デジタルアセット・高純利益ストックモデルの構造分析',
    subtitle: '在庫コストゼロ・人員ゼロ。自走式決済アーキテクチャによる高営業利益率（80%〜95%）のメカニズム',
    leadParagraph: '労働時間の直接投下による対価獲得から脱却し、限界費用ゼロのソフトウェア・デジタル規格データ・入札型掲載枠を構築。恒常的なキャッシュフローを創出している事業体の構造的優位性を分析します。',
    whyNow: [
      {
        heading: '限界費用の極小化（売上高の大部分が直接キャッシュフロー化）',
        description: '物理的在庫や物流拠点を保有せず、ユーザー増加に伴う追加限界費用は微小なクラウドインフラ費に限定。営業利益率80〜95%が標準値となります。',
      },
      {
        heading: 'グローバル自動決済インフラの標準化',
        description: 'Stripe等の決済ゲートウェイ普及により、単一開発者が最小工数でグローバル24時間自動引き落とし（SaaSサブスクリプション・都度購入）を運用可能。',
      },
      {
        heading: '特定バーティカルにおける露出価値の入札型マネタイズ',
        description: 'ツール本体だけでなく、特定領域における露出枠・ランキング枠のオークション化により、追加原価ゼロで高単価な広告・掲載フィーを獲得する構造が成立。',
      },
    ],
    moneyFlow: {
      victimOrBuyer: '業務効率化を希求するフリーランス、認知拡大を図るスタートアップ経営者、実務実務者',
      bait: '高完成度テンプレート、特定業務特化ユーティリティツール、業界ディレクトリ',
      profitTrap: '「上位露出確約オプション」「商用フルライセンス・自動アップデート権」の継続課金',
      takeHomeRate: '実効手残り率 88%〜95%（直接原価は決済手数料3.6%および小規模ホスティング費のみ）',
    },
    stepByStepPlaybook: [
      {
        phase: 'STEP 1: 武器の調達（所要: 1〜3日）',
        action: '売れている既存ツールの「特定ニッチ版」をAIで複製する',
        detail: '誰も使わない汎用ツールではなく「不動産業者専用の見積もり計算機」「デザイナー専用の請求書テンプレ」など、対象を1業種に絞ってv0やCursorで即日構築。',
      },
      {
        phase: 'STEP 2: リード獲得と初期認知（所要: 1週間）',
        action: 'X、ProductHunt、コミュニティで「無料版（フリーミアム）」を公開し認知を拡大',
        detail: 'まずは無料提供を通じてユーザー接点とフィードバックを獲得。初期ユーザーが100名を超えた段階で有料高機能プランへ移行を案内。',
      },
      {
        phase: 'STEP 3: 収益フローの自動化（所要: 継続）',
        action: 'Stripe等の決済インフラを接続し、自律的な課金・アカウント発行体制を確立',
        detail: '問い合わせ対応をFAQおよびAIチャットボットで自動化し、人的運用負荷を最小化。週次の改善とコンテンツ更新のみで安定稼働を維持。',
      },
    ],
    recommendedTools: [
      { name: 'Stripe / Lemon Squeezy', role: 'グローバル自動決済・継続課金', cost: '売上の3.6%〜5%' },
      { name: 'Vercel + Supabase', role: '限界費用ゼロのサーバーインフラ', cost: '月額0円〜20ドル' },
      { name: 'Beehiiv / MailerLite', role: '顧客リストへの自動ステップ配信', cost: '月額0円〜50ドル' },
    ],
    relatedCompanyIds: ['outbid-lol', 'solo-easlo', 'solo-shipfast'],
  },
  'collection-ai': {
    id: 'collection-ai',
    badge: 'RESEARCH 02 / 推論APIラッパー・高付加価値化',
    title: '推論APIラッピング・垂直統合型マイクロSaaSの収益構造',
    subtitle: '大規模エンジニアリング組織を排し、垂直特化型UIとAPI連携で粗利80%を達成するソロプレナーのモデル',
    leadParagraph: '膨大な固定人件費や研究開発投資を抱えることなく、最先端基盤モデルのAPIを特定業界のペインに合わせて包装（パッケージング）。即効性の高いソリューションとして高単価販売するモデルの解剖レポート。',
    whyNow: [
      {
        heading: '推論コストの低下と価格裁定（Arbitrage）余地',
        description: '基盤APIの低価格化に伴い、1リクエストあたりの原価は数円〜数十円に抑制。これを特定成果物としてエンドユーザーに数千円単位で提供する利ざや構造が成立。',
      },
      {
        heading: '特定バーティカル向けUXへの特化と差別化',
        description: '汎用AIを直接操作できない非IT層に対し、1クリックで完了する最適化UI・入力フォームを提供することで、UI自体が価格決定権を獲得。',
      },
      {
        heading: '成果報酬型ディストリビューション網の構築',
        description: '売上の一部を即時還元するアフィリエイト・紹介プログラムを整備することで、自社営業人員ゼロで世界中のレビュアーを営業部隊化。',
      },
    ],
    moneyFlow: {
      victimOrBuyer: 'ビジネス用宣材写真の撮影コストを削減したい企業・プロフェッショナル、商談獲得を急ぐ営業部門',
      bait: '「スタジオ撮影不要・手元スマホ写真から数分で高品質ポートレート生成」等の明確な価値訴求',
      profitTrap: 'パッケージ買い切り（4,900円〜19,800円）または月額クレジット定期契約',
      takeHomeRate: '実効手残り率 75%〜85%（推論API利用料およびインフラ費控除後の創業者純手残り）',
    },
    stepByStepPlaybook: [
      {
        phase: 'PHASE 1: 基盤API選定と特化ワークフロー設計',
        action: 'Replicate等の画像・言語モデルを特定課題に合わせてパイプライン化',
        detail: '自前モデルの学習を行わず、既存モデルの出力をプロンプト最適化と後処理で品質担保。最小構成のWebアプリケーションを構築。',
      },
      {
        phase: 'PHASE 2: ビフォーアフター実証によるオーガニック流入獲得',
        action: '短尺動画プラットフォームおよびSNSでの劇的比較デモの展開',
        detail: '従来の手間・費用と、本ツールによる即時解決の差を視覚的に実証するコンテンツを量産。広告投下ゼロでの初期ユーザー獲得。',
      },
      {
        phase: 'PHASE 3: 即日還元型アフィリエイトネットワークの敷設',
        action: '紹介報酬の即時支払いプログラムを公開し、拡散構造を自動化',
        detail: '同業者の模倣に先んじて業界インフルエンサーや専門メディアに好条件を提示し、検索・SNS上の推薦枠を寡占。',
      },
    ],
    recommendedTools: [
      { name: 'Replicate / Together AI', role: 'オープンソース基盤モデルのサーバーレス推論', cost: '従量課金' },
      { name: 'Cursor / Next.js', role: '高密度・高速Webフロントエンド構築', cost: '月額20ドル' },
      { name: 'Rewardful / Stripe Connect', role: '紹介パートナーへの自動成果送金', cost: '月額29ドル〜' },
    ],
    relatedCompanyIds: ['solo-headshotpro', 'solo-photoai', 'solo-clay-aaa'],
  },
  'collection-local': {
    id: 'collection-local',
    badge: 'RESEARCH 03 / レガシー現場DX・送客マージン',
    title: '非IT型ローカル産業のデジタル近代化・構造的余剰利益の獲得モデル',
    subtitle: '大手資本の参入障壁が存在する地域密着・現場産業。LINE自動化と職人ネットワークによる高収益オペレーション',
    leadParagraph: '過当競争のWeb受託や汎用SaaS市場を離れ、地元のレガシー産業（無人貸倉庫、特殊清掃、外壁洗浄）において、スマート解錠やLINE自動見積もりを導入することで圧倒的な地域シェアを確保する実業モデルを解明します。',
    whyNow: [
      {
        heading: '既存プレイヤーのデジタル対応停滞による機会',
        description: '地域密着の老舗事業者はWeb導線や即時見積もりの対応が遅延。モバイル最適化と自動見積もり導線を整備するだけで顧客接点を独占可能。',
      },
      {
        heading: '上場企業にとって参入非効率な市場規模',
        description: '商圏人口10万人〜30万人規模のニッチ市場は大手資本にとって採算が合わず、少数精鋭チームによる独占的マージンが長期維持される。',
      },
      {
        heading: '実務作業の完全パートナー委託構造',
        description: '物理的な施工・運搬作業は地域の提携職人へ成果配分で発注。自らは集客インフラと契約管理に特化し、資本効率を極大化。',
      },
    ],
    moneyFlow: {
      victimOrBuyer: '収納スペース不足に悩む地域住民、緊急の清掃・修繕を要する住宅・店舗オーナー',
      bait: '「初期費用透明化・スマホ写真による即時自動見積もり完了」のフリクションレス体験',
      profitTrap: '月額定額保管料（口座引き落とし）または高粗利施工案件の送客仲介フィー',
      takeHomeRate: '実効手残り率 40%〜65%（外注職人費控除後も高水準なキャッシュフローが残存）',
    },
    stepByStepPlaybook: [
      {
        phase: 'STEP 1: 地方の休眠不動産・老朽化物件の確保（所要: 1ヶ月）',
        action: '使われていない空きガレージや古い倉庫を格安（月3万〜5万）で借りる',
        detail: 'オーナーに「固定資産税の足しにしませんか」と直談判。敷金・礼金を値切り、スマート南京錠や電子キーを取り付けて区画を分ける。',
      },
      {
        phase: 'STEP 2: Googleマップ（MEO）とポスティングの集中投下（所要: 2週間）',
        action: '「地域名 + トランクルーム / 不用品回収」で検索1位を獲る',
        detail: 'Googleビジネスプロフィールを徹底的に最適化し、半径3km圏内に「即日預け入れ可能」のチラシを撒く。',
      },
      {
        phase: 'STEP 3: LINE自動受付と無人決済の構築（所要: 即日）',
        action: 'Lステップ等のツールで契約から暗証番号発行まで全自動化',
        detail: '鍵の受け渡しはスマートロックのワンタイム暗証番号を自動送信。現地対応を一切行わず、毎月銀行口座に家賃が振り込まれる仕組みを完成させる。',
      },
    ],
    recommendedTools: [
      { name: 'SwitchBot / Akerun', role: '遠隔解錠・スマートロック管理', cost: '端末代数千円〜月額数千円' },
      { name: 'Lステップ (LINE公式自動化)', role: '自動見積もり・契約締結・暗証番号発行', cost: '月額2,980円〜' },
      { name: 'MEOアナライザー / Googleマップ', role: '地域検索での上位表示と口コミ収集', cost: '月額0円' },
    ],
    relatedCompanyIds: ['niche-bolt-storage', 'local-clean-dx', 'solo-notion-freelance'],
  },
};
