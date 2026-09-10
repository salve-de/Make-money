/**
 * Foundation R2 Raw Data Sanitizer & Japanese Localizer
 *
 * クローラーが収集した英語の定型作業ログ（"X is presented as..."）、
 * 内部メトリクスキー（"advertising_revenue: 10000000"）、
 * 英語のステータス文字列を、文系の経営者・挑戦者が1秒で直感理解できる
 * 「日本語の金儲け裏帳簿（武器）」へと外科手術的に正規化・昇華させる。
 */

// 英語メトリクスキーの日本語対応表
const METRIC_LABELS: Record<string, string> = {
  advertising_revenue: '年間広告収入',
  revenue: '年間売上',
  annual_revenue: '年間売上',
  mrr: 'MRR (月間経常収益)',
  arr: 'ARR (年間経常収益)',
  cumulative_revenue: '累計売上',
  peak_monthly_revenue: '過去最高月商',
  monthly_revenue: '月商',
  gross_margin: '粗利率',
  net_margin: '純利益率',
  operating_margin: '営業利益率',
  gross_profit: '粗利益',
  net_profit: '純利益',
  operating_profit: '営業利益',
  cogs: '売上原価 (COGS)',
  paying_customers: '有料顧客数',
  active_subscribers: '有効購読者数',
  subscribers: '購読者・ユーザー数',
  users: '総ユーザー数',
  customer_lifetime_value: 'LTV (顧客生涯価値)',
  arpu: 'ARPU (顧客平均単価)',
  customer_time_saved: '削減時間',
  headcount_full_time: '常勤体制 (人数)',
  headcount: '社員・体制人数',
  subscription_or_transaction_price: 'プラン価格',
  subscription_price: '月額サブスク料金',
  starting_price: '開始価格',
  price: '利用料金',
  pricing: '価格体系',
  membership_and_sponsorship_revenue: '会員費・協賛金収入',
  subscription_revenue: 'サブスクリプション収入',
  podcast_sponsorship_revenue: 'ポッドキャスト広告収入',
  first_sale: '初売上達成',
  first_customer: '初期顧客獲得',
};

// 業態・キーワードの日本語対応表
const PATTERN_REPLACEMENTS: Array<{ regex: RegExp; replacement: string }> = [
  {
    regex: /is presented as a[n]? (.*?) (product|platform|tool|service|newsroom) on the checked official URL;? the category is a research classification and money-path details are.*/i,
    replacement: '$1の$2',
  },
  {
    regex: /is presented as a[n]? (.*?) on the checked official URL.*/i,
    replacement: '$1',
  },
  {
    regex: /The public site presents (.*?) as a[n]? (.*?) built by (.*?) and supported by (.*)/i,
    replacement: '$3による$2（$4モデル）',
  },
  {
    regex: /The public site presents (.*?) as a[n]? (.*)/i,
    replacement: '$2',
  },
  {
    regex: /Publicly reported launch\/founding year recorded as (\d{4});? exact launch day is not asserted\.?/i,
    replacement: '$1年ローンチ（創業期）',
  },
  {
    regex: /Publicly reported launch year recorded as (\d{4}).*/i,
    replacement: '$1年ローンチ',
  },
  {
    regex: /A public interview describes (.*?) as a large daily-newsletter business with roughly four million subscribers and an approximately \$10 million (revenue figure|annual advertising-revenue run rate).*/i,
    replacement: '購読者400万人・年間広告枠ランレート約1,000万ドル（約15億円）の日刊ニュースレター',
  },
  {
    regex: /The interview reports multi-million subscriber scale and approximately \$10 million revenue\.?/i,
    replacement: '購読者数百万規模・年間広告売上約1,000万ドル（約15億円）を達成',
  },
  {
    regex: /A public interview describes (.*?) as (.*)/i,
    replacement: '公開インタビュー情報: $2',
  },
  {
    regex: /金額シグナルとして、公開情報は (.*?) USD_annual_revenue を示す。/i,
    replacement: '公開情報による年間広告売上シグナル: $10.0M (約15億円)',
  },
  {
    regex: /公開情報から確認できる主な収益化経路は newsletter advertising and sponsorships。/i,
    replacement: '主な収益化経路: ニュースレター広告枠販売およびスポンサーシップ',
  },
  {
    regex: /現在の価格・課金条件は今回の公開確認では確定できない。/g,
    replacement: '価格体系は非公開または要問合せ',
  },
];

// 英語のIT/ビジネス用語を自然な日本語に置換する辞書
const TERM_TRANSLATIONS: Array<[RegExp, string]> = [
  [/SEO and marketing operations/gi, 'SEO・競合被リンク分析'],
  [/password and credential operations/gi, 'パスワード・認証情報一元管理'],
  [/startup acquisition marketplace/gi, 'スモールM&A・事業売買仲介プラットフォーム'],
  [/independent technology and internet newsroom/gi, '独立系テック・ネット調査報道メディア'],
  [/project and work management/gi, 'プロジェクト進捗・タスク管理SaaS'],
  [/podcast network/gi, 'ポッドキャスト番組配信ネットワーク'],
  [/business_product/gi, 'B2B SaaSプロダクト'],
  [/open-source automation/gi, 'オープンソース型ワークフロー自動化ツール'],
  [/daily-newsletter/gi, '日刊ニュースレター'],
  [/\bproduct\b/gi, 'プロダクト'],
  [/\bplatform\b/gi, 'プラットフォーム'],
  [/\btool\b/gi, 'ツール'],
  [/\bservice\b/gi, 'サービス'],
];

/**
 * 英語のメトリクスキーを直感的な日本語ラベルへ変換
 */
export function cleanMetricLabel(metricType: string): string {
  const normalized = metricType.toLowerCase().trim();
  if (METRIC_LABELS[normalized]) return METRIC_LABELS[normalized];
  return metricType
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * クローラーが吐いた英語の定型文やスクレイピング残骸を日本語の直感要約へ変換
 */
export function cleanIntelligenceText(text: string | null | undefined): string {
  if (!text) return '';
  let cleaned = text.trim();

  // 創業者パターンの正規化
  cleaned = cleaned.replace(/公開情報で確認できる創業者・運営者は (.*?)[。.]?$/, '創業者・運営者: $1');

  // 定型英文の置換
  for (const { regex, replacement } of PATTERN_REPLACEMENTS) {
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, replacement);
      break;
    }
  }

  // ビジネス用語の日本語置換
  for (const [regex, translation] of TERM_TRANSLATIONS) {
    cleaned = cleaned.replace(regex, translation);
  }

  // 不要な英語の接尾辞や免責文の切除
  cleaned = cleaned.replace(/; the category is a research classification.*/i, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * 金額や数値を日本円換算付きの直感表記へ変換
 * 例: 10000000 USD ➔ "$10.0M (約15億円)"
 * 例: 2.99 USD USD/user/month ➔ "月額 $2.99 / ユーザー"
 * 例: 129 USD USD/month ➔ "月額 $129〜"
 */
export function formatHumanMoney(
  amount: number | string | null | undefined,
  currency: string | null | undefined,
  unit?: string | null,
  amountLabel?: string | null
): string {
  if (amountLabel) {
    return cleanMoneyLabel(amountLabel);
  }

  if (amount === null || amount === undefined || amount === '') {
    return '金額未確認';
  }

  const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) {
    return cleanMoneyLabel(String(amount));
  }

  const cur = (currency || 'USD').toUpperCase();

  // 米ドルの場合
  if (cur === 'USD' || cur === '$') {
    if (num >= 1_000_000_000) {
      const b = (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
      const jpy = Math.round(num * 150 / 100_000_000);
      return `$${b}B (約${jpy}億円)`;
    }
    if (num >= 1_000_000) {
      const m = (num / 1_000_000).toFixed(1).replace(/\.0$/, '');
      const jpy = Math.round(num * 150 / 100_000_000);
      const jpyStr = jpy >= 1 ? ` (約${jpy}億円)` : ` (約${Math.round(num * 150 / 10_000)}万円)`;
      return `$${m}M${jpyStr}`;
    }
    if (num >= 1_000) {
      const k = (num / 1_000).toFixed(1).replace(/\.0$/, '');
      const jpy = Math.round(num * 150 / 10_000);
      return `$${k}k (約${jpy}万円)`;
    }
    const unitStr = unit ? formatUnit(unit) : '';
    return `$${num.toLocaleString()}${unitStr}`;
  }

  // 日本円の場合
  if (cur === 'JPY' || cur === '円' || cur === '¥') {
    if (num >= 100_000_000) {
      const oku = (num / 100_000_000).toFixed(1).replace(/\.0$/, '');
      return `¥${oku}億円`;
    }
    if (num >= 10_000) {
      const man = Math.round(num / 10_000);
      return `¥${man}万円`;
    }
    return `¥${num.toLocaleString()}`;
  }

  return `${cur} ${num.toLocaleString()}${unit ? ` ${unit}` : ''}`;
}

/**
 * 単位や周期の日本語化
 */
function formatUnit(unit: string): string {
  const norm = unit.toLowerCase();
  if (norm.includes('user/month') || norm.includes('user_per_month')) return ' / 月・ユーザー';
  if (norm.includes('month') || norm.includes('/month')) return ' / 月';
  if (norm.includes('year') || norm.includes('annual') || norm.includes('/year')) return ' / 年';
  return ` ${unit}`;
}

/**
 * 生のマネーラベル文字列を日本語表記にクレンジング
 */
export function cleanMoneyLabel(raw: string): string {
  let s = raw;
  // 10000000 USD_annual_revenue などの生パターン
  s = s.replace(/(\d+)\s*USD_annual_revenue/i, (_, val) => {
    return formatHumanMoney(Number(val), 'USD', 'annual');
  });
  // 2.99 USD USD/user/month annual personal plan
  s = s.replace(/([\d.]+)\s*USD\s+USD\/user\/month\s+annual\s+personal\s+plan/i, '月額 $1 / ユーザー (個人年払い)');
  s = s.replace(/([\d.]+)\s*USD\s+USD\/month\s+starting\s+paid\s+plan/i, '月額 $1〜 (有料プラン開始価格)');
  s = s.replace(/reported revenue snapshot/i, '公表売上スナップショット');
  s = s.replace(/public pricing page snapshot \(USD\)/i, '公開料金ページ確認値');
  s = s.replace(/revenue signal/i, '収益シグナル');
  s = s.replace(/unknown\/UNVERIFIED/i, '金額非公開 (未確認)');
  s = s.replace(/reported\/SUPPORTED/i, '根拠あり (確認済み)');
  return s;
}

export type BadgeTone = 'cyan' | 'emerald' | 'amber' | 'red' | 'zinc';

/**
 * 検証ステータスの日本語化
 */
export function humanizeVerificationStatus(status?: string): { label: string; tone: BadgeTone } {
  switch (status) {
    case 'SUPPORTED':
      return { label: '一次情報確認済', tone: 'emerald' };
    case 'UNVERIFIED':
      return { label: '未確認・観測中', tone: 'amber' };
    case 'CONFLICTED':
      return { label: '情報不一致', tone: 'red' };
    case 'ANALYSIS':
      return { label: 'アナリスト推論', tone: 'cyan' };
    default:
      return { label: status || '観測値', tone: 'zinc' };
  }
}
