import {
  BUSINESS_SALE_CATEGORIES,
  BUSINESS_SALE_LIMITS,
  BUSINESS_SALE_REQUESTABLE_STATUSES,
  BUSINESS_SALE_STATUSES,
  type BusinessSaleCategory,
  type BusinessSaleFields,
  type BusinessSaleRequestedStatus,
  type BusinessSaleStatus,
} from './business-sale';

/**
 * 事業の売買の入力検証。サーバー（正本）と画面（事前チェック）で同じ関数を使う。
 * 受け付けるのは決まったキーだけ。URL 欄はなく、URL 文字列（https:// など）も本文に入れさせない。
 */
export type ParseResult<T> = { ok: true; value: T } | { ok: false; field: string; message: string };

function fail(field: string, message: string): { ok: false; field: string; message: string } {
  return { ok: false, field, message };
}

/** 絵文字などの合成文字も 1 文字として数える（SQLite の length() と同じ数え方）。 */
export function charLength(value: string): number {
  return Array.from(value).length;
}

/**
 * 制御文字・見えない文字・文字の向きを変える文字・対にならないサロゲートは受け付けない。
 * 偽装や見えない文字列に使えるため。改行とタブは複数行の欄でだけ許す。
 */
function hasUnsafeCharacter(value: string, allowLineBreaks: boolean): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code === 0x0a || code === 0x09) {
      if (!allowLineBreaks) return true;
      continue;
    }
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
    if (code >= 0xd800 && code <= 0xdfff) return true;
    if (
      (code >= 0x200b && code <= 0x200f)
      || code === 0x2028 || code === 0x2029
      || (code >= 0x202a && code <= 0x202e)
      || (code >= 0x2060 && code <= 0x2064)
      || (code >= 0x2066 && code <= 0x2069)
      || code === 0xfeff
    ) return true;
  }
  return false;
}

interface TextSpec {
  field: string;
  label: string;
  min: number;
  max: number;
  multiline: boolean;
  noUrl: boolean;
}

const TEXT = {
  title: { field: 'title', label: '事業名', min: BUSINESS_SALE_LIMITS.titleMin, max: BUSINESS_SALE_LIMITS.titleMax, multiline: false, noUrl: true },
  summary: { field: 'summary', label: '事業の説明', min: 0, max: BUSINESS_SALE_LIMITS.summaryMax, multiline: true, noUrl: true },
  reasonForSale: { field: 'reasonForSale', label: '手放す理由', min: 0, max: BUSINESS_SALE_LIMITS.reasonMax, multiline: true, noUrl: true },
  includedAssets: { field: 'includedAssets', label: '引き渡すもの', min: 0, max: BUSINESS_SALE_LIMITS.assetsMax, multiline: true, noUrl: true },
  sellerName: { field: 'sellerName', label: '掲載者名', min: 0, max: BUSINESS_SALE_LIMITS.sellerNameMax, multiline: false, noUrl: true },
  inquiryMessage: { field: 'message', label: '問い合わせ内容', min: BUSINESS_SALE_LIMITS.inquiryMessageMin, max: BUSINESS_SALE_LIMITS.inquiryMessageMax, multiline: true, noUrl: false },
} satisfies Record<string, TextSpec>;

function readText(raw: unknown, spec: TextSpec): ParseResult<string> {
  if (raw === undefined) return fail(spec.field, `${spec.label}を入力してください`);
  if (typeof raw !== 'string') return fail(spec.field, `${spec.label}は文字で入力してください`);
  const text = raw.replace(/\r\n?/g, '\n').trim();
  if (hasUnsafeCharacter(text, spec.multiline)) return fail(spec.field, `${spec.label}に使えない文字が含まれています`);
  const length = charLength(text);
  if (length < spec.min) {
    return fail(spec.field, spec.min <= 1 ? `${spec.label}を入力してください` : `${spec.label}は${spec.min}文字以上で入力してください`);
  }
  if (length > spec.max) return fail(spec.field, `${spec.label}は${spec.max}文字以内で入力してください`);
  if (spec.noUrl && text.includes('://')) return fail(spec.field, `${spec.label}にURL（https:// など）は入力できません`);
  return { ok: true, value: text };
}

function readInteger(raw: unknown, field: string, label: string, min: number, max: number): ParseResult<number> {
  if (raw === undefined) return fail(field, `${label}を入力してください`);
  if (typeof raw !== 'number' || !Number.isSafeInteger(raw)) return fail(field, `${label}は整数で入力してください`);
  if (raw < min || raw > max) {
    return fail(field, `${label}は${min.toLocaleString('ja-JP')}以上${max.toLocaleString('ja-JP')}以下で入力してください`);
  }
  return { ok: true, value: raw };
}

export function isBusinessSaleCategory(value: unknown): value is BusinessSaleCategory {
  return typeof value === 'string' && (BUSINESS_SALE_CATEGORIES as readonly string[]).includes(value);
}

export function isBusinessSaleStatus(value: unknown): value is BusinessSaleStatus {
  return typeof value === 'string' && (BUSINESS_SALE_STATUSES as readonly string[]).includes(value);
}

/** 掲載者が送れる状態か。published・rejected は運営者の審査でだけ付くので、ここでは受け付けない。 */
export function isRequestedBusinessSaleStatus(value: unknown): value is BusinessSaleRequestedStatus {
  return typeof value === 'string' && (BUSINESS_SALE_REQUESTABLE_STATUSES as readonly string[]).includes(value);
}

function readCategory(raw: unknown): ParseResult<BusinessSaleCategory> {
  if (raw === undefined) return fail('category', '区分を選んでください');
  if (!isBusinessSaleCategory(raw)) return fail('category', '区分が正しくありません');
  return { ok: true, value: raw };
}

/** 日本時間の現在の西暦。開始年に未来の年を入れさせない。 */
function currentJstYear(now: Date): number {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCFullYear();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

type FieldKey = keyof BusinessSaleFields;

const FIELD_KEYS: readonly FieldKey[] = [
  'title', 'summary', 'category', 'establishedYear', 'monthlyRevenueJpy', 'monthlyProfitJpy',
  'askingPriceJpy', 'reasonForSale', 'includedAssets', 'sellerName',
];
const CREATE_KEYS: ReadonlySet<string> = new Set(FIELD_KEYS);
const UPDATE_KEYS: ReadonlySet<string> = new Set([...FIELD_KEYS, 'status']);
/** 作成時に省略できる文章欄（省略したら空文字） */
const OPTIONAL_ON_CREATE: ReadonlySet<FieldKey> = new Set<FieldKey>(['summary', 'reasonForSale', 'includedAssets', 'sellerName']);

const READERS: { [K in FieldKey]: (raw: unknown, now: Date) => ParseResult<BusinessSaleFields[K]> } = {
  title: (raw) => readText(raw, TEXT.title),
  summary: (raw) => readText(raw, TEXT.summary),
  category: (raw) => readCategory(raw),
  establishedYear: (raw, now) => readInteger(raw, 'establishedYear', '開始年', BUSINESS_SALE_LIMITS.establishedYearMin, currentJstYear(now)),
  monthlyRevenueJpy: (raw) => readInteger(raw, 'monthlyRevenueJpy', '月商（円）', 0, BUSINESS_SALE_LIMITS.monthlyAmountMax),
  monthlyProfitJpy: (raw) => readInteger(raw, 'monthlyProfitJpy', '月の利益（円）', 0, BUSINESS_SALE_LIMITS.monthlyAmountMax),
  askingPriceJpy: (raw) => readInteger(raw, 'askingPriceJpy', '希望価格（円）', 0, BUSINESS_SALE_LIMITS.askingPriceMax),
  reasonForSale: (raw) => readText(raw, TEXT.reasonForSale),
  includedAssets: (raw) => readText(raw, TEXT.includedAssets),
  sellerName: (raw) => readText(raw, TEXT.sellerName),
};

/** 複数の項目にまたがる矛盾。利益が月商を超える掲載は、桁や欄の取り違えとして止める。 */
function crossFieldProblem(fields: Pick<BusinessSaleFields, 'monthlyRevenueJpy' | 'monthlyProfitJpy'>): { field: string; message: string } | null {
  if (fields.monthlyProfitJpy > fields.monthlyRevenueJpy) {
    return { field: 'monthlyProfitJpy', message: '月の利益は月商より大きくできません。桁や入力欄を確認してください' };
  }
  return null;
}

/** 下書きの作成。事業名・区分・開始年・3つの金額が必須で、文章欄は空でもよい。 */
export function parseBusinessSaleCreate(value: unknown, now: Date = new Date()): ParseResult<BusinessSaleFields> {
  const row = asRecord(value);
  if (!row) return fail('body', '送信内容が正しくありません');
  const unknownKey = Object.keys(row).find((key) => !CREATE_KEYS.has(key));
  if (unknownKey) return fail(unknownKey, '指定できない項目が含まれています');

  const parsed: Record<string, unknown> = {};
  for (const key of FIELD_KEYS) {
    if (row[key] === undefined && OPTIONAL_ON_CREATE.has(key)) {
      parsed[key] = '';
      continue;
    }
    const result = READERS[key](row[key], now);
    if (!result.ok) return result;
    parsed[key] = result.value;
  }
  const fields = parsed as unknown as BusinessSaleFields;
  const problem = crossFieldProblem(fields);
  return problem ? fail(problem.field, problem.message) : { ok: true, value: fields };
}

export interface BusinessSaleUpdateInput extends Partial<BusinessSaleFields> {
  status?: BusinessSaleRequestedStatus;
}

/** 更新。送られた項目だけを検証する。空の更新や、決められた以外のキーは受け付けない。 */
export function parseBusinessSaleUpdate(value: unknown, now: Date = new Date()): ParseResult<BusinessSaleUpdateInput> {
  const row = asRecord(value);
  if (!row) return fail('body', '送信内容が正しくありません');
  const keys = Object.keys(row);
  const unknownKey = keys.find((key) => !UPDATE_KEYS.has(key));
  if (unknownKey) return fail(unknownKey, '指定できない項目が含まれています');
  if (keys.length === 0) return fail('body', '変更する項目がありません');

  const patch: Record<string, unknown> = {};
  for (const key of keys) {
    if (key === 'status') {
      if (!isRequestedBusinessSaleStatus(row.status)) return fail('status', '状態が正しくありません');
      patch.status = row.status;
      continue;
    }
    const result = READERS[key as FieldKey](row[key], now);
    if (!result.ok) return result;
    patch[key] = result.value;
  }
  return { ok: true, value: patch as BusinessSaleUpdateInput };
}

export type BusinessSaleSnapshot = BusinessSaleFields & { status: BusinessSaleStatus };

export type UpdatePlan =
  | { ok: true; next: BusinessSaleSnapshot; revenueChanged: boolean; contentChanged: boolean }
  | { ok: false; kind: 'invalid' | 'conflict'; field?: string; message: string };

/**
 * 掲載者が進められる状態の順序。公開（published）は運営者の審査でだけ付くので、ここには「published へ進む」道がない。
 * 下書き → 審査待ち →（運営者の承認）→ 公開中 → 募集終了。却下されたものは直して再び審査に出せる。
 */
const ALLOWED_TRANSITIONS: Record<BusinessSaleStatus, readonly BusinessSaleStatus[]> = {
  draft: ['draft', 'pending_review'],
  pending_review: ['pending_review', 'draft'],
  rejected: ['rejected', 'draft', 'pending_review'],
  published: ['published', 'closed'],
  closed: [],
};

/** 審査に出す（公開する）ときに満たす条件。買い手が判断できる最低限の説明があること。 */
export function findPublishProblem(fields: BusinessSaleFields): { field: string; message: string } | null {
  if (charLength(fields.summary) < BUSINESS_SALE_LIMITS.summaryPublishMin) {
    return { field: 'summary', message: `公開するには、事業の説明を${BUSINESS_SALE_LIMITS.summaryPublishMin}文字以上で書いてください` };
  }
  if (!fields.reasonForSale) return { field: 'reasonForSale', message: '公開するには、手放す理由を書いてください' };
  if (!fields.includedAssets) return { field: 'includedAssets', message: '公開するには、引き渡すものを書いてください' };
  return null;
}

/**
 * 現在の掲載と更新内容から、更新後の姿と状態遷移の可否を決める（DB を触らない純関数）。
 * 公開中の掲載の内容を書き換えたら、審査待ちに戻す（承認された内容と違うものを公開し続けない）。
 */
export function planBusinessSaleUpdate(current: BusinessSaleSnapshot, patch: BusinessSaleUpdateInput): UpdatePlan {
  if (current.status === 'closed') {
    return { ok: false, kind: 'conflict', message: '募集を終了した掲載は変更できません' };
  }
  const requested: BusinessSaleStatus = patch.status ?? current.status;
  if (!ALLOWED_TRANSITIONS[current.status].includes(requested)) {
    return { ok: false, kind: 'conflict', field: 'status', message: '状態は「下書き → 審査待ち → 公開中 → 募集終了」の順にだけ変えられます' };
  }
  const contentChanged = FIELD_KEYS.some((key) => key in patch && patch[key] !== current[key]);
  const nextStatus: BusinessSaleStatus = requested === 'published' && contentChanged ? 'pending_review' : requested;
  const next: BusinessSaleSnapshot = { ...current, ...patch, status: nextStatus };
  const problem = crossFieldProblem(next)
    ?? (nextStatus === 'pending_review' || nextStatus === 'published' ? findPublishProblem(next) : null);
  if (problem) return { ok: false, kind: 'invalid', field: problem.field, message: problem.message };
  return { ok: true, next, revenueChanged: next.monthlyRevenueJpy !== current.monthlyRevenueJpy, contentChanged };
}

const EMAIL_PATTERN = /^[a-z0-9._%+-]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

/** 連絡先メール。mailto: リンクに使っても余計な指定（?cc= など）が混ざらない形だけ通す。 */
export function normalizeContactEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length > BUSINESS_SALE_LIMITS.contactEmailMax || email.includes('..') || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export interface BusinessSaleInquiryInput {
  message: string;
  contactEmail: string;
}

export function parseBusinessSaleInquiry(value: unknown): ParseResult<BusinessSaleInquiryInput> {
  const row = asRecord(value);
  if (!row) return fail('body', '送信内容が正しくありません');
  const unknownKey = Object.keys(row).find((key) => key !== 'message' && key !== 'contactEmail');
  if (unknownKey) return fail(unknownKey, '指定できない項目が含まれています');
  const message = readText(row.message, TEXT.inquiryMessage);
  if (!message.ok) return message;
  // 未入力（キーなし・空欄）は「入力してください」、書いてあって形が違うものは「形式が正しくありません」
  if (row.contactEmail === undefined || (typeof row.contactEmail === 'string' && row.contactEmail.trim() === '')) {
    return fail('contactEmail', '連絡先のメールアドレスを入力してください');
  }
  const contactEmail = normalizeContactEmail(row.contactEmail);
  if (!contactEmail) return fail('contactEmail', 'メールアドレスの形式が正しくありません');
  return { ok: true, value: { message: message.value, contactEmail } };
}

export interface BusinessSaleFilter {
  category?: BusinessSaleCategory;
  maxPrice?: number;
}

/** 一覧の絞り込み。maxPrice は円、区分は BUSINESS_SALE_CATEGORIES のどれか。 */
export function parseBusinessSaleFilter(input: { category?: string | null; maxPrice?: string | null }): ParseResult<BusinessSaleFilter> {
  const filter: BusinessSaleFilter = {};
  if (input.category) {
    if (!isBusinessSaleCategory(input.category)) return fail('category', '区分が正しくありません');
    filter.category = input.category;
  }
  if (input.maxPrice) {
    if (!/^\d{1,12}$/.test(input.maxPrice)) return fail('maxPrice', '上限価格は円の整数で指定してください');
    const maxPrice = Number(input.maxPrice);
    if (maxPrice > BUSINESS_SALE_LIMITS.askingPriceMax) return fail('maxPrice', '上限価格が大きすぎます');
    filter.maxPrice = maxPrice;
  }
  return { ok: true, value: filter };
}
