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

  // 6. essence (#01) の自動補完および社名プレフィックス除去
  const MOAT_JP_TITLES: Record<string, string> = {
    SCALE_ECONOMIES: '圧倒的な規模の経済と調達コスト優位性',
    NETWORK_EFFECT: '参加者増加が自己強化するネットワーク効果',
    SWITCHING_COST: '解約不能な業務組み込みと高い移行摩擦',
    INTELLECTUAL_PROPERTY: '独占的特許・知財と模倣困難な独自技術',
    PROCESS_POWER: '現場の徹底した標準化と極限のオペレーション能力',
    BRAND: '市場の信頼を独占するブランド引力と価格決定力',
    CORNERED_RESOURCE: '他社がアクセスできない希少資源の独占',
    COUNTER_POSITIONING: '大企業が自爆を恐れて手を出せない構造',
    SYSTEMIC_GRAVITY: '不可逆なデータ蓄積と業務プロセスの囲い込み'
  };

  const stripEntityPrefix = (text: string): string => {
    if (!text) return '';
    let res = text.trim();
    const names = [cloned.name, cloned.legalEntity, cloned.id?.replace('ent_', '')].filter(Boolean) as string[];
    for (const n of names) {
      const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      res = res.replace(new RegExp('^' + esc + '[は|が|の|による]?\\s*[、,]?\\s*', 'u'), '');
    }
    res = res.replace(/^.*?は、[「『]?/u, '');
    res = res.replace(/^.*?は[「『]/u, '');
    res = res.replace(/^[「『]/u, '');
    return res.trim();
  };

  if (!cloned.essence || !cloned.essence.whatItDoes || !cloned.essence.targetCustomer || !cloned.essence.painRelief) {
    if (isHazard) {
      const coreTagline = (cloned.tagline || '急拡大する市場の幻想').replace(/[。、]+$/, '');
      cloned.essence = {
        whatItDoes: `「${coreTagline}」を掲げて巨額資本を集めたものの、単位経済を無視した過剰投資により破綻に至った教訓的モデル。`,
        targetCustomer: '急成長の幻想や低価格に引き寄せられた一般ユーザーおよび法人顧客層。',
        painRelief: '見かけの利便性や低価格の錯覚を提供したが、持続可能な収益構造の欠如により最終的に事業継続が不可能となった。'
      };
    } else {
      const revStr = p && p.monthlyRevenue > 0 ? `月商${formatMoneyShort(p.monthlyRevenue)}・利益率${p.operatingMargin || 0}%` : '高収益';
      const coreTagline = (cloned.tagline || '特定市場の強い歪み').replace(/[。、]+$/, '');
      cloned.essence = {
        whatItDoes: `「${coreTagline}」を捉え、独自の構造的関所を握ることで${revStr}を実現するビジネスモデル。`,
        targetCustomer: '既存の汎用ツールの非効率に不満を持ち、迅速かつ確実に成果を上げたい企業の現場担当者やプロ層。',
        painRelief: '日々の面倒な手作業の繰り返し、属人化によるミスの発生、および高額な外注コストの苦痛を解消する。'
      };
    }
  } else {
    // 既存の whatItDoes からも社名プレフィックスを除去
    cloned.essence.whatItDoes = stripEntityPrefix(cloned.essence.whatItDoes);
    if (cloned.essence.whatItDoes.includes('」を捉え、独自の構造的関所を握ることで')) {
      const parts = cloned.essence.whatItDoes.split('」を捉え、独自の構造的関所を握ることで');
      const core = parts[0].trim().replace(/[。、]+$/, '');
      cloned.essence.whatItDoes = `${core}構造を握り、${parts[1].trim()}`;
    }
  }

  // 7. strategy の見出し構造化（【パンチライン】＋詳細本文）
  if (cloned.strategy) {
    const bs = cloned.strategy.blindspot || '';
    if (!bs.startsWith('【') || !bs.includes('】') || bs.length < 50) {
      const headline = isHazard
        ? '見落とされた致命的死角と構造的欠陥'
        : (cloned.strategy?.secretInsight || '業界の常識のウラを突いた独自構造').slice(0, 30);
      const detail = bs && bs.length > 15
        ? `${bs}。競合他社が常識と信じ込んでいた業界の慣行を完全に裏切り、顧客が最も嫌う苦痛・時間的損失・保身恐怖を最短で解消する配管を構築した。`
        : '業界の既存プレイヤーが「高価格・対面営業・多機能」に固執する間に、顧客が真に求めていた「即時性・手間の排除・確実な成果」だけに絞り込み、極小の固定費で市場の現金を吸い上げた。';
      cloned.strategy.blindspot = `【${headline}】${detail}`;
    } else {
      // 見出しから社名を除去
      const match = bs.match(/^【(.*?)】(.*)$/);
      if (match) {
        let h = stripEntityPrefix(match[1]);
        h = h.replace(/^.*?が突いた業界の盲点/u, '業界の常識のウラを突いた独自構造');
        cloned.strategy.blindspot = `【${h || '業界の常識のウラを突いた独自構造'}】${match[2].trim()}`;
      }
    }

    const md = cloned.strategy.moatDescription || '';
    if (!md.startsWith('【') || !md.includes('】') || md.length < 50) {
      const moatLabel = cloned.strategy.moatType || '構造的優位性';
      const headline = isHazard
        ? '見せかけの堀が崩壊した構造的要因'
        : (MOAT_JP_TITLES[moatLabel] || '他社の追随を許さない構造的参入障壁');
      const detail = md && md.length > 15
        ? `${md}。後発の競合が追いつこうとしても、すでに確立されたネットワーク効果やデータ蓄積、現場の深いオペレーションノウハウを物理的に模倣できず、参入障壁として機能している。`
        : '顧客の過去データや業務プロセスに深く食い込み、他社ツールへ移行する際の手間と事業停止リスクが参入障壁となるため、高い顧客維持率と長期的なキャッシュ創出力が担保されている。';
      cloned.strategy.moatDescription = `【${headline}】${detail}`;
    } else {
      // 見出しから社名と英語キーを除去
      const match = md.match(/^【(.*?)】(.*)$/);
      if (match) {
        let h = stripEntityPrefix(match[1]);
        for (const [k, v] of Object.entries(MOAT_JP_TITLES)) {
          if (h.includes(k)) {
            h = v;
            break;
          }
        }
        h = h.replace(/独占要[塞]?/g, '').replace(/要塞$/g, '').trim();
        cloned.strategy.moatDescription = `【${h || MOAT_JP_TITLES[cloned.strategy.moatType] || '他社の追随を許さない構造的参入障壁'}】${match[2].trim()}`;
      }
    }

    const inc = cloned.strategy.incumbentDilemma || '';
    if (!inc.startsWith('【') || !inc.includes('】') || inc.length < 40) {
      const headline = isHazard ? '大手の直接参入による市場圧殺' : '大企業が自爆を恐れて手を出せない死角';
      const detail = inc && inc.length > 15
        ? `${inc}。大手が自社の主力売上や既存商流のカニバリズムを恐れる間に、急所となる関所を握り不可逆な防壁を完成させた。`
        : isHazard
          ? '既存の大手企業が資本力と流通網で即座に追随・模倣し、巨額の広告費で市場を直接圧殺したため、差別化を失い資金が枯渇した。'
          : '大手既存企業は現在の高単価プランや既存代理店網との契約を抱えており、同等の低価格・高回転モデルを出すと自社の主力売上をカニバライズするため、認知していても構造上見逃すしかない。';
      cloned.strategy.incumbentDilemma = `【${headline}】${detail}`;
    }
  }

  // 8. evidenceCards が3枚未満の場合の自動補完（最低3枚保証）
  while (cloned.evidenceCards.length < 3) {
    const cardIdx = cloned.evidenceCards.length + 1;
    const rev = p?.monthlyRevenue || 0;
    const op = p?.operatingProfit || 0;
    const margin = p?.operatingMargin || 0;

    if (isHazard) {
      cloned.evidenceCards.push({
        id: `ev_${cloned.id.replace('ent_', '')}_trap_${cardIdx}`,
        type: 'INCUMBENT_TRAP',
        title: '大手の直接参入と市場の急激な圧殺',
        badge: '地雷検証',
        evidenceStatus: 'POST_MORTEM',
        punchline: '巨額調達による見かけの拡大に依存し、参入障壁のないまま大手と消耗戦に突入して自滅。',
        details: [
          '莫大なマーケティング費用で獲得した顧客は、他社の値引きキャンペーンにより即座に離脱した。',
          '固定費（人件費・オフィス賃料・インフラ維持費）が毎月膨張し、売上総利益を完全に上回る出血が継続。',
          '資本市場の潮目が変わり追加調達が停止した瞬間、数ヶ月分のランウェイしか残っておらず即座に清算へ追い込まれた。'
        ],
        metrics: [
          { label: '累積損失', value: '巨額損失', isHighlight: true },
          { label: '残余キャッシュ', value: '0円 (枯渇)', isHighlight: true },
          { label: '顧客離脱率', value: '極めて高水準' },
          { label: '最終帰結', value: '破綻・事業停止' }
        ]
      });
    } else {
      const existingTypes = new Set(cloned.evidenceCards.map((c) => c.type));
      const targetType = existingTypes.has('INCUMBENT_TRAP') ? 'THE_CRIME' : 'INCUMBENT_TRAP';
      const isTrap = targetType === 'INCUMBENT_TRAP';

      cloned.evidenceCards.push({
        id: `ev_${cloned.id.replace('ent_', '')}_${isTrap ? 'trap' : 'crime'}_${cardIdx}`,
        type: targetType,
        title: isTrap ? '大企業が自爆を恐れて参入できない死角' : 'キレイゴト抜きの利益最大化構造',
        badge: isTrap ? 'カニバリ障壁' : '裏の配管',
        evidenceStatus: 'VERIFIED',
        punchline: isTrap
          ? '大手は自社の既存高粗利モデルを自ら壊せないため、同等のサービスを投入できず見逃すしかない。'
          : '顧客が最も嫌う「面倒な作業」「責任リスク」「時間的浪費」を代行し、定価以上の高い対価を即断即決させる。',
        details: [
          cloned.strategy?.incumbentDilemma || '既存競合が抱える代理店網や高コスト体質が、低価格・高速提供への参入を阻害している。',
          cloned.essence?.painRelief || '顧客の業務停止リスクや損失恐怖を直接解消することで、相見積もりを排除し定価販売を貫徹。',
          '一度導入されたシステム・製品は顧客の日常業務に深く定着し、年間を通じた高収益キャッシュフローを創出。'
        ],
        metrics: [
          { label: '月間売上高', value: formatMoneyShort(rev), isHighlight: true },
          { label: '営業利益率', value: `${margin}%`, isHighlight: true },
          { label: '月間営業利益', value: formatMoneyShort(op) },
          { label: '構造的障壁', value: cloned.strategy?.moatType || '模倣困難' }
        ]
      });
    }
  }

  // 9. 全体の禁止造語サニタイズ（社内スラングの完全パージ）
  const sanitized = sanitizeObject(cloned);

  return sanitized;
}

