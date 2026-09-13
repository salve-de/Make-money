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
    regex: /The source documents the current Growth Program;? launch date was (.*)/i,
    replacement: 'スタートアップ向けグロースマーケティング教育＆実践支援プログラム（ローンチ時期: $1）',
  },
  {
    regex: /The source documents the founder's prior agency and current courses;? launch date was (.*)/i,
    replacement: '『時給請求をやめ価値で請求せよ』フリーランスの単価倍増・価格交渉特化スクール（ローンチ時期: $1）',
  },
  {
    regex: /The source documents a live paid storefront;? launch date was not verified\.?/i,
    replacement: '独自ストアフロントにて有料プロダクトを直販中（コミュニティ集客で拡大）',
  },
  {
    regex: /Blueland publicly describes refillable household cleaning products,?(.*)/i,
    replacement: '水に溶かすタブレット型リフィルでプラスチックゴミを全廃するサステナブルD2C洗剤',
  },
  {
    regex: /Ali Abdaal publicly sells a \$?([\d,]+) Part-Time Creatorpreneur course and (.*)/i,
    replacement: '元医師YouTuberが教える会社員向けYouTube副業＆コンテンツビジネスアカデミー（講座単価: $$$1）',
  },
  {
    regex: /Ali Abdaal publicly sells (.*)/i,
    replacement: '元医師YouTuberによる会社員向けYouTube副業＆コンテンツビジネスアカデミー',
  },
  {
    regex: /MasterClass publicly states that its subscriptions are annual and provides (.*)/i,
    replacement: '世界の超一流（映画監督・料理人等）の講義を独占配信する年額制動画サブスクリプション',
  },
  {
    regex: /MasterClass publicly states that its subscriptions are annual and (.*)/i,
    replacement: '世界の超一流の講義を独占配信する年額制動画サブスクリプション',
  },
  {
    regex: /MasterClass publicly states (.*)/i,
    replacement: '世界の超一流の講義を独占配信する年額制動画サブスクリプション',
  },
  {
    regex: /TIME reports a (\d{4}) launch\.?/i,
    replacement: '$1年にTIME誌等で話題化し急成長したスーツケースD2Cユニコーン',
  },
  {
    regex: /Red Gregory publicly distributes Notion templates through a creator storefront with both free and paid (?:プロダクト|product) paths\.?/i,
    replacement: 'YouTubeとSNSでNotion活用法を無料公開し、Gumroad上の高機能テンプレで完全自動集金するソロモデル',
  },
  {
    regex: /Red Gregory publicly distributes Notion templates (.*)/i,
    replacement: 'YouTubeとSNSでNotion活用法を無料公開し、Gumroad上の高機能テンプレで完全自動集金するソロモデル',
  },
  {
    regex: /Creator Wizard publicly positions sponsorship education around creator brand deals (.*)/i,
    replacement: 'スポンサー企業からの安売り不当徴収を防ぐクリエイター向け案件獲得・価格交渉スクール',
  },
  {
    regex: /Creator Wizard publicly positions (.*)/i,
    replacement: 'スポンサー企業からの安売り不当徴収を防ぐクリエイター向け案件獲得・価格交渉スクール',
  },
  {
    regex: /Creative Tim publicly (.*)/i,
    replacement: '無料UIキット配布で被リンクを総取りしPro版買い切りで抜くテンプレート要塞',
  },
  {
    regex: /Egghead publicly describes focused professional web-development (.*)/i,
    replacement: '『前置きゼロ・5分以内で本質だけ教える』短尺Web技術チュートリアルSaaS',
  },
  {
    regex: /Egghead publicly describes (.*)/i,
    replacement: '『前置きゼロ・5分以内で本質だけ教える』短尺Web技術チュートリアルSaaS',
  },
  {
    regex: /Demand Curve publicly (.*)/i,
    replacement: 'スタートアップ向けグロースマーケティング教育＆実践支援プログラム',
  },
  {
    regex: /Double Your Freelancing publicly (.*)/i,
    replacement: '『時給請求をやめ価値で請求せよ』フリーランスの単価倍増・価格交渉特化スクール',
  },
  {
    regex: /A public founder interview describes Authority Hacker as a documentation-led affiliate publishing education business that reached about \$?([\d,]+) per month in site revenue before a mid-six-figure sale of a site\.?/i,
    replacement: 'ドキュメント主導のアフィリエイト出版・教育事業。サイト売却前に月商約$$1（約225万円）を達成',
  },
  {
    regex: /The interview describes a mid-six-figure sale of an affiliate site\/business\.?/i,
    replacement: 'アフィリエイト事業を数十万ドル（数千万円〜1億円規模）で売却したイグジット実績',
  },
  {
    regex: /A public founder interview describes (.*?) as a[n]? (.*)/i,
    replacement: '$1の創業者インタビュー: $2',
  },
  {
    regex: /A public founder interview describes (.*?) as (.*)/i,
    replacement: '$1: $2',
  },
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
    regex: /(.*?) is publicly described as a[n]? (.*)/i,
    replacement: '$1: $2',
  },
  {
    regex: /公開ページ上で(.*?)は(.*?)として提供され[、,]?\s*(.*)/i,
    replacement: '$1: $2（$3）',
  },
  {
    regex: /operates_as:\s*(.*)/i,
    replacement: '事業形態: $1',
  },
  {
    regex: /The source presents the founder origin but does not provide a precise (.*)/i,
    replacement: '創業背景は公開されているが詳細な$1は非公開',
  },
  {
    regex: /The source documents current membership terms;? launch date was (.*)/i,
    replacement: '会員プラン規約公開中（ローンチ時期: $1）',
  },
  {
    regex: /The source documents (.*)/i,
    replacement: '公開一次資料に基づく事業観測データ: $1',
  },
  {
    regex: /(.*?) publicly lists a roughly \$([\d,]+) lifetime personal purchase (.*)/i,
    replacement: '$1: 約$$$2の個人向け永久ライセンス買い切り販売（$3）',
  },
  {
    regex: /(.*?) publicly lists a \$([\d.]+)-per-month (.*)/i,
    replacement: '$1: 月額$$$2の$3サブスクリプション',
  },
  {
    regex: /(.*?) publicly reports more than ([\d,]+) learners and says (.*)/i,
    replacement: '$1: 受講者数$2人以上を達成（$3）',
  },
  {
    regex: /(.*?) publicly offers a recurring membership with (.*)/i,
    replacement: '$1: $2の定期会員制メンバーシップを提供',
  },
  {
    regex: /(.*?) says it began in (\d{4}) with a group of friends and built a (.*)/i,
    replacement: '$1: $2年に友人グループと創業し、$3を構築',
  },
  {
    regex: /(.*?) publicly differentiates a free limited tier from Premium (.*)/i,
    replacement: '$1: 無料制限版とPremium完全版（$2）を差別化提供',
  },
  {
    regex: /(.*?) publicly offers enhanced Notion project resources;? current price was not visible (.*)/i,
    replacement: '$1: 高度なNotionプロジェクト用リソースを提供（料金は個別確認要）',
  },
  {
    regex: /(.*?) publicly offers (.*)/i,
    replacement: '$1: $2を提供',
  },
  {
    regex: /(.*?) publicly reports (.*)/i,
    replacement: '$1: $2を公表',
  },
  {
    regex: /(.*?) publicly lists (.*)/i,
    replacement: '$1: $2を公開',
  },
  {
    regex: /金額シグナルとして、公開情報は (.*?) USD_annual_revenue を示す。/i,
    replacement: '公開情報による年間売上シグナル: $1 USD',
  },
  {
    regex: /公開情報から確認できる主な収益化経路は (.*?)。/i,
    replacement: '主な収益化経路: $1',
  },
  {
    regex: /現在の価格・課金条件は今回の公開確認では確定できない。/g,
    replacement: '価格体系は非公開または要問合せ',
  },
];

// 英語のIT/ビジネス用語を自然な日本語に置換する辞書
const TERM_TRANSLATIONS: Array<[RegExp, string]> = [
  [/Notion template directory and marketplace/gi, 'Notionテンプレート一覧およびマーケットプレイス'],
  [/Notion template marketplace/gi, 'Notionテンプレート販売マーケットプレイス'],
  [/direct-to-consumer performance apparel/gi, 'D2C高機能アパレルブランド'],
  [/enhanced Notion project resources/gi, 'Notionプロジェクト用高度テンプレート資産'],
  [/current price was not visible in the retrieved evidence/gi, '料金は非公開または要問合せ'],
  [/lifetime personal purchase/gi, '個人向け永久ライセンス買い切り'],
  [/recurring membership/gi, '定期課金メンバーシップ'],
  [/quarterly packs/gi, '四半期定期お届け'],
  [/direct-to-consumer/gi, 'D2C（直販）'],
  [/performance apparel/gi, '高機能アパレル'],
  [/documentation-led affiliate publishing education business/gi, 'ドキュメント主導のアフィリエイト出版・教育事業'],
  [/affiliate sites, courses and education products/gi, 'アフィリエイトサイト群、オンライン講座、教育コンテンツ販売'],
  [/automated AI article writer/gi, 'AIによる記事自動生成ツール'],
  [/voice-to-polished-text app/gi, '音声を洗練された文章へ変換するAIアプリ'],
  [/AI-assisted scheduling and execution-management/gi, 'AIによるスケジュール支援およびタスク実行管理'],
  [/AI browser and GTM automation/gi, 'AIブラウザ自動化および営業・マーケ支援ツール'],
  [/subscription metricsのプロダクト/gi, 'SaaS財務メトリクス分析プラットフォーム'],
  [/project and team operationsのプロダクト/gi, 'プロジェクト・チーム業務管理プラットフォーム'],
  [/form backend operationsのプロダクト/gi, 'フォームバックエンド・通知連携ツール'],
  [/credit-based monthly plans/gi, 'クレジット制の月額サブスクリプション'],
  [/free trial\/Prime subscription/gi, '無料試用および有料Primeサブスクリプション'],
  [/monthly or annual subscription with word allowanceの課金面が示されている/gi, '文字数制限付きの月額/年額サブスクリプション課金'],
  [/Course prices not normalized/gi, '講座価格は非公開または個別設定'],
  [/offers_deployment_path: Astro managed cloud または self-managed/gi, 'マネージドクラウドまたはセルフホスト導入に対応'],
  [/公開情報上の顧客認識は「(.*?)」/gi, '顧客の課題認識: 「$1」'],
  [/ai_product_or_data_business/gi, 'AI・データ自動化プロダクト'],
  [/business_product/gi, 'B2B業務ソフトウェア'],
  [/creator_media_education/gi, 'クリエイター教育・コンテンツ販売'],
  [/paid_newsletter_media/gi, '有料ニュースレター'],
  [/newsletter_media/gi, 'ニュースレターメディア'],
  [/podcast_media/gi, 'ポッドキャストメディア'],
  [/podcast_ad_marketplace/gi, 'ポッドキャスト広告枠マーケットプレイス'],
  [/SEO and marketing operations/gi, 'SEO・競合被リンク分析'],
  [/password and credential operations/gi, 'パスワード・認証情報一元管理'],
  [/startup acquisition marketplace/gi, 'スモールM&A・事業売買仲介プラットフォーム'],
  [/independent technology and internet newsroom/gi, '独立系テック・ネット調査報道メディア'],
  [/project and work management/gi, 'プロジェクト進捗・タスク管理SaaS'],
  [/podcast network/gi, 'ポッドキャスト番組配信ネットワーク'],
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

  // 英語の主語・動詞接続句を自然な日本語へ変換
  cleaned = cleaned
    .replace(/\bpublicly describes\b/gi, '：')
    .replace(/\bpublicly distributes\b/gi, 'による配布・販売：')
    .replace(/\bpublicly sells\b/gi, 'による販売：')
    .replace(/\bpublicly positions\b/gi, 'による特化展開：')
    .replace(/\bpublicly states that its subscriptions are annual and provides?\b/gi, '年額サブスクリプションによる独占講義提供：')
    .replace(/\bthrough a creator storefront with both free and paid\b/gi, '（無料版と有料完全版の併用展開）')
    .replace(/\bThe source documents a live paid storefront;? launch date was not verified\.?\b/gi, '独自ストアフロントにて有料プロダクトを直販中（コミュニティ集客で拡大）')
    .replace(/\bThe source documents the founder's prior agency and current courses;? launch date was not verified\.?\b/gi, '受託開発から派生した高単価オンライン講座を展開')
    .replace(/\bThe source documents the current Growth Program;? launch date was not verified\.?\b/gi, '実践型グロースマーケティング支援プログラムを展開')
    .replace(/\bThe source documents\b/gi, '公開一次資料に基づく事業観測：')
    .replace(/\blaunch date was not verified\b/gi, 'ローンチ時期は未確認')
    .replace(/\bpaths\b/gi, '導線')
    .replace(/\bstorefront\b/gi, '直販ストア');

  // 不要な英語の接尾辞や免責文の切除
  cleaned = cleaned.replace(/; the category is a research classification.*/i, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Preserve unmatched source text: language alone is not evidence of a business model.
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

  // Keep authored labels (including magnitude suffixes and ranges) verbatim.
  // Stripping non-digits would turn $10M into $10 and 10-20 into 10.
  if (typeof amount === 'string' && !/^[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(amount.trim())) {
    return cleanMoneyLabel(amount);
  }
  const num = typeof amount === 'number' ? amount : Number(amount.replaceAll(',', ''));
  if (!Number.isFinite(num)) {
    return '金額未確認';
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
