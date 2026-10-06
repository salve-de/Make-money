import { describe, expect, it } from 'vitest';

import { BUSINESS_SALE_LIMITS } from './business-sale';
import {
  charLength,
  findPublishProblem,
  normalizeContactEmail,
  parseBusinessSaleCreate,
  parseBusinessSaleFilter,
  parseBusinessSaleInquiry,
  parseBusinessSaleUpdate,
  planBusinessSaleUpdate,
  type BusinessSaleSnapshot,
} from './business-sale-input';

const NOW = new Date('2026-09-29T03:00:00Z');

const valid = {
  title: '  中古カメラ専門のネットショップ  ',
  category: 'ecommerce',
  establishedYear: 2021,
  monthlyRevenueJpy: 1_200_000,
  monthlyProfitJpy: 300_000,
  askingPriceJpy: 4_500_000,
};

function failure(result: ReturnType<typeof parseBusinessSaleCreate>) {
  if (result.ok) throw new Error('expected a validation failure');
  return result;
}

describe('parseBusinessSaleCreate', () => {
  it('accepts the required fields, trims text and defaults optional text to empty', () => {
    const result = parseBusinessSaleCreate(valid, NOW);
    expect(result).toEqual({
      ok: true,
      value: {
        title: '中古カメラ専門のネットショップ',
        summary: '',
        category: 'ecommerce',
        establishedYear: 2021,
        monthlyRevenueJpy: 1_200_000,
        monthlyProfitJpy: 300_000,
        askingPriceJpy: 4_500_000,
        reasonForSale: '',
        includedAssets: '',
        sellerName: '',
      },
    });
  });

  it('accepts every field at its boundary', () => {
    const result = parseBusinessSaleCreate({
      title: 'あ'.repeat(BUSINESS_SALE_LIMITS.titleMax),
      summary: 'い'.repeat(BUSINESS_SALE_LIMITS.summaryMax),
      reasonForSale: 'う'.repeat(BUSINESS_SALE_LIMITS.reasonMax),
      includedAssets: 'え'.repeat(BUSINESS_SALE_LIMITS.assetsMax),
      sellerName: 'お'.repeat(BUSINESS_SALE_LIMITS.sellerNameMax),
      category: 'service',
      establishedYear: 1900,
      monthlyRevenueJpy: BUSINESS_SALE_LIMITS.monthlyAmountMax,
      monthlyProfitJpy: BUSINESS_SALE_LIMITS.monthlyAmountMax,
      askingPriceJpy: BUSINESS_SALE_LIMITS.askingPriceMax,
    }, NOW);
    expect(result.ok).toBe(true);
    expect(parseBusinessSaleCreate({ ...valid, title: 'ab', establishedYear: 2026 }, NOW).ok).toBe(true);
  });

  it('rejects anything that is not an object', () => {
    for (const body of [null, [], 'text', 12, true]) expect(failure(parseBusinessSaleCreate(body, NOW)).field).toBe('body');
  });

  it.each([
    'status', 'revenueBasis', 'revenue_basis', 'verificationId', 'verification_id', 'userId', 'user_id',
    'id', 'slug', 'url', 'productUrl', 'websiteUrl', 'createdAt', 'monthly_revenue_jpy',
  ])('rejects the extra key %s', (key) => {
    const result = failure(parseBusinessSaleCreate({ ...valid, [key]: 'stripe_verified' }, NOW));
    expect(result.field).toBe(key);
  });

  it('rejects an own __proto__ key created by JSON.parse', () => {
    const body = JSON.parse('{"title":"ab","__proto__":{"status":"published"}}') as unknown;
    expect(failure(parseBusinessSaleCreate(body, NOW)).field).toBe('__proto__');
  });

  it.each([
    ['missing title', { ...valid, title: undefined }, 'title'],
    ['title too short', { ...valid, title: 'あ' }, 'title'],
    ['a single emoji is one character', { ...valid, title: '😀' }, 'title'],
    ['title too long', { ...valid, title: 'あ'.repeat(101) }, 'title'],
    ['title is not text', { ...valid, title: 12345 }, 'title'],
    ['title with a line break', { ...valid, title: 'ネット\nショップ' }, 'title'],
    ['title with a URL', { ...valid, title: 'https://example.com のショップ' }, 'title'],
    ['summary too long', { ...valid, summary: 'あ'.repeat(601) }, 'summary'],
    ['summary with a URL', { ...valid, summary: '詳細は http://example.com を見てください' }, 'summary'],
    ['reason too long', { ...valid, reasonForSale: 'あ'.repeat(401) }, 'reasonForSale'],
    ['assets too long', { ...valid, includedAssets: 'あ'.repeat(401) }, 'includedAssets'],
    ['seller name too long', { ...valid, sellerName: 'あ'.repeat(51) }, 'sellerName'],
    ['seller name with a line break', { ...valid, sellerName: '山田\n太郎' }, 'sellerName'],
    ['zero width space', { ...valid, summary: 'ab​cd' }, 'summary'],
    ['bidi override', { ...valid, summary: 'ab‮cd' }, 'summary'],
    ['control character', { ...valid, summary: 'ab\u0007cd' }, 'summary'],
    ['lone surrogate', { ...valid, summary: 'ab\ud800cd' }, 'summary'],
    ['missing category', { ...valid, category: undefined }, 'category'],
    ['unknown category', { ...valid, category: 'crypto' }, 'category'],
    ['year before 1900', { ...valid, establishedYear: 1899 }, 'establishedYear'],
    ['year in the future', { ...valid, establishedYear: 2027 }, 'establishedYear'],
    ['fractional year', { ...valid, establishedYear: 2020.5 }, 'establishedYear'],
    ['year as text', { ...valid, establishedYear: '2020' }, 'establishedYear'],
    ['missing revenue', { ...valid, monthlyRevenueJpy: undefined }, 'monthlyRevenueJpy'],
    ['negative revenue', { ...valid, monthlyRevenueJpy: -1 }, 'monthlyRevenueJpy'],
    ['fractional revenue', { ...valid, monthlyRevenueJpy: 1000.5 }, 'monthlyRevenueJpy'],
    ['revenue as text', { ...valid, monthlyRevenueJpy: '1000000' }, 'monthlyRevenueJpy'],
    ['revenue over the cap', { ...valid, monthlyRevenueJpy: BUSINESS_SALE_LIMITS.monthlyAmountMax + 1 }, 'monthlyRevenueJpy'],
    ['revenue that is not finite', { ...valid, monthlyRevenueJpy: Number.POSITIVE_INFINITY }, 'monthlyRevenueJpy'],
    ['revenue beyond safe integers', { ...valid, monthlyRevenueJpy: 2 ** 60 }, 'monthlyRevenueJpy'],
    ['negative profit', { ...valid, monthlyProfitJpy: -100 }, 'monthlyProfitJpy'],
    ['profit as null', { ...valid, monthlyProfitJpy: null }, 'monthlyProfitJpy'],
    ['negative price', { ...valid, askingPriceJpy: -1 }, 'askingPriceJpy'],
    ['price over the cap', { ...valid, askingPriceJpy: BUSINESS_SALE_LIMITS.askingPriceMax + 1 }, 'askingPriceJpy'],
    ['profit larger than revenue', { ...valid, monthlyRevenueJpy: 100_000, monthlyProfitJpy: 100_001 }, 'monthlyProfitJpy'],
  ])('rejects %s', (_name, body, field) => {
    expect(failure(parseBusinessSaleCreate(body, NOW)).field).toBe(field);
  });

  it('counts characters the way SQLite length() does', () => {
    expect(charLength('😀😀')).toBe(2);
    expect(parseBusinessSaleCreate({ ...valid, title: '😀😀' }, NOW).ok).toBe(true);
  });

  it('keeps newlines in multi-line text and normalizes CRLF', () => {
    const result = parseBusinessSaleCreate({ ...valid, summary: '一行目\r\n二行目\t三行目' }, NOW);
    expect(result.ok && result.value.summary).toBe('一行目\n二行目\t三行目');
  });

  it('computes the latest allowed year in Japan time', () => {
    const newYearJst = new Date('2026-12-31T16:00:00Z');
    expect(parseBusinessSaleCreate({ ...valid, establishedYear: 2027 }, newYearJst).ok).toBe(true);
    expect(parseBusinessSaleCreate({ ...valid, establishedYear: 2027 }, new Date('2026-12-31T14:59:00Z')).ok).toBe(false);
  });
});

describe('parseBusinessSaleUpdate', () => {
  it('keeps only the fields that were sent', () => {
    expect(parseBusinessSaleUpdate({ askingPriceJpy: 5_000_000, summary: ' 更新後の説明 ' }, NOW)).toEqual({
      ok: true,
      value: { askingPriceJpy: 5_000_000, summary: '更新後の説明' },
    });
    expect(parseBusinessSaleUpdate({ status: 'pending_review' }, NOW)).toEqual({ ok: true, value: { status: 'pending_review' } });
  });

  it('never lets the owner set published or rejected (only the operator review can)', () => {
    for (const status of ['published', 'rejected']) {
      expect(parseBusinessSaleUpdate({ status }, NOW)).toMatchObject({ ok: false, field: 'status' });
    }
  });

  it('rejects an empty update, extra keys and bad values', () => {
    expect(parseBusinessSaleUpdate({}, NOW)).toMatchObject({ ok: false, field: 'body' });
    for (const key of ['revenueBasis', 'verificationId', 'userId', 'slug', 'id', 'url']) {
      expect(parseBusinessSaleUpdate({ [key]: 'x' }, NOW)).toMatchObject({ ok: false, field: key });
    }
    expect(parseBusinessSaleUpdate({ status: 'archived' }, NOW)).toMatchObject({ ok: false, field: 'status' });
    expect(parseBusinessSaleUpdate({ title: null }, NOW)).toMatchObject({ ok: false, field: 'title' });
    expect(parseBusinessSaleUpdate({ askingPriceJpy: -5 }, NOW)).toMatchObject({ ok: false, field: 'askingPriceJpy' });
    expect(parseBusinessSaleUpdate([], NOW)).toMatchObject({ ok: false, field: 'body' });
  });
});

describe('planBusinessSaleUpdate', () => {
  const current: BusinessSaleSnapshot = {
    title: '中古カメラ専門のネットショップ',
    summary: '中古カメラを仕入れてネットで販売しています。月の受注は約120件です。',
    category: 'ecommerce',
    establishedYear: 2021,
    monthlyRevenueJpy: 1_200_000,
    monthlyProfitJpy: 300_000,
    askingPriceJpy: 4_500_000,
    reasonForSale: '本業に専念するため',
    includedAssets: 'ドメイン、ショップのアカウント、在庫リスト',
    sellerName: '',
    status: 'draft',
  };

  it('moves a complete draft to pending_review, never straight to published', () => {
    const plan = planBusinessSaleUpdate(current, { status: 'pending_review' });
    expect(plan).toMatchObject({ ok: true, revenueChanged: false });
    expect(plan.ok && plan.next.status).toBe('pending_review');
    expect(planBusinessSaleUpdate(current, { status: 'published' as never })).toMatchObject({ ok: false, kind: 'conflict', field: 'status' });
  });

  it('sends a published listing back to review when its content changes, but not when nothing changed', () => {
    const published = { ...current, status: 'published' as const };
    const edited = planBusinessSaleUpdate(published, { askingPriceJpy: 4_000_000 });
    expect(edited.ok && edited.next.status).toBe('pending_review');
    const same = planBusinessSaleUpdate(published, { askingPriceJpy: current.askingPriceJpy });
    expect(same.ok && same.next.status).toBe('published');
    const closed = planBusinessSaleUpdate(published, { status: 'closed', title: '終了前の改題' });
    expect(closed.ok && closed.next.status).toBe('closed');
  });

  it('lets a rejected listing be fixed and resubmitted, or stay rejected while edited', () => {
    const rejected = { ...current, status: 'rejected' as const };
    expect(planBusinessSaleUpdate(rejected, { title: '直した事業名' })).toMatchObject({ ok: true, next: { status: 'rejected' } });
    expect(planBusinessSaleUpdate(rejected, { title: '直した事業名', status: 'pending_review' })).toMatchObject({ ok: true, next: { status: 'pending_review' } });
    expect(planBusinessSaleUpdate({ ...rejected, summary: '' }, { status: 'pending_review' })).toMatchObject({ ok: false, kind: 'invalid', field: 'summary' });
  });

  it('refuses to request review without a description, a reason or included assets', () => {
    expect(planBusinessSaleUpdate({ ...current, summary: '短い説明' }, { status: 'pending_review' })).toMatchObject({ ok: false, kind: 'invalid', field: 'summary' });
    expect(planBusinessSaleUpdate({ ...current, reasonForSale: '' }, { status: 'pending_review' })).toMatchObject({ ok: false, kind: 'invalid', field: 'reasonForSale' });
    expect(planBusinessSaleUpdate({ ...current, includedAssets: '' }, { status: 'pending_review' })).toMatchObject({ ok: false, kind: 'invalid', field: 'includedAssets' });
    expect(findPublishProblem(current)).toBeNull();
  });

  it('keeps the publish requirements when a published listing is edited', () => {
    const published = { ...current, status: 'published' as const };
    expect(planBusinessSaleUpdate(published, { reasonForSale: '' })).toMatchObject({ ok: false, kind: 'invalid', field: 'reasonForSale' });
    expect(planBusinessSaleUpdate(published, { askingPriceJpy: 4_000_000 })).toMatchObject({ ok: true });
  });

  it('allows draft edits without the publish requirements', () => {
    expect(planBusinessSaleUpdate({ ...current, summary: '' }, { title: '新しい事業名' })).toMatchObject({ ok: true });
  });

  it('only moves forward: draft to review to published (by the operator) to closed', () => {
    const published = { ...current, status: 'published' as const };
    expect(planBusinessSaleUpdate(published, { status: 'closed' })).toMatchObject({ ok: true });
    expect(planBusinessSaleUpdate(published, { status: 'draft' })).toMatchObject({ ok: false, kind: 'conflict', field: 'status' });
    expect(planBusinessSaleUpdate(current, { status: 'closed' })).toMatchObject({ ok: false, kind: 'conflict', field: 'status' });
  });

  it('freezes a closed listing', () => {
    const closed = { ...current, status: 'closed' as const };
    for (const patch of [{ title: '変更' }, { status: 'pending_review' as const }, { status: 'closed' as const }]) {
      expect(planBusinessSaleUpdate(closed, patch)).toMatchObject({ ok: false, kind: 'conflict' });
    }
  });

  it('reports a revenue change so verification can be dropped', () => {
    expect(planBusinessSaleUpdate(current, { monthlyRevenueJpy: 1_300_000 })).toMatchObject({ ok: true, revenueChanged: true });
    expect(planBusinessSaleUpdate(current, { monthlyProfitJpy: 250_000 })).toMatchObject({ ok: true, revenueChanged: false });
    expect(planBusinessSaleUpdate(current, { monthlyRevenueJpy: 1_200_000 })).toMatchObject({ ok: true, revenueChanged: false });
  });

  it('rejects an edit that would make profit larger than revenue', () => {
    expect(planBusinessSaleUpdate(current, { monthlyRevenueJpy: 200_000 })).toMatchObject({ ok: false, kind: 'invalid', field: 'monthlyProfitJpy' });
  });
});

describe('parseBusinessSaleInquiry', () => {
  it('accepts a message and a lowercase contact email', () => {
    expect(parseBusinessSaleInquiry({ message: '  売上の推移を教えていただけますか。  ', contactEmail: ' Buyer@Example.COM ' })).toEqual({
      ok: true,
      value: { message: '売上の推移を教えていただけますか。', contactEmail: 'buyer@example.com' },
    });
  });

  it('allows a link in the buyer message', () => {
    expect(parseBusinessSaleInquiry({ message: '会社概要は https://example.com にあります。', contactEmail: 'buyer@example.com' }).ok).toBe(true);
  });

  it.each([
    ['too short', { message: '短すぎる問い合わせ', contactEmail: 'a@example.com' }, 'message'],
    ['too long', { message: 'あ'.repeat(2001), contactEmail: 'a@example.com' }, 'message'],
    ['missing message', { contactEmail: 'a@example.com' }, 'message'],
    ['control character', { message: '問い合わせです。\u0007お願いします', contactEmail: 'a@example.com' }, 'message'],
    ['missing email', { message: '売上の推移を教えてください。' }, 'contactEmail'],
    ['blank email', { message: '売上の推移を教えてください。', contactEmail: '   ' }, 'contactEmail'],
    ['invalid email', { message: '売上の推移を教えてください。', contactEmail: 'not-an-email' }, 'contactEmail'],
    ['mailto injection', { message: '売上の推移を教えてください。', contactEmail: 'a@example.com?bcc=x@y.jp' }, 'contactEmail'],
    ['extra key', { message: '売上の推移を教えてください。', contactEmail: 'a@example.com', buyerUserId: 'x' }, 'buyerUserId'],
    ['body is not an object', 'text', 'body'],
  ])('rejects %s', (_name, body, field) => {
    const result = parseBusinessSaleInquiry(body);
    expect(result).toMatchObject({ ok: false, field });
  });

  it('asks for a blank email and only calls a filled-in one malformed', () => {
    expect(parseBusinessSaleInquiry({ message: '売上の推移を教えてください。', contactEmail: '' })).toEqual({
      ok: false, field: 'contactEmail', message: '連絡先のメールアドレスを入力してください',
    });
    expect(parseBusinessSaleInquiry({ message: '売上の推移を教えてください。', contactEmail: 'buyer' })).toEqual({
      ok: false, field: 'contactEmail', message: 'メールアドレスの形式が正しくありません',
    });
  });

  it('accepts the message length boundaries', () => {
    expect(parseBusinessSaleInquiry({ message: 'あ'.repeat(10), contactEmail: 'a@example.com' }).ok).toBe(true);
    expect(parseBusinessSaleInquiry({ message: 'あ'.repeat(2000), contactEmail: 'a@example.com' }).ok).toBe(true);
  });
});

describe('normalizeContactEmail', () => {
  it('lowercases valid addresses and rejects unsafe shapes', () => {
    expect(normalizeContactEmail('Foo.Bar+tag@Example.co.jp')).toBe('foo.bar+tag@example.co.jp');
    for (const bad of ['a@b', 'a@b.c', 'a b@example.com', 'a..b@example.com', 'a@example.com?x=1', 'a@@example.com', '', 12, null]) {
      expect(normalizeContactEmail(bad)).toBeNull();
    }
    expect(normalizeContactEmail(`${'a'.repeat(250)}@example.com`)).toBeNull();
  });
});

describe('parseBusinessSaleFilter', () => {
  it('accepts an empty filter, a category and a maximum price in yen', () => {
    expect(parseBusinessSaleFilter({})).toEqual({ ok: true, value: {} });
    expect(parseBusinessSaleFilter({ category: '', maxPrice: '' })).toEqual({ ok: true, value: {} });
    expect(parseBusinessSaleFilter({ category: 'saas', maxPrice: '3000000' })).toEqual({ ok: true, value: { category: 'saas', maxPrice: 3_000_000 } });
    expect(parseBusinessSaleFilter({ maxPrice: '0' })).toEqual({ ok: true, value: { maxPrice: 0 } });
  });

  it('rejects unknown categories and malformed prices', () => {
    expect(parseBusinessSaleFilter({ category: 'crypto' })).toMatchObject({ ok: false, field: 'category' });
    for (const maxPrice of ['-1', '1.5', '1e6', 'abc', ' 100', '1234567890123', '10000000001']) {
      expect(parseBusinessSaleFilter({ maxPrice })).toMatchObject({ ok: false, field: 'maxPrice' });
    }
  });
});
