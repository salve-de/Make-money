/**
 * reportedMetrics[].unit（93種類）を ReaderCase の measure と periodKind に対応させる表。
 * 対応の無い unit は例外（黙って捨てない）。金額は原文の通貨のまま持つ。12で割らない。円に換算しない。
 */
import type { MEASURES, PERIOD_KINDS } from '../../src/shared/reader-case';

export type Measure = (typeof MEASURES)[number];
export type PeriodKind = (typeof PERIOD_KINDS)[number];

export interface UnitSpec {
  measure: Measure;
  periodKind: PeriodKind;
  /** period が原文に無い時の既定の期間名（その unit 自体が期間を含意する場合のみ）。POINT は時点になる。 */
  defaultPeriod?: string;
  /** measure=OTHER の時の中身の名前 */
  label?: string;
  /** 金額でなく数量の時の単位 */
  quantityUnit?: string;
  /** 数量（通貨なし）を持つ unit */
  quantity?: boolean;
  /** 金額のない unit（数値を持たなければ捨てる）。理由を返す */
  skipReason?: string;
}

const M = (measure: Measure, periodKind: PeriodKind, extra: Partial<UnitSpec> = {}): UnitSpec => ({ measure, periodKind, ...extra });

export const UNIT_MAP: Record<string, UnitSpec> = {
  // 売上（期間つき）
  MONTHLY_REVENUE: M('REVENUE', 'MONTH', { defaultPeriod: '月' }),
  MRR: M('REVENUE', 'MONTH', { defaultPeriod: '月（継続課金）' }),
  MONTHLY_RECURRING_REVENUE: M('REVENUE', 'MONTH', { defaultPeriod: '月（継続課金）' }),
  MRR_AS_STATED: M('REVENUE', 'MONTH', { defaultPeriod: '月（継続課金）' }),
  MONTHLY_CONTRACT_VALUE: M('REVENUE', 'MONTH', { defaultPeriod: '月', label: '顧客1件の月額契約' }),
  MONTHLY_AFFILIATE_REVENUE: M('REVENUE', 'MONTH', { defaultPeriod: '月', label: '紹介収入' }),
  MONTHLY_INCOME: M('REVENUE', 'MONTH', { defaultPeriod: '月', label: '月の収入' }),
  MONTHLY_AMOUNT_UNSPECIFIED: M('REVENUE', 'MONTH', { defaultPeriod: '月' }),
  REPORTED_REVENUE: M('REVENUE', 'MONTH', { defaultPeriod: '月' }),
  ANNUAL_REVENUE: M('REVENUE', 'YEAR', { defaultPeriod: '年' }),
  ANNUAL_INCOME: M('REVENUE', 'YEAR', { defaultPeriod: '年', label: '年の収入' }),
  ANNUAL_REVENUE_FORECAST: M('REVENUE', 'YEAR', { defaultPeriod: '年（見込み）' }),
  ARR: M('REVENUE', 'YEAR', { defaultPeriod: '年（継続課金）' }),
  ARR_FIRST_RECURRING_CUSTOMER: M('REVENUE', 'YEAR', { defaultPeriod: '年（継続課金）', label: '最初の継続顧客の年額' }),
  WEEKLY_REVENUE: M('REVENUE', 'TRAILING_DAYS', { defaultPeriod: '週' }),
  DAILY_REVENUE: M('REVENUE', 'TRAILING_DAYS', { defaultPeriod: '日' }),
  REVENUE_LAST_30_DAYS: M('REVENUE', 'TRAILING_DAYS', { defaultPeriod: '直近30日' }),
  LAST_30_DAYS_REVENUE: M('REVENUE', 'TRAILING_DAYS', { defaultPeriod: '直近30日' }),
  REVENUE_LAST_28_DAYS: M('REVENUE', 'TRAILING_DAYS', { defaultPeriod: '直近28日' }),
  TRAILING_12_MONTHS_REVENUE: M('REVENUE', 'YEAR', { defaultPeriod: '直近12か月' }),
  TTM_REVENUE: M('REVENUE', 'YEAR', { defaultPeriod: '直近12か月' }),
  BEST_MONTH_REVENUE: M('REVENUE', 'MONTH', { defaultPeriod: '最高月' }),
  PERIOD_REVENUE: M('REVENUE', 'CUMULATIVE'),
  REVENUE_PERIOD: M('REVENUE', 'CUMULATIVE'),
  REVENUE_PERIOD_UNSPECIFIED: M('REVENUE', 'CUMULATIVE', { defaultPeriod: '期間の指定なし' }),
  REVENUE: M('REVENUE', 'CUMULATIVE'),
  CUMULATIVE_REVENUE: M('REVENUE', 'CUMULATIVE', { defaultPeriod: '累計' }),
  CUMULATIVE_REVENUE_LOWER_BOUND: M('REVENUE', 'CUMULATIVE', { defaultPeriod: '累計' }),
  LIFETIME_REVENUE: M('REVENUE', 'CUMULATIVE', { defaultPeriod: '累計' }),
  CUMULATIVE_SALES: M('REVENUE', 'CUMULATIVE', { defaultPeriod: '累計' }),
  CUMULATIVE_ROYALTIES: M('REVENUE', 'CUMULATIVE', { defaultPeriod: '累計', label: '印税' }),
  ROYALTIES: M('REVENUE', 'CUMULATIVE', { label: '印税' }),
  LAUNCH_PERIOD_REVENUE: M('REVENUE', 'CUMULATIVE'),
  REVENUE_FIRST_MONTH_AFTER_LAUNCH: M('REVENUE', 'CUMULATIVE', { defaultPeriod: '発売後1か月' }),
  REVENUE_FIRST_7_WEEKS: M('REVENUE', 'CUMULATIVE', { defaultPeriod: '公開から7週間' }),
  REVENUE_AFTER_12_MONTHS_OF_OPERATION: M('REVENUE', 'CUMULATIVE', { defaultPeriod: '運営12か月後' }),
  FIRST_MONTH_REVENUE: M('REVENUE', 'CUMULATIVE', { defaultPeriod: '発売後約1か月' }),
  FIRST_WEEK_REVENUE: M('REVENUE', 'CUMULATIVE', { defaultPeriod: '発売初週' }),
  PRESALE_REVENUE: M('REVENUE', 'CUMULATIVE', { label: '予約の売上' }),
  ONE_OFF_REVENUE: M('REVENUE', 'CUMULATIVE', { label: '単発ライセンスの売上' }),
  DAILY_SALES_PEAK: M('REVENUE', 'TRAILING_DAYS', { defaultPeriod: '日（最高日）' }),
  SINGLE_TRANSACTION: M('OTHER', 'POINT', { label: '1件の取引額' }),
  GROSS_BOOKING_VALUE_MONTHLY: M('OTHER', 'MONTH', { defaultPeriod: '月', label: '月間の総取扱額（予約ベース）' }),
  GMV: M('OTHER', 'CUMULATIVE', { label: '総取扱額（GMV）' }),
  // 利益
  MONTHLY_PROFIT: M('PROFIT', 'MONTH', { defaultPeriod: '月' }),
  PERIOD_PROFIT: M('PROFIT', 'CUMULATIVE'),
  ANNUAL_PROFIT: M('PROFIT', 'YEAR', { defaultPeriod: '年' }),
  TTM_PROFIT: M('PROFIT', 'YEAR', { defaultPeriod: '直近12か月' }),
  CUMULATIVE_PROFIT: M('PROFIT', 'CUMULATIVE', { defaultPeriod: '累計' }),
  ANNUAL_OPERATING_INCOME: M('OPERATING_INCOME', 'FISCAL_YEAR'),
  ANNUAL_OPERATING_PROFIT: M('OPERATING_INCOME', 'FISCAL_YEAR'),
  OPERATING_PROFIT: M('OPERATING_INCOME', 'FISCAL_YEAR'),
  ANNUAL_NET_INCOME: M('NET_INCOME', 'FISCAL_YEAR'),
  NET_PROFIT: M('NET_INCOME', 'FISCAL_YEAR'),
  EBIT: M('OPERATING_INCOME', 'FISCAL_YEAR', { label: 'EBIT（非GAAP）' }),
  // 年次開示。measure は unitLabel／original で決める（resolveByLabel）
  ANNUAL_REPORTED: M('REVENUE', 'FISCAL_YEAR'),
  JPY: M('REVENUE', 'FISCAL_YEAR'),
  TWD: M('REVENUE', 'FISCAL_YEAR'),
  USD: M('REVENUE', 'FISCAL_YEAR'),
  CAD: M('REVENUE', 'FISCAL_YEAR'),
  // 価格・費用・資金
  PRICE: M('PRICE', 'POINT'),
  COST: M('COST', 'POINT'),
  MONTHLY_EXPENSES: M('COST', 'MONTH', { defaultPeriod: '月' }),
  EXIT_VALUE: M('EXIT_VALUE', 'POINT'),
  ACQUISITION_PRICE: M('EXIT_VALUE', 'POINT'),
  FUNDING: M('FUNDING', 'POINT'),
  FUNDING_RAISED: M('FUNDING', 'POINT'),
  GRANT_FUNDING_PEAK_MONTHLY: M('FUNDING', 'MONTH', { defaultPeriod: '月（ピーク）', label: '助成金' }),
  PRIZE: M('OTHER', 'POINT', { label: '賞金' }),
  OTHER_AMOUNT: M('OTHER', 'POINT', { label: '金額' }),
  REPORTED_MONEY_SIGNAL: M('OTHER', 'CUMULATIVE', { label: '申告された金額' }),
  // 数量
  USER_COUNT: M('USERS', 'POINT', { quantity: true, quantityUnit: '人' }),
  PAID_USER_COUNT: M('USERS', 'POINT', { quantity: true, quantityUnit: '人', label: '有料利用者数' }),
  PAID_ANNUAL_SUBSCRIBER_COUNT: M('USERS', 'POINT', { quantity: true, quantityUnit: '人', label: '年額の有料購読者数' }),
  SUBSCRIBER_COUNT: M('USERS', 'POINT', { quantity: true, quantityUnit: '人', label: '購読者数' }),
  CUSTOMER_COUNT: M('USERS', 'POINT', { quantity: true, quantityUnit: '社', label: '顧客数' }),
  MONTHLY_ACTIVE_USERS: M('USERS', 'MONTH', { quantity: true, quantityUnit: '人', defaultPeriod: '月', label: '月間の利用者数' }),
  ACTIVE_TEAMS: M('USERS', 'POINT', { quantity: true, quantityUnit: 'チーム', label: '稼働チーム数' }),
  MONTHLY_READERS: M('USERS', 'MONTH', { quantity: true, quantityUnit: '人', defaultPeriod: '月', label: '月間の読者数' }),
  MONTHLY_VISITORS: M('USERS', 'MONTH', { quantity: true, quantityUnit: '人', defaultPeriod: '月', label: '月間の訪問者数' }),
  HEADCOUNT: M('OTHER', 'POINT', { quantity: true, quantityUnit: '人', label: '従業員数' }),
  ORDER_COUNT: M('OTHER', 'POINT', { quantity: true, quantityUnit: '件', label: '注文数' }),
  PAGE_VIEWS: M('OTHER', 'POINT', { quantity: true, quantityUnit: '回', label: 'ページ閲覧数' }),
  CONTRACT_COUNT: M('OTHER', 'POINT', { quantity: true, quantityUnit: '件', label: '契約数' }),
  LICENSE_COUNT: M('OTHER', 'POINT', { quantity: true, quantityUnit: '件', label: '販売ライセンス数' }),
  DOWNLOAD_COUNT: M('OTHER', 'CUMULATIVE', { quantity: true, quantityUnit: '回', label: 'ダウンロード数' }),
  BUSINESSES_LAUNCHED: M('OTHER', 'CUMULATIVE', { quantity: true, quantityUnit: '件', label: '立ち上げた事業数' }),
  BOTS_CREATED_CUMULATIVE: M('OTHER', 'CUMULATIVE', { quantity: true, quantityUnit: '個', label: '作られたボット数' }),
  // 比率・倍率（金額でも数量でもない。amount を持つ時だけ）
  GROSS_MARGIN_PERCENT: M('OTHER', 'POINT', { quantity: true, quantityUnit: '%', label: '粗利率' }),
  PROFIT_MARGIN_PERCENT: M('OTHER', 'POINT', { quantity: true, quantityUnit: '%', label: '利益率' }),
  CHURN_PERCENT_MONTHLY: M('OTHER', 'MONTH', { quantity: true, quantityUnit: '%', defaultPeriod: '月', label: '月間の解約率' }),
  REVENUE_GROWTH_PERCENT: M('OTHER', 'YEAR', { quantity: true, quantityUnit: '%', label: '売上の伸び率' }),
  MRR_MULTIPLIER: M('OTHER', 'TRAILING_DAYS', { quantity: true, quantityUnit: '倍', defaultPeriod: '直近30日', label: '継続課金売上の倍率' }),
  // 範囲・状態（単一の amount にならない）
  ANNUAL_REVENUE_RANGE: M('REVENUE', 'YEAR', { skipReason: '範囲表記で単一の金額でない' }),
  MONTHLY_REVENUE_RANGE: M('REVENUE', 'MONTH', { skipReason: '範囲表記で単一の金額でない' }),
  EXIT_PRICE_BAND: M('EXIT_VALUE', 'POINT', { skipReason: '価格帯の表記で単一の金額でない' }),
  REVENUE_STATUS: M('REVENUE', 'POINT', { skipReason: '状態の表記で金額でない' }),
};

export function unitSpecFor(unit: string): UnitSpec {
  const spec = UNIT_MAP[unit];
  if (!spec) throw new Error(`reader-case: unit-map に対応が無い unit: ${unit}`);
  return spec;
}

/** 年次開示の unit（unitLabel／original の語で measure を決める）。 */
export const LABEL_DRIVEN_UNITS = new Set(['ANNUAL_REPORTED', 'JPY', 'TWD', 'USD', 'CAD']);

export function measureFromLabel(text: string): Measure | null {
  if (/営業利益|営業損益|営業損失/.test(text)) return 'OPERATING_INCOME';
  if (/純利益|当期利益|純損益|純損失|親会社/.test(text)) return 'NET_INCOME';
  if (/売上高|売上収益|純収益|営業収益|純売上|売上/.test(text)) return 'REVENUE';
  if (/^EBIT/i.test(text)) return 'OPERATING_INCOME';
  return null;
}
