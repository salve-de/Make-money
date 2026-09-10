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
  'cloudflare': {
    name: 'Cloudflare Workers / R2',
    url: 'https://www.cloudflare.com/?ref=kin-koroku',
    isAffiliate: true,
    category: 'INFRA',
    description: '帯域課金ゼロ・従量破滅を防ぐ分散エッジサーバーレス基盤',
  },
  'beehiiv': {
    name: 'beehiiv',
    url: 'https://www.beehiiv.com/?via=kinkoroku',
    isAffiliate: true,
    category: 'AUTOMATION',
    description: 'アルゴリズムBANに依存せず、独自メールリストを人質化するメディアSaaS',
  },
  'pinecone': {
    name: 'Pinecone Vector DB',
    url: 'https://www.pinecone.io/?ref=kin-koroku',
    isAffiliate: true,
    category: 'DATABASE',
    description: '単純なAPIラッパーから脱却し、独自知識を資産化するベクトル検索基盤',
  },
  'vercel': {
    name: 'Vercel',
    url: 'https://vercel.com/?ref=kin-koroku',
    isAffiliate: true,
    category: 'INFRA',
    description: '固定サーバー費を抱えず、アクセス急増時のみスケールするフロント基盤',
  },
};

export interface HazardShieldSolution {
  title: string;
  fatalRisk: string;
  shieldApproach: string;
  recommendedTools: {
    name: string;
    affiliateKey: string;
    role: string;
    whyShield: string;
  }[];
}

/**
 * 失敗要因カテゴリに応じた防壁ツール（代替・避難先）ソリューション
 */
export const HAZARD_DEFENSE_SHIELDS: Record<string, HazardShieldSolution> = {
  'API_DEPENDENCY': {
    title: '【即死回避】プラットフォーム依存・APIラッパー自爆の防壁インフラ',
    fatalRisk: '単なる薄いAPIラッパーは、基盤元（OpenAI / Apple等）の公式機能追加や規約改定で一夜にして即死する。',
    shieldApproach: '推論APIへの単なる右から左への受け流しをやめ、独自ベクター検索とローカル/オープンソースLLM配管で「自前データ資産」を人質化せよ。',
    recommendedTools: [
      {
        name: 'Supabase',
        affiliateKey: 'supabase',
        role: '独自データ・pgvector永続ストレージ',
        whyShield: '顧客データと埋め込みベクトルを自前DBに隔離し、外部APIが死んでも事業を継続可能にする。',
      },
      {
        name: 'n8n',
        affiliateKey: 'n8n',
        role: 'セルフホスト型ワークフロー配管',
        whyShield: 'クラウド従量制のAPIコール費用の高騰を防ぎ、自前サーバーで安全に自動化を実行。',
      },
      {
        name: 'Pinecone Vector DB',
        affiliateKey: 'pinecone',
        role: '独自ナレッジの資産・防壁化',
        whyShield: 'APIモデルが変わっても、自社特有の検索インデックスを囲い込んで乗り換えを防ぐ。',
      },
    ],
  },
  'BURN_RATE_COLLAPSE': {
    title: '【出血停止】バブル崩壊・サーバー固定費垂れ流しの防壁インフラ',
    fatalRisk: '高額なサーバー固定費や過剰インフラを抱えると、需要急落時（コロナ特需終了等）に即座にキャッシュが尽きて破滅する。',
    shieldApproach: '固定費ゼロ・アクセス急増時のみ極小従量課金のエッジサーバーレス構成へ全面退避せよ。',
    recommendedTools: [
      {
        name: 'Cloudflare Workers / R2',
        affiliateKey: 'cloudflare',
        role: '下り転送量ゼロ・高耐久エッジ基盤',
        whyShield: 'アクセス爆発時も転送料金破滅（AWS請求ショック）を防ぎ、固定費完全ゼロで運用可能。',
      },
      {
        name: 'Vercel',
        affiliateKey: 'vercel',
        role: 'インフラ保守ゼロの高速デプロイ',
        whyShield: 'インフラエンジニアの固定人件費を削ぎ落とし、最小人数で運用を完結。',
      },
      {
        name: 'Stripe',
        affiliateKey: 'stripe',
        role: '前金回収・年払い一括キャッシュ回収',
        whyShield: '固定費の支払いに先立って年払い一括前払いを回収し、無元手で拡大するキャッシュ防壁。',
      },
    ],
  },
  'ALGORITHM_DEATH': {
    title: '【集客防壁】SNSアルゴリズム急変・BAN対策の独自資産シェルター',
    fatalRisk: 'TwitterやTikTok等の単一プラットフォームに集客を全依存すると、シャドウバンや規約改定で即死する。',
    shieldApproach: 'SNSを「通過点」にし、獲得したリードを100%自前メールリスト・課金顧客として囲い込め。',
    recommendedTools: [
      {
        name: 'beehiiv',
        affiliateKey: 'beehiiv',
        role: 'アルゴリズム不干渉の自前メディア',
        whyShield: '他人のプラットフォームのルール変更を受けず、開封率40%超の顧客台帳を直接保有。',
      },
      {
        name: 'Carrd',
        affiliateKey: 'carrd',
        role: '超高速・即死回避の緊急ランディングページ',
        whyShield: 'アカウント凍結やBANが起きた際も、1時間以内に別ドメインで即時再稼働。',
      },
    ],
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
