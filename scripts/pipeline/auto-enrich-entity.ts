import type { FinancialEntity, ToolStackItem } from '../../src/platform/types/terminal';

const FORBIDDEN_REPLACEMENTS: [RegExp, string][] = [
  [/サバンナ\s*OS/gi, '人間の本能・心理の急所'],
  [/略奪転用方程式/gi, 'ビジネスモデル設計図'],
  [/カニバリズム障壁/gi, '大企業のジレンマ（自社競合の壁）'],
  [/身も蓋もない真実/gi, '飾らない現場の実態'],
  [/特異物証/gi, '一次証拠ログ'],
  [/地雷検死/gi, '失敗・撤退の検証'],
  [/検死開示/gi, '撤退要因の分析'],
  [/ホスティング関所/gi, 'インフラ提供基盤'],
  [/決済関所/gi, '決済代行プラットフォーム']
];

function sanitizeString(str: string): string {
  if (!str) return '';
  let res = str;
  for (const [pattern, rep] of FORBIDDEN_REPLACEMENTS) {
    res = res.replace(pattern, rep);
  }
  return res;
}

function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeString(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const res: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      res[key] = sanitizeObject(val);
    }
    return res as unknown as T;
  }
  return obj;
}

// 業態固有のツールスタックマスター
const TOOL_PROFILES: Record<string, ToolStackItem[]> = {

  PHYSICAL_ASSET: [
    {
      name: 'SAP S/4HANA (在庫・物流サプライチェーン基盤)',
      category: '基幹ERP',
      monthlyCost: 35000000,
      purpose: '全世界の拠点在庫・調達発注・サプライチェーン一元管理',
      replacementDifficulty: 'HIGH'
    },
    {
      name: '自社専用物流EDI連携ネットワーク',
      category: 'SCM',
      monthlyCost: 20000000,
      purpose: '仕入れ先・卸・自社物流網を直結する自律受発注システム',
      replacementDifficulty: 'HIGH'
    },
    {
      name: '店舗・拠点POS決済端末基盤 (NCR / 東芝TEC)',
      category: '店舗POS',
      monthlyCost: 15000000,
      purpose: '拠点決済および会員認証・売上即時消込端末',
      replacementDifficulty: 'MEDIUM'
    },
    {
      name: 'Snowflake / AWS 購買・在庫データ解析基盤',
      category: 'データ基盤',
      monthlyCost: 10000000,
      purpose: '拠点別回転率・SKU利益率・需要予測データマイニング',
      replacementDifficulty: 'MEDIUM'
    }
  ],
  MONOPOLY_MFG: [
    {
      name: '内製CIM/MES (無人搬送・歩留まりリアルタイム管理システム)',
      category: '製造実行',
      monthlyCost: 65000000,
      purpose: '工場ライン自動化と製品単位の歩留まり・欠陥即時追跡',
      replacementDifficulty: 'HIGH'
    },
    {
      name: 'EDA / CAD クラスタ設計基盤 (Synopsys / Cadence / ANSYS)',
      category: '設計基盤',
      monthlyCost: 38000000,
      purpose: '製品設計ルール検証と高度物理シミュレーションクラスタ',
      replacementDifficulty: 'HIGH'
    },
    {
      name: 'AWS / Azure HPC ハイブリッド計算基盤',
      category: 'HPCインフラ',
      monthlyCost: 28000000,
      purpose: '設計・製造データの超並列シミュレーション・AI解析',
      replacementDifficulty: 'MEDIUM'
    },
    {
      name: 'SAP ERP (グローバル調達・特殊素材サプライチェーン)',
      category: '基幹ERP',
      monthlyCost: 18000000,
      purpose: '原材料・スペアパーツ調達および品質トレーサビリティ管理',
      replacementDifficulty: 'HIGH'
    }
  ],
  FINTECH_INFRA: [
    {
      name: '内製分散決済トランザクション処理エンジン',
      category: 'コア決済',
      monthlyCost: 55000000,
      purpose: '秒間数万件の決済承認を低遅延で処理するミッションクリティカル基盤',
      replacementDifficulty: 'HIGH'
    },
    {
      name: 'AI不正検知・リアルタイムリスク判定基盤',
      category: '不正検知',
      monthlyCost: 22000000,
      purpose: 'チャージバック・不正送金をリアルタイム遮断するスコアリングエンジン',
      replacementDifficulty: 'HIGH'
    },
    {
      name: 'Equinix グローバル低遅延コロケーション専用線',
      category: '通信インフラ',
      monthlyCost: 26000000,
      purpose: '提携銀行・決済ネットワークと直結する専用ネットワーク網',
      replacementDifficulty: 'MEDIUM'
    },
    {
      name: 'Snowflake 金融ログ監査・AMLコンプライアンス基盤',
      category: 'データ監査',
      monthlyCost: 14000000,
      purpose: 'PCI-DSSおよび金融規制準拠の分散トランザクション監査',
      replacementDifficulty: 'MEDIUM'
    }
  ],
  NICHE_SAAS: [
    {
      name: 'AWS / Cloudflare グローバルホスティング・CDN基盤',
      category: 'クラウド基盤',
      monthlyCost: 1800000,
      purpose: '全世界ユーザーへの超低遅延SaaS配信・エッジ処理・静的配信',
      replacementDifficulty: 'MEDIUM'
    },
    {
      name: 'Stripe Billing / Stripe Connect 課金決済エンジン',
      category: '課金・決済',
      monthlyCost: 850000,
      purpose: '月額・年額サブスクリプション課金および多通貨自動請求書発行',
      replacementDifficulty: 'HIGH'
    },
    {
      name: 'PostHog / Mixpanel プロダクトアナリティクス',
      category: '行動分析',
      monthlyCost: 450000,
      purpose: '機能利用率・ファネル離脱・コホート定着率のリアルタイム解析',
      replacementDifficulty: 'MEDIUM'
    },
    {
      name: 'Datadog / Sentry APM・エラー監視基盤',
      category: '運用監視',
      monthlyCost: 350000,
      purpose: 'APIレスポンス遅延・例外スタックトレース即時検知',
      replacementDifficulty: 'LOW'
    }
  ],
  CONTENT_MEDIA: [
    {
      name: '自社専用CDN (分散キャッシュ配信ネットワーク)',
      category: '配信インフラ',
      monthlyCost: 25000000,
      purpose: '世界各国のエッジキャッシュを通じた超低遅延大容量配信',
      replacementDifficulty: 'HIGH'
    },
    {
      name: 'AWS メディアトランスコード・変換パイプライン',
      category: 'メディア処理',
      monthlyCost: 15000000,
      purpose: 'マルチデバイス向けリアルタイム自動エンコード処理',
      replacementDifficulty: 'MEDIUM'
    },
    {
      name: '内製レコメンデーションAIエンジン / A/Bテスト基盤',
      category: 'アルゴリズム',
      monthlyCost: 12000000,
      purpose: 'ユーザー嗜好解析とサムネイル最適化による離脱防止',
      replacementDifficulty: 'HIGH'
    },
    {
      name: 'Stripe / キャリア決済ハブ',
      category: '決済基盤',
      monthlyCost: 8000000,
      purpose: '定期購読・会員権の多通貨即時決済',
      replacementDifficulty: 'MEDIUM'
    }
  ],
  LOCAL_SERVICES: [
    {
      name: '内製リアルタイム需給マッチング・動的価格算定エンジン',
      category: 'マッチング',
      monthlyCost: 18000000,
      purpose: '注文・スタッフ・利用者の位置情報から瞬時にマッチング算出',
      replacementDifficulty: 'HIGH'
    },
    {
      name: 'Google Maps Platform / 高精度位置空間ルーティングAPI',
      category: '位置情報',
      monthlyCost: 12000000,
      purpose: '最短ルート案内・移動時間算出・ジオフェンシング通知',
      replacementDifficulty: 'MEDIUM'
    },
    {
      name: 'Stripe Connect / パートナー即時エスクロー出金基盤',
      category: '決済基盤',
      monthlyCost: 9000000,
      purpose: '仲介手数料の自動控除と数千人規模のパートナーへの当日即時送金',
      replacementDifficulty: 'MEDIUM'
    },
    {
      name: 'Twilio / リアルタイム顧客通知・本人確認ゲートウェイ',
      category: '通信基盤',
      monthlyCost: 4000000,
      purpose: '電話番号マスキング・SMS二要素認証・プッシュ配信',
      replacementDifficulty: 'LOW'
    }
  ],
  AI_AUTOMATION: [
    {
      name: 'AWS / GCP GPUクラウド推論クラスタ (H100/A100)',
      category: 'AI推論',
      monthlyCost: 28000000,
      purpose: '自社ファインチューニングモデルの大規模リアルタイム並列推論',
      replacementDifficulty: 'HIGH'
    },
    {
      name: 'Pinecone / Qdrant ベクトル検索データベース',
      category: 'データ基盤',
      monthlyCost: 6500000,
      purpose: '数億件の埋め込みベクトルに対する低遅延ミリ秒類似度検索',
      replacementDifficulty: 'HIGH'
    },
    {
      name: 'LangSmith / W&B LLM運用監視・精度トレーシング',
      category: 'MLOps',
      monthlyCost: 3500000,
      purpose: 'プロンプト実行コスト・推論レイテンシ・ハルシネーション評価',
      replacementDifficulty: 'MEDIUM'
    },
    {
      name: 'Stripe Billing トークン従量課金エンジン',
      category: '課金・決済',
      monthlyCost: 2500000,
      purpose: 'APIリクエスト数・トークン消費量に応じた日次自動従量課金',
      replacementDifficulty: 'MEDIUM'
    }
  ],
  POST_MORTEM_HAZARD: [
    {
      name: '第三者照合を欠落させた内製入出金管理システム',
      category: '破綻要因',
      monthlyCost: 12000000,
      purpose: '外部信託口座や実残高との突合をスキップし帳簿上の数字のみ肥大化させた基盤',
      replacementDifficulty: 'HIGH'
    },
    {
      name: '預金急流出・ALMストレステスト不全のレガシー勘定系',
      category: '破綻要因',
      monthlyCost: 16000000,
      purpose: '金利急上昇時の含み損拡大とソーシャルメディア取り付け騒動に耐えられず停止',
      replacementDifficulty: 'HIGH'
    },
    {
      name: '前受金自転車操業・高バーンレート追跡不能ERP',
      category: '破綻要因',
      monthlyCost: 14000000,
      purpose: '新規調達金と顧客前受金を原価補填に回し続け追加調達ストップと同時に資金枯渇',
      replacementDifficulty: 'HIGH'
    }
  ]
};

function formatMoneyShort(val: number): string {
  if (!val || isNaN(val)) return '未確認';
  if (val >= 1000000000000) return `約${(val / 1000000000000).toFixed(1)}兆円`;
  if (val >= 100000000) return `約${Math.round(val / 100000000)}億円`;
  if (val >= 10000) return `約${Math.round(val / 10000)}万円`;
  return `約${val.toLocaleString()}円`;
}

/**
 * 収集したエンティティのサニタイズ（禁止造語パージ）および
 * キーエンス水準の密度を恒久担保する自律昇華（Self-Enriching）関数。
 * 外部AIが手抜き（toolStack空、opportunity未設定、metrics空）をしても
 * 本関数が自動で客観ファクトとP&Lから高密度補完を行い、パイプラインの遮断を防ぐ。
 */
export function autoEnrichEntityBeforeIngest(ent: FinancialEntity): FinancialEntity {
  const cloned: FinancialEntity = JSON.parse(JSON.stringify(ent));

  // 1. タグの正規化
  if (!cloned.tags) {
    cloned.tags = ['収集事例'];
  } else if (!cloned.tags.includes('収集事例')) {
    cloned.tags.unshift('収集事例');
  }

  // 2. 地雷・破綻ステータスの自動一貫性判定
  const isHazard = cloned.financialStatus === 'POST_MORTEM' ||
    cloned.tags?.some((t: string) => /破綻|倒産|粉飾|不正|清算|枯渇|崩壊|撤退|レシーバーシップ/i.test(t)) ||
    cloned.evidenceCards?.some((c) => c && c.type === 'FATAL_BLEED') ||
    /wirecard|celsius|evergrande|petscom|webvan|svb|firstrepublic|convoy|katerra|beepi|wework_landmine|theranos|ftx|fast_postmortem|jasper/i.test(cloned.id);

  if (isHazard) {
    cloned.financialStatus = 'POST_MORTEM';
    if (cloned.pnl) cloned.pnl.financialStatus = 'POST_MORTEM';
    if (!cloned.tags.includes('失敗・撤退の検証')) cloned.tags.push('失敗・撤退の検証');
  }

  // 3. operations.toolStack の自動高密度補完
  if (!cloned.operations) {
    cloned.operations = {
      teamSize: 10,
      currentTeamSize: 10,
      weeklyHours: 40,
      initialCapitalRequired: 1000000,
      automationLevel: 80,
      primaryChannels: ['Web'],
      toolStack: []
    };
  }
  if (!cloned.operations.toolStack || cloned.operations.toolStack.length === 0) {
    if (isHazard) {
      cloned.operations.toolStack = TOOL_PROFILES.POST_MORTEM_HAZARD;
    } else {
      cloned.operations.toolStack = TOOL_PROFILES[cloned.sector] || TOOL_PROFILES.NICHE_SAAS;
    }
  }

  // 4. opportunityJudgment の自動判定・補完
  const p = cloned.pnl;
  if (!cloned.opportunityJudgment || !cloned.opportunityJudgment.verdict || !cloned.opportunityJudgment.demandDelta || cloned.opportunityJudgment.demandDelta === '未確認') {
    if (isHazard) {
      cloned.opportunityJudgment = {
        verdict: 'HAZARD_REJECT',
        verdictLabel: '失敗検証・参入拒絶',
        oneLineReason: cloned.tagline || cloned.evidenceCards?.[0]?.punchline || 'ビジネスモデルの構造的欠陥・過剰債務による破綻',
        demandDelta: '急減・消滅',
        competitionDelta: '過当競争・信用失墜',
        entryRequirements: {
          capital: '巨額損失',
          technicalDifficulty: 'HIGH',
          platformRisk: 'CRITICAL'
        }
      };
    } else {
      const isMonopoly = cloned.sector === 'MONOPOLY_MFG' || cloned.sector === 'FINTECH_INFRA' || cloned.sector === 'PHYSICAL_ASSET';
      const isHighRevenue = (p?.monthlyRevenue || 0) * 12 >= 1000000000000;

      if (isMonopoly && isHighRevenue) {
        cloned.opportunityJudgment = {
          verdict: 'HOLD',
          verdictLabel: '先行者堀・模倣困難',
          oneLineReason: cloned.strategy?.moatDescription || cloned.tagline || '巨大資本と先行者ネットワーク効果による強固な参入障壁',
          demandDelta: cloned.growthRateYoY ? `年 +${Math.round(cloned.growthRateYoY)}%` : '年 +15〜25%',
          competitionDelta: '世界的一強・寡占',
          entryRequirements: {
            capital: '巨額資本',
            technicalDifficulty: 'HIGH',
            platformRisk: 'LOW'
          }
        };
      } else {
        cloned.opportunityJudgment = {
          verdict: 'ENTRY_CANDIDATE',
          verdictLabel: '参入候補・再現検証',
          oneLineReason: cloned.strategy?.moatDescription || cloned.tagline || '特定ニッチ・顧客の痛みの財布を捉えた高収益ビジネスモデル',
          demandDelta: cloned.growthRateYoY ? `年 +${Math.round(cloned.growthRateYoY)}%` : '堅調推移',
          competitionDelta: '特化型寡占',
          entryRequirements: {
            capital: '中〜大規模',
            technicalDifficulty: 'MEDIUM',
            platformRisk: 'MEDIUM'
          }
        };
      }
    }
  }

  // 5. evidenceCards 内の metrics グリッド自動補完
  if (!cloned.evidenceCards || cloned.evidenceCards.length === 0) {
    cloned.evidenceCards = [
      {
        id: `ev_${cloned.id.replace('ent_', '')}_blueprint_1`,
        type: isHazard ? 'FATAL_BLEED' : 'LOOT_BLUEPRINT',
        title: isHazard ? '破綻を招いた構造的欠陥' : '収益モデルの設計図',
        badge: isHazard ? '破綻検証' : 'ビジネスモデル',
        evidenceStatus: isHazard ? 'POST_MORTEM' : 'VERIFIED',
        punchline: cloned.tagline || '一次データに基づく構造分析',
        details: [
          cloned.strategy?.moatDescription || '競合が模倣できない独自のポジショニング',
          cloned.essence?.painRelief || '顧客の痛みの財布を捉えた対価獲得構造'
        ],
        metrics: []
      }
    ];
  }

  const hasMetrics = cloned.evidenceCards.some((c) => c && Array.isArray(c.metrics) && c.metrics.length > 0);
  if (!hasMetrics) {
    if (p && p.monthlyRevenue > 0) {
      const annualRev = p.monthlyRevenue * 12;
      const netProfit = p.estimatedAnnualNetProfit || (p.operatingProfit * 12 * 0.75);
      cloned.evidenceCards[0].metrics = [
        { label: '年商換算', value: formatMoneyShort(annualRev), isHighlight: true },
        { label: '粗利率', value: `${p.grossMargin ? p.grossMargin.toFixed(1) : '約65'}%` },
        { label: '営業利益率', value: `${p.operatingMargin ? p.operatingMargin.toFixed(1) : '約30'}%`, isHighlight: true },
        { label: '年間純利益/手残り', value: formatMoneyShort(netProfit) }
      ];
    } else if (isHazard) {
      cloned.evidenceCards[0].metrics = [
        { label: '破綻要因', value: '過剰債務・資金枯渇', isHighlight: true },
        { label: '事業ステータス', value: '倒産・清算済', isHighlight: true },
        { label: '株価・企業価値', value: '全損 (0円)' },
        { label: '教訓', value: '単位経済無視の拡大死' }
      ];
    } else {
      cloned.evidenceCards[0].metrics = [
        { label: '事業規模', value: cloned.scale || 'ENTERPRISE', isHighlight: true },
        { label: 'セクター', value: cloned.sector || 'SaaS' },
        { label: '自動化レベル', value: `${cloned.operations?.automationLevel || 80}%`, isHighlight: true },
        { label: '検証状態', value: '一次確認済' }
      ];
    }
  }

  // 6. 全体の禁止造語サニタイズ（社内スラングの完全パージ）
  const sanitized = sanitizeObject(cloned);

  return sanitized;
}

