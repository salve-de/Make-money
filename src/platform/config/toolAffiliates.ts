/**
 * ツール・SaaSアフィリエイト設定（公式・提携リンクマスター）
 * 各ツールのURL、公式ドメイン、カテゴリを集中管理
 */

export interface ToolAffiliateMeta {
  name: string;
  url: string;
  isAffiliate: boolean;
  category: 'AI_MODEL' | 'AUTOMATION' | 'NO_CODE' | 'DATABASE' | 'PAYMENT' | 'INFRA';
  description?: string;
}

export const TOOL_AFFILIATES: Record<string, ToolAffiliateMeta> = {
  'replicate': {
    name: 'Replicate API',
    url: 'https://replicate.com/?ref=kin-koroku',
    isAffiliate: true,
    category: 'AI_MODEL',
    description: 'Flux.1等の画像推論APIを1枚0.3円で従量課金実行',
  },
  'flux': {
    name: 'Flux.1',
    url: 'https://replicate.com/black-forest-labs/flux-schnell?ref=kin-koroku',
    isAffiliate: true,
    category: 'AI_MODEL',
    description: '最新鋭の超高速・高精度画像生成AIモデル',
  },
  'make': {
    name: 'Make.com',
    url: 'https://www.make.com/en/register?pc=kinkoroku',
    isAffiliate: true,
    category: 'AUTOMATION',
    description: 'プログラミング不要の直感的ビジュアル自動化配管SaaS',
  },
  'n8n': {
    name: 'n8n',
    url: 'https://n8n.io/?ref=kin-koroku',
    isAffiliate: true,
    category: 'AUTOMATION',
    description: 'セルフホスト可能なオープンソースのワークフロー自動化ツール',
  },
  'dify': {
    name: 'Dify.ai',
    url: 'https://dify.ai/?ref=kin-koroku',
    isAffiliate: true,
    category: 'AUTOMATION',
    description: 'LLMアプリケーション開発をノーコードで加速するAIワークフロー',
  },
  'cursor': {
    name: 'Cursor',
    url: 'https://www.cursor.com/?ref=kin-koroku',
    isAffiliate: false,
    category: 'AUTOMATION',
    description: 'バイブコーディングを加速するAIコードエディタ',
  },
  'supabase': {
    name: 'Supabase',
    url: 'https://supabase.com/?ref=kin-koroku',
    isAffiliate: true,
    category: 'DATABASE',
    description: 'PostgreSQLベースのサーバーレスデータベース・認証インフラ',
  },
  'carrd': {
    name: 'Carrd',
    url: 'https://try.carrd.co/kinkoroku',
    isAffiliate: true,
    category: 'NO_CODE',
    description: '今日中に高CVRな決済付きLPを立ち上げる超軽量ノーコード',
  },
  'studio': {
    name: 'STUDIO',
    url: 'https://studio.design/ja?ref=kin-koroku',
    isAffiliate: true,
    category: 'NO_CODE',
    description: 'コード不要で国産プロ水準のWebサイトを即日公開できるノーコード',
  },
  'stripe': {
    name: 'Stripe',
    url: 'https://stripe.com/jp?ref=kin-koroku',
    isAffiliate: false,
    category: 'PAYMENT',
    description: 'グローバル標準のオンライン決済・サブスクリプション課金インフラ',
  },
  'line': {
    name: 'LINE Messaging API / LIFF',
    url: 'https://developers.line.biz/ja/services/messaging-api/?ref=kin-koroku',
    isAffiliate: false,
    category: 'AUTOMATION',
    description: '国内9,600万人が日常利用するスマホ直結UIインフラ',
  },
  'aws': {
    name: 'AWS (S3 / Lightsail)',
    url: 'https://aws.amazon.com/jp/?ref=kin-koroku',
    isAffiliate: false,
    category: 'INFRA',
    description: '月数百円からスケール可能な世界標準のクラウドインフラ',
  },
  'revenuecat': {
    name: 'RevenueCat',
    url: 'https://www.revenuecat.com/?ref=kin-koroku',
    isAffiliate: true,
    category: 'PAYMENT',
    description: 'モバイルアプリのApp Store / Google Play課金管理SDK',
  },
};

/**
 * ツール名文字列から該当するアフィリエイトメタデータを検索
 */
export function findToolAffiliate(toolName: string): ToolAffiliateMeta | null {
  const lower = toolName.toLowerCase();
  for (const [key, meta] of Object.entries(TOOL_AFFILIATES)) {
    if (lower.includes(key) || lower.includes(meta.name.toLowerCase())) {
      return meta;
    }
  }
  return null;
}
