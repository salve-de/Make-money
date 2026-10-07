import type { ReaderCase, ReaderFact, ReaderMetric, ReaderSource } from './reader-case';
import { metricWhen } from './metric-when';
import { stripOriginTag } from './origin-tag';
import { GENRE_LABELS, MEASURE_LABELS, ORIGIN_LABELS, UI, UNKNOWN_LABELS } from './ui-strings';

/**
 * 画面に出す直前に文字を整える共通関数。
 * データ側に残っている内部ラベル・権利の記号・調査の作業記録を、読者向けの文に変える。
 * 新しく入るデータにも効くよう、個別のデータではなく形（パターン）で処理する。
 */

/** 出典種別（英小文字の snake_case）→ 日本語。表に無いものは表示しない。 */
const SOURCE_KIND_LABELS: Record<string, string> = {
  community_revenue_page: 'Indie Hackers の収益ページ',
  founder_post: '本人の投稿',
  community_founder_post: '本人の投稿',
  founder_interview: '本人のインタビュー',
  founder_blog: '本人のブログ',
  official_website_successor_domain: '公式サイト（移転先のドメイン）',
  archive_snapshot_of_official_website: '公式サイトの過去の保存版',
  archive_index_metadata: 'Web アーカイブの記録',
  web_archive_index: 'Web アーカイブの記録',
  app_store_listing: 'App Store の掲載ページ',
  official_blog: '公式ブログ',
  official_pricing: '公式の料金ページ',
  news_article: '報道記事',
};

/** 大文字の格付けラベル（TIER1_OFFICIAL など）。権利の区分（TIER2_FACTS_ONLY など）は表示しない。 */
const TIER_LABELS: Record<string, string> = {
  TIER1_OFFICIAL: '公式情報',
  TIER1_PLATFORM: 'プラットフォームの公表',
  TIER1_PUBLIC_RECORD: '公的記録',
};

const SNAKE_LOWER = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/;
const TIER_TOKEN = /^TIER\d_[A-Z_]+$/;
const URL_RE = /^https?:\/\//i;

function cleanSegment(raw: string): string | null {
  let seg = raw.trim();
  if (!seg) return null;
  if (URL_RE.test(seg)) return seg;
  if (/^community listing$/i.test(seg)) return 'コミュニティの掲載ページ';
  if (TIER_TOKEN.test(seg)) return TIER_LABELS[seg] ?? null;
  if (SNAKE_LOWER.test(seg)) return SOURCE_KIND_LABELS[seg] ?? null;
  // 「rights: Tier 2 facts-only」は権利の区分。後ろの日本語の補足だけ残す。
  seg = seg.replace(/rights:\s*Tier\s*\d+[^/（(]*/gi, '');
  seg = seg.replace(/\bfacts-only\b/gi, '');
  seg = seg.replace(/[（(]\s*原文は非公開のまま\s*[）)]/g, '');
  seg = seg.replace(/\bcommunity listing\b/gi, 'コミュニティの掲載ページ');
  seg = seg.replace(/(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g, '$1');
  seg = seg.replace(/\s{2,}/g, ' ').trim();
  if (!seg || /^[（(]\s*[）)]$/.test(seg)) return null;
  return seg;
}

/** 出典メモ（sourceNote / sourceDoc）を読者向けに整える。URL と日付と日本語の説明は残す。 */
export function formatSourceNote(note: string | null | undefined): string {
  if (!note) return '';
  const segments = note.split(/\s+\/\s+/).map(cleanSegment).filter((s): s is string => Boolean(s));
  return segments.join(' / ');
}

/** 損益の参照資料。「出典未記録」のような空の印は ''（行ごと出さないか「未確認」にする）。 */
export function sourceDocLabel(value: string | null | undefined): string {
  const v = cleanDisplayText(value);
  return /^(?:出典)?未記録$/.test(v) ? '' : v;
}

/** 財務の対象期間。「公式サイト等を再確認」のような作業の状態を書いた値は期間ではないので ''。 */
export function snapshotPeriodLabel(value: string | null | undefined): string {
  const v = cleanDisplayText(value);
  return /公式サイト等を再確認/.test(v) ? '' : v;
}

/** 「確認した時点」。作業の状態の文言は日付だけ残して「YYYY-MM-DD 時点」にする。 */
export function confirmedAtLabel(value: string | null | undefined): string {
  return cleanDisplayText(value).replace(/\s*公式サイト等を再確認.*$/, ' 時点').trim();
}

/** ISO タイムスタンプを YYYY-MM-DD にする。日付だけの文字列はそのまま。 */
export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().replace(/^(\d{4}-\d{2}-\d{2})T.*$/, '$1');
}

/** 調査メモの由来ラベル。対応が無いものは null（表示しない）。 */
const ORIGIN_TYPE_LABELS: Record<string, string> = {
  observed: '観測',
  reported: '報告値',
  inferred: '構造推論',
  estimated: '推計',
};
export function originTypeLabel(originType: string | null | undefined): string | null {
  return (originType && ORIGIN_TYPE_LABELS[originType]) || null;
}

/** 文中の「（2026-09-29 観測 / … / TIER2_FACTS_ONLY / URL）」型の出典括弧。 */
const PROVENANCE_PAREN = /([（(])([^（()）]*?(?:\s\/\s)[^（()）]*?)([）)])/g;

const INLINE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\s?SSL_ERROR_[A-Z_]+/g, ''],
  // ISO タイムスタンプは日付だけにする（2026-09-14T01:27:30.171Z → 2026-09-14）
  [/(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g, '$1'],
  [/Indie Hackers listing:\s*([^\n]+?)\s*$/gm, 'Indie Hackers の掲載文: 「$1」'],
  [/HABIB_ALI/g, 'Habib Ali'],
  [/CUMULATIVE_ROYALTIES/g, '累計ロイヤルティ'],
  [/EVOLVING_BARRIER/g, '参入条件が変わり続ける型'],
];

/** 本文・観測・年表などの文字を整える。出典括弧の中の権利記号と、本文に混ざった内部の語を除く。 */
export function cleanDisplayText(text: string | null | undefined): string {
  if (!text) return '';
  let out = text.replace(PROVENANCE_PAREN, (whole, open: string, inner: string, close: string) => {
    if (!/TIER\d_|rights:|facts-only|community listing|\b[a-z]+(?:_[a-z0-9]+)+\b/.test(inner)) return whole;
    const cleaned = formatSourceNote(inner);
    return cleaned ? `${open}${cleaned}${close}` : '';
  });
  for (const [re, to] of INLINE_REPLACEMENTS) out = out.replace(re, to);
  return out.replace(/[ \t]{2,}/g, ' ').replace(/\s+([。、])/g, '$1').trim();
}

/** 道具欄の分類（英大文字ラベル）→ 日本語。意味が曖昧なもの・未知のものは null（表示しない）。 */
const TOOL_CATEGORY_LABELS: Record<string, string> = {
  AI_CODING: 'AIコーディング', AI_CODE: 'AIコーディング', MARKETPLACE_APP: 'マーケットプレイスアプリ', HARDWARE: '機材',
  AFFILIATE_PROGRAM: '紹介プログラム', AD_NETWORK: '広告ネットワーク', DIRECT_MAIL_API: 'ダイレクトメールAPI',
  DATA_SOURCE: 'データ提供元', LIVE_COMMERCE_APP: 'ライブコマースアプリ', MARKETPLACE: 'マーケットプレイス',
  HOSTING: 'ホスティング', MESSAGING: 'メッセージ配信', DESIGN: 'デザイン', OWN_TOOL: '自社開発ツール',
  NOTIFICATION: '通知', DIRECT_MAIL: 'ダイレクトメール', AI_AGENT: 'AIエージェント', ADS: '広告', AD: '広告',
  TICKETING: 'チケット販売', VIDEO_EDITOR: '動画編集', MONETIZATION: '収益化', INFORMATION_SOURCE: '情報源',
  NO_CODE: 'ノーコード', FREELANCE_PLATFORM: 'フリーランス仲介', FREELANCE_MARKETPLACE: 'フリーランス仲介',
  TERMINAL: '端末', AUTOMATION: '自動化', VERSION_CONTROL: 'バージョン管理', JOB_AGGREGATOR: '求人集約',
  AI_API: 'AI API', CMS: 'CMS', AI_TRANSCRIPTION: 'AI文字起こし', SMS: 'SMS', EMAIL_API: 'メールAPI',
  NEWSLETTER_PLATFORM: 'ニュースレター基盤', PLUGIN: 'プラグイン', CRM_PLATFORM: '顧客管理', CRM: '顧客管理',
  LOCAL_SEO: 'ローカルSEO', AI_TOOL: 'AIツール', AI_VIDEO: 'AI動画', PET_SITTING_APP: 'ペットシッターアプリ',
  ONLINE_COURSE: 'オンライン講座', SPREADSHEET: '表計算', PARKING_MARKETPLACE: '駐車場仲介',
  SERVICE_MARKETPLACE: 'サービス仲介', COMMUNITY_PLATFORM: 'コミュニティ', COMMUNITY: 'コミュニティ',
  ECOMMERCE: 'EC', COMMERCE: 'EC', PRINT_ON_DEMAND: '受注生産印刷', RENTAL_MARKETPLACE: 'レンタル仲介',
  LAUNDRY_APP: 'ランドリーアプリ', APP_ANALYTICS: 'アプリ分析', WRITING_PLATFORM: '執筆プラットフォーム',
  GIG_PLATFORM: '単発仕事仲介', TUTOR_MARKETPLACE: '家庭教師仲介', IAP_PLATFORM: 'アプリ内課金基盤', SOCIAL: 'SNS',
  SUBSCRIPTION_PLATFORM: '定期課金基盤', VOICE_AI: 'AI音声', AI_VOICE: 'AI音声', AFFILIATE_NETWORK: 'アフィリエイトネットワーク',
  AFFILIATE_TOOL: 'アフィリエイトツール', AFFILIATE: 'アフィリエイト', OWN_PRODUCT: '自社製品', AI_APP_BUILDER: 'AIアプリ作成',
  PUBLISHING_PLATFORM: '出版', PUBLISHING: '出版', SALES_PLATFORM: '販売基盤', MAPS: '地図', SALES_OUTREACH: '営業アプローチ',
  ROBO_ADVISOR: 'ロボアドバイザー', CROWDFUNDING: 'クラウドファンディング', GAME_STORE: 'ゲーム販売',
  DOMAIN_MARKETPLACE: 'ドメイン売買', DOMAIN_REGISTRAR: 'ドメイン登録', DOMAIN_SEARCH: 'ドメイン検索', FRAMEWORK: 'フレームワーク',
  'M&A_MARKETPLACE': 'M&A仲介', MA_MARKETPLACE: 'M&A仲介', PAYMENT: '決済', PAYMENT_PLATFORM: '決済', APP_STORE: 'アプリストア',
  VIDEO_CALL: 'ビデオ通話', TUTOR_AGENCY: '家庭教師派遣', COURSE_MARKETPLACE: '講座販売', COURSE_PLATFORM: '講座販売',
  GPT_SITE: 'GPT関連サイト', ERP_PLATFORM: '基幹システム', WEB_BUILDER: 'サイト作成', WEBSITE_BUILDER: 'サイト作成',
  BUG_BOUNTY: '脆弱性報奨金', MICROTASK_PLATFORM: '小口作業仲介', VIDEO_PLATFORM: '動画配信', EMAIL: 'メール',
  QA_PLATFORM: 'Q&A', PROJECT_MANAGEMENT: 'プロジェクト管理', INVENTORY_FINANCE: '在庫融資', DEAL_PLATFORM: '取引仲介',
  MESSENGER: 'メッセンジャー', AD_EXCHANGE: '広告取引所', SEO: 'SEO', SOURCING: '仕入れ', AI_MARKETPLACE: 'AI仲介',
  AI_HOSTING: 'AIホスティング', AI_MODEL: 'AIモデル', CLASS_PLATFORM: '授業配信', VIDEO: '動画', OPEN_SOURCE: 'オープンソース',
  SEO_TOOL: 'SEOツール', ANALYTICS: '分析', CODE_HOSTING: 'コード管理', AI_WRITING: 'AI文章作成', MEMBERSHIP: '会員制',
  STOCK_AGENCY: 'ストック素材', EXPERT_MARKETPLACE: '専門家仲介', AD_PLATFORM: '広告基盤', DESIGN_TOOL: 'デザインツール',
  INTEGRATION: '連携', API: 'API', BLOG: 'ブログ', BACKEND: 'バックエンド', LANDING_PAGE: 'ランディングページ',
  ACCOUNT_MARKETPLACE: 'アカウント売買', ANIMATION: 'アニメーション', EVENT_PLATFORM: 'イベント基盤', PRODUCTIVITY: '生産性',
  PODCAST_HOSTING: 'ポッドキャスト配信', SPONSORSHIP_PLATFORM: 'スポンサー仲介', NEWSLETTER: 'ニュースレター',
  NEWSLETTER_ADS: 'ニュースレター広告', PINTEREST_SCHEDULER: 'Pinterest投稿予約', CLOUD: 'クラウド', CDN: 'CDN',
  COMMUNICATION: '連絡', STORAGE: 'ストレージ', PDF: 'PDF', ARCHIVE: 'アーカイブ', AI_IMAGE: 'AI画像', LANDING: 'ランディングページ',
};

const ALL_CAPS_LABEL = /^[A-Z0-9][A-Z0-9&]*(?:_[A-Z0-9&]+)*$/;

/** 道具の分類名。日本語の分類名を返す。曖昧（OTHER, PLATFORM, PARTNER）・未知の英語ラベルは null。 */
export function toolCategoryLabel(category: string | null | undefined): string | null {
  const c = category?.trim();
  if (!c) return null;
  if (TOOL_CATEGORY_LABELS[c]) return TOOL_CATEGORY_LABELS[c];
  if (ALL_CAPS_LABEL.test(c) || SNAKE_LOWER.test(c)) return null;
  return c;
}

/** 調査の作業（公式サイトが開けたかの確認）。事業の出来事ではないので年表に出さない。 */
const RESEARCH_EVENT_TYPES = new Set(['OFFICIAL_URL_CHECK', 'mathematical_audit']);
export function isResearchTimelineEvent(eventType: string | null | undefined): boolean {
  return Boolean(eventType && RESEARCH_EVENT_TYPES.has(eventType));
}

const TIMELINE_EVENT_LABELS: Record<string, string> = {
  IH_FIRST_VISIBLE_POST: 'Indie Hackers 最古の表示投稿',
  IH_FIRST_POST_OBSERVED: 'Indie Hackers 最古の投稿',
  first_archive_capture: 'Web アーカイブ初回保存',
  website_redesign: 'サイト刷新', freemium_launch: '無料プラン開始', product_hunt_listing: 'Product Hunt 掲載',
  product_hunt_launch: 'Product Hunt 公開', company_founded: '会社設立', company_start: '事業開始', incorporation: '法人化',
  product_launch: '製品公開', product_launched: '製品公開', public_launch: '一般公開', global_launch: '海外展開',
  landing_page_launch: 'LP公開', site_launch: 'サイト公開', mvp_launch: '試作版公開', mvp_milestone: '試作版の節目',
  commercial_launch: '商用開始', commercial_offer: '有償提供開始', paid_version_launched: '有料版公開',
  first_paying_customer: '最初の有料顧客', first_subscriber: '最初の購読者', paying_customer_milestone: '有料顧客数の節目',
  user_milestone: '利用者数の節目', reported_user_milestone: '利用者数の節目', acquisition: '買収', funding_reported: '資金調達',
  launch_announcement: '公開告知', rebrand_announcement: '名称変更の告知', plugin_launch: 'プラグイン公開',
  version_release: '版の公開', us_app_release: '米国でアプリ公開', service_started: 'サービス開始',
  client_engagement_started: '受託開始', ownership_change_announced: '所有者交代の告知', public_announcement: '公表',
  api_wrapper_release: 'API 包装版の公開', publication_launch: '媒体の創刊', related_product_launch: '関連製品の公開',
  idea_milestone: '着想の節目', founder_reported_start: '本人申告の開始時期', reported_start: '申告された開始時期',
  indie_hackers_launch_post: 'Indie Hackers 公開投稿', product_introduction_post: '製品紹介の投稿',
  public_product_introduction: '製品の公開紹介', launch_waitlist_response: '公開前登録への反応',
  customer_adoption_announcement: '導入の告知', appsumo_sale_started: 'AppSumo 販売開始',
  website_publication_reported: 'サイト公開', first_year_retrospective: '1年目の振り返り',
  free_builder_announcement: '無料作成ツールの告知', manufacturing_collaboration_start: '製造協力の開始',
  early_projects_milestone: '初期案件の節目', development_retrospective_published: '開発の振り返り公開',
  operations_retrospective_published: '運営の振り返り公開', internal_script_created: '社内スクリプト作成',
  product_company_transition: '製品から会社への移行', guerrilla_traction: '初期の集客', pricing_and_abuse_control_change: '料金と不正対策の変更',
  affiliate_moat: '紹介制度の整備', monetization: '収益化', current: '現在', launch: '公開',
};

/** 年表の出来事の種別。日本語にできないものは null（表示しない）。 */
export function timelineEventLabel(eventType: string | null | undefined): string | null {
  const t = eventType?.trim();
  if (!t) return null;
  if (TIMELINE_EVENT_LABELS[t]) return TIMELINE_EVENT_LABELS[t];
  if (ALL_CAPS_LABEL.test(t) || SNAKE_LOWER.test(t)) return null;
  return t;
}

// ---- 売上の表示（一覧・詳細の「公表された年間売上」）-------------------------------------
// 元の文にある数字だけを使う。通貨は変えない。12で割った円換算は出さない。

export interface RevenueTextInput {
  revenueLabel?: string | null;
  estimationLogic?: string | null;
  /** reaudit.supported の各行 */
  supported?: readonly string[] | null;
  /** pnl.dataSnapshotPeriod */
  period?: string | null;
  /** pnl.sourceDoc（提出書類の種別を URL から補う） */
  sourceDoc?: string | null;
}

export interface AnnualReport {
  /** 例: FY2025 / 2025年3月期。取れなければ '' */
  fiscalYear: string;
  /** 期間末の表記。例: 期間末 2025-11-28 / 2025年9月27日終了。取れなければ '' */
  periodEnd: string;
  /** 例: 10-K / 20-F / 有価証券報告書 / 決算短信 / SEC開示 / 公表資料 */
  doc: string;
  revenue: string;
  operatingIncome?: string;
  netIncome?: string;
}

type Currency = 'USD' | 'EUR' | 'JPY' | 'CNY' | 'KRW';
const UNIT_CURRENCY: Array<[RegExp, Currency]> = [
  [/^(?:百万ドル|百万USD)$/i, 'USD'],
  [/^百万(?:EUR|ユーロ)$/i, 'EUR'],
  [/^百万円$/, 'JPY'],
  [/^百万(?:元|元RMB|CNY|RMB)$/i, 'CNY'],
  [/^百万(?:KRW|ウォン)$/i, 'KRW'],
];

function formatAmount(value: number, cur: Currency): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (cur === 'USD' || cur === 'EUR') {
    const sym = cur === 'USD' ? '$' : '€';
    if (abs >= 1e9) return `${sign}${sym}${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}${sym}${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}${sym}${(abs / 1e3).toFixed(1)}K`;
    return `${sign}${sym}${abs.toLocaleString('en-US')}`;
  }
  const word = cur === 'JPY' ? '円' : cur === 'CNY' ? '元' : 'ウォン';
  if (abs >= 1e12) return `${sign}${Number((abs / 1e12).toFixed(2))}兆${word}`;
  if (abs >= 1e8) return `${sign}${Math.round(abs / 1e8).toLocaleString('ja-JP')}億${word}`;
  if (abs >= 1e4) return `${sign}${Math.round(abs / 1e4).toLocaleString('ja-JP')}万${word}`;
  return `${sign}${abs.toLocaleString('ja-JP')}${word}`;
}

/** 「百万ドル」付きの数値。[全体, 数値, 単位] */
const MILLION_AMOUNT = '(-?[\\d,]+(?:\\.\\d+)?)(百万(?:ドル|USD|EUR|ユーロ|円|元RMB|元|CNY|RMB|KRW|ウォン))';

function millionAmount(num: string, unit: string, negative = false): string | null {
  const cur = UNIT_CURRENCY.find(([re]) => re.test(unit))?.[1];
  const n = Number(num.replace(/,/g, '')) * 1e6;
  if (!cur || !Number.isFinite(n)) return null;
  return formatAmount(negative ? -Math.abs(n) : n, cur);
}

function docFromText(text: string): string {
  if (/10-K/.test(text)) return '10-K';
  if (/20-F/.test(text)) return '20-F';
  if (/40-F/.test(text)) return '40-F';
  if (/有価証券報告書/.test(text)) return '有価証券報告書';
  if (/決算短信/.test(text)) return '決算短信';
  if (/SEC/.test(text)) return 'SEC開示';
  return '公表資料';
}

function fiscalYearFromText(text: string): string {
  const fy = /FY\s?(\d{4})/.exec(text);
  if (fy) return `FY${fy[1]}`;
  const jp = /(\d{4})年\d{1,2}月期/.exec(text);
  return jp ? jp[0] : '';
}

function periodEndFromText(text: string): string {
  const a = /期間末\s*(\d{4}-\d{2}-\d{2})/.exec(text);
  if (a) return `期間末 ${a[1]}`;
  const b = /(\d{4}年\d{1,2}月\d{1,2}日)終了/.exec(text);
  return b ? `${b[1]}終了` : '';
}

const SUPPORTED_ROW =
  /^((?:SEC )?(?:10-K|20-F|40-F)|有価証券報告書|決算短信)[^:：]*?[:：]\s*(売上|営業利益|営業損失|純利益|純損失)\s*(-?)\$([\d,]+(?:\.\d+)?)/;

function fromSupportedRows(rows: readonly string[]): AnnualReport | null {
  let out: AnnualReport | null = null;
  for (const row of rows) {
    const m = SUPPORTED_ROW.exec(row.trim());
    if (!m) continue;
    const value = Number(m[4].replace(/,/g, ''));
    if (!Number.isFinite(value)) continue;
    const head = row.slice(0, row.search(/[:：]/));
    const negative = m[3] === '-' || m[2].endsWith('損失');
    const text = formatAmount(negative ? -value : value, 'USD');
    if (m[2] === '売上') {
      out = { fiscalYear: fiscalYearFromText(head), periodEnd: periodEndFromText(head), doc: docFromText(m[1]), revenue: text };
    } else if (out) {
      if (m[2].startsWith('営業')) out.operatingIncome = text;
      else out.netIncome = text;
    }
  }
  return out;
}

const EST_REVENUE = new RegExp(`(?:FY\\d{4}|\\d{4}年)?(?:連結|総)?売上(?:等)?${MILLION_AMOUNT}`);
const EST_OPERATING = new RegExp(`営業(利益|損失)(?:相当)?${MILLION_AMOUNT}`);
const EST_NET = new RegExp(`純(利益|損失)${MILLION_AMOUNT}`);

function fromEstimationLogic(est: string, period: string): AnnualReport | null {
  // 年次の報告値を12分割・換算した説明にだけ使う（月次の売上を述べた文は対象外）
  if (!/12分割|12で割|年次報告値|SEC開示|年次報告|決算資料|公式.*資料/.test(est)) return null;
  const rev = EST_REVENUE.exec(est);
  if (!rev) return null;
  const revenue = millionAmount(rev[1], rev[2]);
  if (!revenue) return null;
  const op = EST_OPERATING.exec(est);
  const net = EST_NET.exec(est);
  const report: AnnualReport = {
    fiscalYear: fiscalYearFromText(est) || fiscalYearFromText(period),
    periodEnd: periodEndFromText(period),
    doc: docFromText(est.replace(/12分割/g, '')),
    revenue,
  };
  if (op) { const v = millionAmount(op[2], op[3], op[1] === '損失'); if (v) report.operatingIncome = v; }
  if (net) { const v = millionAmount(net[2], net[3], net[1] === '損失'); if (v) report.netIncome = v; }
  return report;
}

function fiscalYearFromRange(period: string): string {
  const range = /(\d{4})-\d{2}-\d{2}\s*[〜~～-]\s*(\d{4})-\d{2}-\d{2}/.exec(period);
  return range ? `FY${range[2]}` : '';
}

/** revenueLabel に書かれた年間売上（12で割った円換算の説明文と、SEC 提出書類の売上）。 */
function fromRevenueLabel(label: string, est: string, period: string, docContext = ''): AnnualReport | null {
  // 「売上高45,183,036千ドル / 営業利益… / 純利益…」（期間は 2025-01-01〜2025-12-31）
  const thousand = /^売上高\s*(-?[\d,]+(?:\.\d+)?)\s*千ドル/.exec(label);
  if (thousand) {
    const value = Number(thousand[1].replace(/,/g, '')) * 1e3;
    if (Number.isFinite(value) && value > 0) {
      return {
        fiscalYear: fiscalYearFromText(period) || fiscalYearFromRange(period),
        periodEnd: periodEndFromText(period),
        doc: docFromText(`${est} ${period} ${docContext}`),
        revenue: formatAmount(value, 'USD'),
      };
    }
  }
  const divided = /^月平均[^（(]*[（(](?:(FY\d{4})\s*)?年間売上\s*(.+?)\s*を12で割/.exec(label);
  if (divided) {
    return {
      fiscalYear: divided[1] || fiscalYearFromText(period),
      periodEnd: periodEndFromText(period),
      doc: docFromText(`${est} ${period}`),
      revenue: divided[2].replace(/\s/g, ''),
    };
  }
  const sec = /^SEC (10-K|20-F|40-F) (FY\d{4}):\s*(?:Revenue|年間売上)\s*(.+?)(?:[（(]|$)/.exec(label);
  if (sec) {
    const token = sec[3].trim();
    const usd = /^\$([\d,]+(?:\.\d+)?)$/.exec(token);
    let revenue: string | null = null;
    if (usd) revenue = formatAmount(Number(usd[1].replace(/,/g, '')), 'USD');
    else {
      const m = new RegExp(`^${MILLION_AMOUNT}$`).exec(token);
      revenue = m ? millionAmount(m[1], m[2]) : null;
    }
    return { fiscalYear: sec[2], periodEnd: periodEndFromText(period), doc: sec[1], revenue: revenue ?? token };
  }
  return null;
}

/** 年次の報告値（SEC・有価証券報告書・決算短信）を取り出す。取れなければ null。 */
export function reportedAnnualReport(input: RevenueTextInput): AnnualReport | null {
  const est = input.estimationLogic ?? '';
  const period = input.period ?? '';
  const label = (input.revenueLabel ?? '').trim();
  const rows = fromSupportedRows(input.supported ?? []);
  if (rows) return rows;
  const fromEst = fromEstimationLogic(est, period);
  const docContext = `${(input.supported ?? []).join(' ')} ${/sec\.gov/i.test(input.sourceDoc ?? '') ? 'SEC' : ''}`;
  const fromLabel = fromRevenueLabel(label, est, period, docContext);
  if (fromEst && fromLabel) return { ...fromEst, revenue: fromLabel.revenue, fiscalYear: fromLabel.fiscalYear || fromEst.fiscalYear };
  return fromEst ?? fromLabel;
}

/** 一覧の「年間売上 $23.8B（FY2025・10-K）」。 */
export function annualRevenueLine(report: AnnualReport): string {
  const meta = [report.fiscalYear, report.doc].filter(Boolean).join('・');
  return `年間売上 ${report.revenue}${meta ? `（${meta}）` : ''}`;
}

const NO_REVENUE = '売上未確認';
const AMOUNT = String.raw`\$[\d,.]+[KMB]?`;

/** 出典つきの記録行から、創業者が入力した月次売上を取り出す（例: Indie Hackers の収益ページ）。無ければ null。 */
function selfReportedRevenueFromSupported(rows: readonly string[]): string | null {
  for (const row of rows) {
    if (!/収益ページ/.test(row) || !/創業者|本人申告/.test(row)) continue;
    const m = new RegExp(`^(.*?)（(\\d{4}-\\d{2}-\\d{2})）[:：].*?月次売上\\s*(${AMOUNT})`).exec(row.trim());
    if (!m) continue;
    return `月次売上 ${m[3]}（本人申告・${/Indie Hackers/.test(m[1]) ? 'IH ' : ''}${m[2]}）`;
  }
  return null;
}

/**
 * 一覧の「売上」欄の文字（売上が確認できていない行に出す）。
 * 年次の報告値は年次のまま、申告・記事の月次売上は短く、裏付けの無いものは「売上未確認」。
 */
export function listRevenueText(input: RevenueTextInput): string {
  const label = cleanDisplayText(input.revenueLabel).trim();
  const annual = reportedAnnualReport({ ...input, revenueLabel: label });
  if (annual) return annualRevenueLine(annual);
  if (!label || /^この収益欄は裏付けが無い|^売上期間未確認|^売上未確認$|^未確認$|数値は未確認/.test(label)) {
    return selfReportedRevenueFromSupported(input.supported ?? []) ?? NO_REVENUE;
  }

  const self = new RegExp(`^本人申告\\s*(月次売上|月次収益|MRR)\\s*(${AMOUNT})\\s*[（(](\\d{4}-\\d{2}-\\d{2})`).exec(label);
  if (self) return `${self[1]} ${self[2]}（本人申告・${/IH/.test(label) ? 'IH ' : ''}${self[3]}）`;

  const ih30 = new RegExp(`^IH\\s*の?収益ページ.*?直近(\\d+)日の売上\\s*(${AMOUNT})\\s*[（(](\\d{4}-\\d{2}-\\d{2})\\s*取得`).exec(label);
  if (ih30) return `直近${ih30[1]}日の売上 ${ih30[2]}（IH収益ページ・${ih30[3]}取得）`;

  const article = new RegExp(`^(本人申告|記事記載|第三者の報告)\\s+(\\S+?)\\s*[（(]([^）)]*)[）)]\\s*/\\s*eBiz Facts (\\d{4}-\\d{2}-\\d{2})掲載`).exec(label);
  if (article) {
    let [head, ...rest] = article[3].split('・');
    if (/^[A-Z][A-Z_]+$/.test(head)) {
      // 期間の種別が内部ラベルのまま入っているもの（TOTAL_OR_BEST_PERIOD）
      rest = [head === 'TOTAL_OR_BEST_PERIOD' ? '累計または最良期間' : '期間の区分不明', ...rest];
      head = '売上';
    }
    return `${head} ${article[2]}（${[article[1], ...rest, `eBiz Facts ${article[4]}`].join('・')}）`;
  }

  const oneLine = label.split(/\s\/\s|／|。/u)[0].trim();
  return oneLine.length > 60 ? `${oneLine.slice(0, 59)}…` : oneLine || NO_REVENUE;
}

interface EntityLikeForRevenue {
  pnl: { revenueLabel?: string; estimationLogic?: string; dataSnapshotPeriod?: string; sourceDoc?: string };
  reaudit?: { [field: string]: unknown } | null;
}

/** 事例（FinancialEntity）から売上表示の入力を作る。 */
export function revenueTextInputOf(entity: EntityLikeForRevenue): RevenueTextInput {
  const supported = entity.reaudit?.supported;
  return {
    revenueLabel: entity.pnl.revenueLabel,
    estimationLogic: entity.pnl.estimationLogic,
    period: entity.pnl.dataSnapshotPeriod,
    sourceDoc: entity.pnl.sourceDoc,
    supported: Array.isArray(supported) ? supported.filter((s): s is string => typeof s === 'string') : [],
  };
}

/**
 * 名前・国の欄に付いた、出典の説明の括弧書きを外す。
 * 例: 「Courier（公式サイトの著作権表記）」→「Courier」、「LANS Inc.（公式サイトの表示。州・所在地は未確認）」→「LANS Inc.」
 * 括弧の中に「どこに書いてあったか」「何が未確認か」を示す語がある時だけ外す。社名の一部の括弧（(Pty) Ltd など）は残す。
 */
const SOURCE_PAREN_RE = /\s*[（(][^（）()]*(?:公式|出典|表記|表示|記載|ディレクトリ|掲載|由来|未確認|確認できな|情報のみ)[^（）()]*[）)]/g;

export function stripSourceParenthetical(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(SOURCE_PAREN_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/** ヘッダーの「法人名/創業者 · 国」。括弧の出典説明を外し、内部の英語ラベル（UNKNOWN）は出さない。全部未確認なら ''。 */
export function entityIdentityLine(legalEntityOrFounder: string | null | undefined, country: string | null | undefined): string {
  const parts = [legalEntityOrFounder, country]
    .map(stripSourceParenthetical)
    .map((part) => (/^UNKNOWN$/i.test(part) ? '' : part))
    .filter(Boolean);
  if (parts.every((part) => part === '未確認')) return '';
  return parts.join(' · ');
}

/**
 * 損益の「算定根拠」。推計・換算をしていないことを述べるだけの定型文
 * （「出典に書かれた申告・発表を日付付きで記録。金額の推計・換算は行っていない。P&L項目の数値は0のまま未確認。」）は、
 * 算定の根拠ではないので出さない。他の文が残ればそれだけ返す。
 */
export function estimationLogicLabel(value: string | null | undefined): string {
  const text = cleanDisplayText(value);
  if (!text) return '';
  const sentences = text.split(/(?<=[。！？])\s*/u).filter(Boolean);
  const kept = sentences.filter((sentence) =>
    // 「〜は行っていない」「〜を保持」で終わる作業の説明は算定の根拠ではない
    !/(?:推計|換算|按分|計算)[^。]*(?:行って|して)いない[。.]?$/.test(sentence)
    && !/保持[。.]?$/.test(sentence)
    && !/^月次のP&Lは未確認のまま[。.]?$/.test(sentence)
    && !/^出典に書かれた.*記録[。.]?$/.test(sentence)
    && !/^P&L項目の数値は0のまま未確認[。.]?$/.test(sentence));
  return kept.join('');
}

// ---- 出典の区分（読者向けの平易な語）-----------------------------------------------
const DISCLOSURE_HOST = /(?:^|\.)(?:sec\.gov|edinet-fsa\.go\.jp|release\.tdnet\.info|jpx\.co\.jp)$/i;
const SELF_REPORT_HOST = /(?:^|\.)(?:indiehackers\.com|x\.com|twitter\.com)$/i;
const ARTICLE_HOST = /(?:^|\.)ebizfacts\.com$/i;

function hostOf(text: string): string {
  const match = /https?:\/\/[^\s<>）)]+/u.exec(text);
  if (!match) return '';
  try { return new URL(match[0]).hostname; } catch { return ''; }
}

/**
 * 出典の区分。判定できた時だけ「開示資料」「本人申告」「記事」「公式発表」を返し、確かでなければ null（表示しない）。
 * 判定には出典の URL・出典メモの語・出典の独立性（sourceClass）を使う。
 */
export function sourceKindLabel(input: { text?: string | null; sourceClass?: string | null }): string | null {
  const text = input.text ?? '';
  const host = hostOf(text);
  if (DISCLOSURE_HOST.test(host) || /(?:^|[^A-Za-z])(?:10-K|20-F|40-F)(?![A-Za-z])|有価証券報告書|決算短信/.test(text)) return '開示資料';
  if (SELF_REPORT_HOST.test(host) || /本人申告/.test(text)) return '本人申告';
  if (ARTICLE_HOST.test(host) || /eBiz Facts/.test(text) || input.sourceClass === 'INDEPENDENT_SECONDARY') return '記事';
  if (input.sourceClass === 'PRIMARY') return '公式発表';
  return null;
}

// ---- ReaderCase の書式化（画面は entity.reader だけを読む）-------------------------------
// 文言は src/shared/ui-strings.ts が持つ。ここは値の並べ替えと書式だけ。

const trimNum = (n: number, digits = 2): string => String(Number(n.toFixed(digits)));
const groupNum = (n: number): string => Math.round(n).toLocaleString('en-US');

/** 金額・数量を、通貨は変えずに読める形にする。 */
export function formatMetricAmount(m: Pick<ReaderMetric, 'amount' | 'currency' | 'unit'>): string {
  const sign = m.amount < 0 ? '-' : '';
  const abs = Math.abs(m.amount);
  if (m.currency === 'JPY') {
    if (abs >= 1e8) return `${sign}${trimNum(abs / 1e8)}億円`;
    if (abs >= 1e4) return `${sign}${trimNum(abs / 1e4, 1)}万円`;
    return `${sign}${groupNum(abs)}円`;
  }
  if (m.currency) {
    const symbol = m.currency === 'USD' ? '$' : `${m.currency} `;
    if (abs >= 1e9) return `${sign}${symbol}${trimNum(abs / 1e9)}B`;
    if (abs >= 1e6) return `${sign}${symbol}${trimNum(abs / 1e6)}M`;
    if (abs >= 1e4) return `${sign}${symbol}${trimNum(abs / 1e3, 1)}K`;
    return `${sign}${symbol}${groupNum(abs)}`;
  }
  return `${sign}${abs >= 1e4 ? groupNum(abs) : trimNum(abs)}${m.unit ?? ''}`;
}

export function metricMeasureLabel(m: Pick<ReaderMetric, 'measure' | 'label'>): string {
  return m.measure === 'OTHER' && m.label ? m.label : MEASURE_LABELS[m.measure];
}

/** 一覧用の見出し。売上は期間の種類で「月商」「年商」「累計売上」「年換算売上」に呼び分ける（それ以外は metricMeasureLabel と同じ）。 */
export function metricListLabel(m: Pick<ReaderMetric, 'measure' | 'label' | 'periodKind'>): string {
  if (m.measure !== 'REVENUE') return metricMeasureLabel(m);
  if (m.periodKind === 'MONTH') return UI.REVENUE_MONTH;
  if (m.periodKind === 'FISCAL_YEAR' || m.periodKind === 'YEAR') return UI.REVENUE_YEAR;
  if (m.periodKind === 'CUMULATIVE') return UI.REVENUE_CUMULATIVE;
  if (m.label && /ARR|年間経常/.test(m.label)) return UI.REVENUE_ARR;
  return metricMeasureLabel(m);
}

/** 「推定」は origin=ESTIMATED の時だけ。 */
export function metricOriginLabel(m: Pick<ReaderMetric, 'origin'>): string {
  return ORIGIN_LABELS[m.origin];
}

/** 画面に出す印。出どころ（本人申告・記事など）は画面に出さず、推定の時だけ「推定」と出す。 */
export function metricEstimateLabel(m: Pick<ReaderMetric, 'origin'>): string {
  return m.origin === 'ESTIMATED' ? ORIGIN_LABELS.ESTIMATED : '';
}

/** 新しさは数字が指す時点（年・月）で比べる。文字列の並びで比べると「累計（…）」と「2022年…」の比較が壊れる */
const recency = (m: ReaderMetric): string => metricWhen(m) ?? '';

/** 一覧に出す1件。売上を優先順位で選び、無ければ売却額・調達額などをその名前で出す。 */
export function pickListMetric(reader: ReaderCase | undefined | null): ReaderMetric | null {
  if (!reader || reader.metrics.length === 0) return null;
  const rank = metricRank;
  // 同じ時点なら金額の大きい方（このラウンドとそれ以前の合計が並ぶ時など）
  const newest = (list: ReaderMetric[]): ReaderMetric => list.slice().sort((a, b) => rank(a) - rank(b) || recency(b).localeCompare(recency(a)) || b.amount - a.amount)[0];
  const revenue = reader.metrics.filter((m) => m.measure === 'REVENUE');
  if (revenue.length) return newest(revenue);
  for (const measure of ['EXIT_VALUE', 'FUNDING', 'VALUATION', 'NET_INCOME', 'OPERATING_INCOME', 'PROFIT', 'USERS', 'PRICE'] as const) {
    const list = reader.metrics.filter((m) => m.measure === measure);
    if (list.length) return newest(list);
  }
  return null;
}

/** 一覧の利益欄。営業利益 → 純利益 → 利益の順で、直近の1件。 */
export function pickProfitMetric(reader: ReaderCase | undefined | null): ReaderMetric | null {
  if (!reader) return null;
  for (const measure of ['OPERATING_INCOME', 'NET_INCOME', 'PROFIT'] as const) {
    const list = reader.metrics.filter((m) => m.measure === measure);
    if (list.length) return list.slice().sort((a, b) => metricRank(a) - metricRank(b) || recency(b).localeCompare(recency(a)))[0];
  }
  return null;
}

function metricRank(m: ReaderMetric): number {
  if (m.origin === 'ESTIMATED') return 3;
  if (m.origin === 'FILED' && (m.periodKind === 'FISCAL_YEAR' || m.periodKind === 'YEAR')) return 0;
  if ((m.origin === 'SELF_REPORTED' || m.origin === 'ARTICLE') && m.periodKind === 'MONTH') return 1;
  return 2;
}

/** 概要の事実（summaryFactId）。無ければ null。 */
export function readerSummaryFact(reader: ReaderCase | undefined | null): ReaderFact | null {
  if (!reader?.summaryFactId) return null;
  return reader.facts.find((f) => f.id === reader.summaryFactId) ?? null;
}

/** 一覧の事業説明: summaryFactId の事実の1文目。 */
export function firstSentence(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  const m = /^.*?(?:[。！？]|[.!?](?=\s|$))/u.exec(t);
  return (m ? m[0] : t).trim();
}

/** 同じ URL の出典は1つにする（最初のものを残す）。 */
export function dedupeReaderSources(sources: readonly ReaderSource[]): ReaderSource[] {
  const seen = new Set<string>();
  const out: ReaderSource[] = [];
  for (const s of sources) {
    const key = s.url.replace(/#.*$/, '').replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/**
 * AI に渡す事例の文脈。entity.reader の facts・metrics・unknowns だけから作る。
 * 旧い自由文（essence・strategy・tagline など）は渡さない。reader が無ければ null。
 */
export function readerContextText(name: string, reader: ReaderCase | undefined | null, kinds?: readonly ReaderFact['kind'][]): string | null {
  if (!reader) return null;
  const sources = new Map(reader.sources.map((s) => [s.id, s]));
  const lines: string[] = [`事例: ${name}`];
  const facts = reader.facts.filter((f) => !kinds || kinds.includes(f.kind));
  for (const f of facts) lines.push(`事実(${sources.get(f.sourceId)?.publisher ?? '出典不明'}): ${f.text}`);
  if (!kinds || kinds.includes('DESCRIPTION') || kinds.includes('PRICING')) {
    for (const m of reader.metrics) {
      lines.push(`数値: ${metricMeasureLabel(m)} ${m.period} ${formatMetricAmount(m)}（${metricOriginLabel(m)}${m.basis ? `・${m.basis}` : ''}・${sources.get(m.sourceId)?.publisher ?? '出典不明'}）`);
    }
  }
  if (reader.unknowns.length) lines.push(`未確認: ${reader.unknowns.map((u) => UNKNOWN_LABELS[u]).join('・')}`);
  return lines.join('\n');
}

/**
 * 事実の文末の「〜と説明。」「〜と記載している。」を画面では省く。
 * 誰が言ったかは出典の番号が示すので、本文には要らない（読む邪魔になる）。保存データは変えない。
 * 省いた後に文として成り立たなくなる時（「〜と」の前が空など）は元のまま返す。
 */
const REPORTING_TAIL = /(?:と|として|とも|とを)(?:創業者が|公式資料に|掲載ページに)?(?:説明|案内|記載|記している|記し|表示|述べている|述べ|紹介|書いている|明記|示している|伝えている|投稿|報じている|答えている|注記|報告|定めている|挙げている)(?:している|されている|ている)?。?$/;
export function plainFactText(text: string): string {
  const trimmed = text.trim();
  const cut = trimmed.replace(REPORTING_TAIL, '');
  if (cut === trimmed || cut.length < 8) return text;
  return /[。.!?]$/.test(cut) ? cut : `${cut}。`;
}

/**
 * 本文の外貨の金額に、円のおおよその額を添える（「月99ドル」→「月99ドル（約1万4,850円）」、「$10」→「$10（約1,500円）」）。
 * 為替は docs/CASE_TEXT_STANDARD.md の固定の概算（1ドル=150円・1ユーロ=165円・1ポンド=195円・1ルピー=1.75円）。
 * 通貨は日本語の名前（ドル）・記号（$・€・£・₹）・ISO の略号（USD・EUR・GBP・INR）のどれでもよい。
 * 米ドル以外のドル（CA$・A$ など）は換算しない。すぐ後ろに円の額がある金額には足さない（二重にしない）。すぐ後ろに円の無い括弧の補足があれば、その括弧の頭に入れる。保存データは変えない。
 */
const CURRENCY_YEN: Array<[RegExp, number]> = [[/^(?:ドル|US\$|\$|USD)$/, 150], [/^(?:ユーロ|€|EUR)$/, 165], [/^(?:ポンド|£|GBP)$/, 195], [/^(?:ルピー|₹|INR)$/, 1.75]];
const NUM = '[0-9][0-9,]*(?:\\.[0-9]+)?';
const RANGE = '\\s?[〜~～\\-–—]\\s?';
const PRE_CUR = '(?:US\\$|\\$|€|£|₹|(?:USD|EUR|GBP|INR)\\s?)';
// 桁: 億・万、k・K・M・B、MM・mn・bn・m、million・billion・thousand（前に空白があってもよい）
const PRE_SCALE = '(?:億|万|\\s?(?:million|billion|thousand)(?![A-Za-z])|(?:MM|mn|bn|[kKmMB])(?![A-Za-z]))';
// 範囲（「$10–$50」「$10-50」「29〜99ドル」）は両端をまとめて1つの金額として拾い、円も範囲で添える
const FOREIGN_AMOUNT = new RegExp(
  `(?<pc>${PRE_CUR})(?<pn>${NUM})(?<ps>${PRE_SCALE})?(?:${RANGE}(?:${PRE_CUR})?(?<pn2>${NUM})(?<ps2>${PRE_SCALE})?)?`
  + `|(?:(?<sn0>${NUM})\\s?(?<ss0>${PRE_SCALE})?${RANGE})?(?<sn>${NUM})\\s?(?<ss>${PRE_SCALE})?\\s?(?<sc>ドル|ユーロ|ポンド|ルピー|USD|EUR|GBP|INR)(?![A-Za-z])`, 'g');
const SCALE: Record<string, number> = { 億: 1e8, 万: 1e4, k: 1e3, K: 1e3, M: 1e6, B: 1e9, m: 1e6, MM: 1e6, mn: 1e6, bn: 1e9, million: 1e6, billion: 1e9, thousand: 1e3 };
export function yenText(yen: number): string {
  const n = Math.round(yen);
  if (n >= 1e8) return `${trimNum(n / 1e8, 1)}億円`;
  if (n >= 1e4) {
    // 先に10円単位へ丸めてから万と端数に分ける（19,995円 → 2万円。「1万10,000円」にしない）
    const r = Math.round(n / 10) * 10;
    const man = Math.floor(r / 1e4);
    const rest = r % 1e4;
    return rest === 0 ? `${man.toLocaleString('en-US')}万円` : `${man.toLocaleString('en-US')}万${rest.toLocaleString('en-US')}円`;
  }
  return `${n.toLocaleString('en-US')}円`;
}
export function withYenApprox(text: string): string {
  const out: string[] = [];
  let last = 0;
  for (const m of text.matchAll(FOREIGN_AMOUNT)) {
    const g = m.groups ?? {};
    const match = m[0];
    const end = (m.index ?? 0) + match.length;
    const rest = text.slice(end);
    const currency = (g.pc ?? g.sc ?? '').trim();
    const rate = CURRENCY_YEN.find(([re]) => re.test(currency))?.[1];
    // 米ドル以外のドル（CA$・A$・NZ$・HK$・S$ や「$39 CAD」）は、為替の基準に無いので換算しない
    if (g.pc && /[A-Za-z]$/.test(text.slice(0, m.index ?? 0)) && !/^US/.test(g.pc)) continue;
    if (/^\s?(?:CAD|AUD|NZD|HKD|SGD|MXN|TWD)(?![A-Za-z])/.test(rest)) continue;
    const value = (num: string, scale: string | undefined) => Number(num.replace(/,/g, '')) * (SCALE[(scale ?? '').trim()] ?? 1);
    const amount = g.pn ? value(g.pn, g.ps) : value(g.sn, g.ss);
    // 範囲の下端。後ろに桁（万・k など）が付くのが上端だけの時は、下端にも同じ桁を当てる（「1〜2万ドル」）
    // ただし桁を当てると下端が上端を超える時（「$900〜1K」「$2,500〜3K」）は、下端は書かれたままの額にする
    const lowOf = (num: string, own: string | undefined, upperNum: string, upperScale: string | undefined) => {
      if (own || !upperScale) return value(num, own);
      const inherited = value(num, upperScale);
      return inherited <= value(upperNum, upperScale) ? inherited : value(num, undefined);
    };
    const low = g.pn2 ? lowOf(g.pn, g.ps, g.pn2, g.ps2) : g.sn0 ? lowOf(g.sn0, g.ss0, g.sn, g.ss) : null;
    const high = g.pn2 ? value(g.pn2, g.ps2) : amount;
    if (!rate || !Number.isFinite(high) || high <= 0 || (low !== null && (!Number.isFinite(low) || low <= 0))) continue;
    // 金額のすぐ後ろに英字が続く（読めない桁や別の単位）時は、数字の頭だけを換算しない
    if (/^[A-Za-z]/.test(rest)) continue;
    // すぐ後ろが円の額、または円の額を含む括弧なら、もう換算してある
    if (/^[、,\s]*(?:約|およそ)?[0-9][0-9,.万億]*円/.test(rest) || /^\s*[（(][^）)]*円/.test(rest)) continue;
    // 金額の直前がマイナス記号（-$10・−$10・▲$10）なら、円の額にも同じ符号を付ける（赤字を黒字に見せない）
    const neg = /(?:^|[^0-9A-Za-z])[-−▲△]$/.test(text.slice(0, m.index ?? 0));
    const sg = neg ? '−' : '';
    const yen = low !== null ? `約${sg}${yenText(low * rate)}〜${sg}${yenText(high * rate)}` : `約${sg}${yenText(high * rate)}`;
    const paren = rest.match(/^\s*[（(]/);
    out.push(text.slice(last, end), paren ? `${paren[0]}${yen}、` : `（${yen}）`);
    last = end + (paren ? paren[0].length : 0);
  }
  out.push(text.slice(last));
  return out.join('');
}

/** 画面に出す文の仕上げ: 出どころの印を外し、外貨の金額に円の概算を添える（どの欄の文にも同じ処理を通す）。 */
export function screenText(text: string): string {
  return withYenApprox(stripOriginTag(text));
}

/** 推測の文末「〜とみる。」「〜と見る。」「〜と推す。」を画面では省く（読む邪魔になるだけ）。前が短すぎる時は元のまま。 */
const HEDGE_TAIL = /(?:と|ものと|ように)(?:みる|見る|みられる|見られる|推す|推測する|推測される|考えられる|考える|思われる)。?$/;
export function plainAnalysisText(text: string): string {
  const trimmed = text.trim();
  const cut = trimmed.replace(HEDGE_TAIL, '');
  if (cut === trimmed || cut.length < 8) return text;
  return /[。.!?]$/.test(cut) ? cut : `${cut}。`;
}

/**
 * 名前の横に出す分野の札。事業を説明する一文（tagline）の語尾から決める。決められなければ null（出さない）。
 * 上から順に当てる。「サービス」だけの語尾は分野が決まらないので出さない。
 */
const GENRE_RULES: Array<[RegExp, keyof typeof GENRE_LABELS]> = [
  [/拡張(機能)?$|プラグイン$/, 'EXTENSION'],
  [/アプリ$/, 'APP'],
  [/API$|基盤$|データベース$|プロキシサービス$/, 'API'],
  [/AI(サービス|ツール|チャット|スタジオ|従業員|販売担当|動画サービス|画像編集サービス)?$|AI[^。]{0,12}(サービス|スタジオ)$/, 'AI'],
  [/通販$|ショップ$|マーケットプレイス$|ショッピングサイト$/, 'SHOP'],
  [/サービス$|サービスの(案内|販売)$|SaaS$|CRM$|CMS$|クラウド$|道具$|ツール集$|部品集$|ランチャー$|ワークスペース$|エディター$|ナレッジベース$|ツール$|ソフト$|システム$|ビルダー$|エディタ$|クライアント$|ERP$|解析$|プラットフォーム$|アシスタント$|ボード$|PaaS）?$|チェックリスト$|エラー追跡と性能監視$|ボイラープレート$|仕組み$/, 'SOFTWARE'],
  [/サイト$|サイトHealthPally$|サイトを名乗る$|ページ$|ギャラリー$|ディレクトリ$|コミュニティ$|掲載$/, 'SITE'],
  [/代理店$|コンサルティング$|代行$|開発会社$|デザイン会社|事業者$|会社$|ブローカー$|企業$/, 'AGENCY'],
];
export function genreLabel(tagline: string | undefined | null): string | null {
  const t = (tagline ?? '').trim().split('。')[0].replace(/\s*[（(][^）)]*[）)]$/, '');
  for (const [re, key] of GENRE_RULES) if (re.test(t)) return GENRE_LABELS[key];
  return null;
}
