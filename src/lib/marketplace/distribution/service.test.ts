import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';

const state = vi.hoisted(() => ({ db: null as DatabaseSync | null }));
vi.mock('@/lib/storage/d1', async () => (await import('../testing/sqlite-d1')).sqliteD1Module(() => state.db!));

import { openFullTestDatabase } from '../testing/sqlite-d1';
import { distributionFixture } from '../testing/distribution-fixture';
import { DistributionError, parseTerms, verifiedDestination } from './contract';
import { withDistributionClient } from './runtime';
import { connectListing, createReferral, distributionStatus, reconcileListing, referralDestination } from './service';

const OWNER = 'owner-A';
const PARTNER = 'partner-B';
const OTHER = 'other-C';

const TERMS = {
  name: '請求書チェッカー',
  tagline: '請求書の抜けを一晩で洗い出す',
  description: '中小企業の経理担当が月末に請求書の抜け漏れを確認するための道具です。',
  audience: '経理担当者',
  category: 'business',
  platforms: ['web'],
  price: 2980,
  currency: 'JPY',
  rate: 2000,
  months: 12,
};

function seedUser(id: string) {
  state.db!.prepare('INSERT INTO users(id,email) VALUES(?,?)').run(id, `${id}@example.com`);
}
function seedListing(id: string, slug: string, options: { owner?: string; status?: string; productUrl?: string; checkoutUrl?: string | null } = {}) {
  state.db!.prepare(
    `INSERT INTO marketplace_listings(id,user_id,source_type,slug,title,summary,category,product_url,checkout_url,status)
     VALUES(?,?,'external',?,?,?,'business_tool',?,?,?)`,
  ).run(id, options.owner ?? OWNER, slug, `商品 ${slug}`, '十分に長い説明文を入れておきます',
    options.productUrl ?? 'https://maker.example.com/', options.checkoutUrl === undefined ? 'https://maker.example.com/checkout?plan=monthly' : options.checkoutUrl,
    options.status ?? 'published');
}
function linkRow(listingId = 'l1') {
  return state.db!.prepare('SELECT state,relay_product_id AS productId FROM marketplace_distribution_links WHERE listing_id=?').get(listingId) as
    { state: string; productId: string | null } | undefined;
}
async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof DistributionError) return error.code;
    throw error;
  }
  return 'OK';
}

let relay: ReturnType<typeof distributionFixture>;
const run = <T>(work: () => Promise<T>) => withDistributionClient(relay.client, work);
const posts = () => relay.calls.filter((call) => call.path === '/api/products' && call.method === 'POST').length;

beforeEach(() => {
  state.db = openFullTestDatabase();
  for (const id of [OWNER, PARTNER, OTHER]) seedUser(id);
  seedListing('l1', 'svc-one');
  relay = distributionFixture();
});
afterEach(() => state.db?.close());

describe('未接続（既定）', () => {
  it('接続が無ければ掲載のみで、作成・紹介は理由付きで断る', async () => {
    expect(await distributionStatus({ listingId: 'l1' }, OWNER)).toMatchObject({ state: 'listing_only', mode: null, canRefer: false });
    expect(await distributionStatus({ slug: 'svc-one' }, PARTNER)).toMatchObject({ state: 'listing_only', referralUrl: null });
    expect(await code(connectListing(OWNER, 'l1', TERMS))).toBe('RELAY_NOT_CONNECTED');
    expect(await code(createReferral(PARTNER, 'svc-one', 'partner'))).toBe('RELAY_NOT_CONNECTED');
    expect(await code(referralDestination('0'.repeat(32)))).toBe('REFERRAL_NOT_FOUND');
    expect(await code(referralDestination('../../evil'))).toBe('REFERRAL_NOT_FOUND');
  });
});

describe('掲載者の連携', () => {
  it('公開中の自分の掲載だけを下書き（submit=false）で作り、決済先は作者のURLのまま', async () => {
    expect(await run(() => distributionStatus({ listingId: 'l1' }, OWNER))).toMatchObject({ state: 'unlinked', mode: 'contract-test', canLink: true });
    expect(await run(() => connectListing(OWNER, 'l1', TERMS))).toMatchObject({ state: 'linked' });
    expect(relay.catalog).toHaveLength(1);
    expect(relay.catalog[0]).toMatchObject({ submit: false, website: 'https://maker.example.com/', rate: 2000, months: 12, owner_id: 'relay-owner-A' });
    expect(linkRow()).toMatchObject({ state: 'linked', productId: relay.catalog[0].id });
    // 2回目は作り直さない
    expect(await run(() => connectListing(OWNER, 'l1', TERMS))).toMatchObject({ state: 'linked' });
    expect(posts()).toBe(1);
  });

  it('他人の掲載・下書き・SellRelayアカウントの無い利用者は連携できない', async () => {
    seedListing('l2', 'svc-draft', { status: 'draft' });
    expect(await code(run(() => connectListing(PARTNER, 'l1', TERMS)))).toBe('LISTING_NOT_FOUND');
    expect(await code(run(() => connectListing(OWNER, 'l2', TERMS)))).toBe('LISTING_NOT_FOUND');
    seedUser('nobody');
    seedListing('l3', 'svc-nobody', { owner: 'nobody' });
    expect(await run(() => distributionStatus({ listingId: 'l3' }, 'nobody'))).toMatchObject({ state: 'account_required' });
    expect(await code(run(() => connectListing('nobody', 'l3', TERMS)))).toBe('ACCOUNT_REQUIRED');
    expect(await code(distributionStatus({ listingId: 'l1' }, null))).toBe('AUTH_REQUIRED');
  });

  it('公開でないURLの掲載は送らない', async () => {
    seedListing('l4', 'svc-local', { productUrl: 'https://localhost.test/', checkoutUrl: null });
    expect(await code(run(() => connectListing(OWNER, 'l4', TERMS)))).toBe('UNSAFE_URL');
    expect(posts()).toBe(0);
  });

  it('応答が消えた作成は再送せず、照合で linked にする', async () => {
    relay.failCreate('lost');
    await expect(run(() => connectListing(OWNER, 'l1', TERMS))).rejects.toThrow();
    expect(linkRow()?.state).toBe('checking');
    expect(await run(() => distributionStatus({ listingId: 'l1' }, OWNER))).toMatchObject({ state: 'checking' });
    expect(await run(() => reconcileListing(OWNER, 'l1'))).toMatchObject({ state: 'linked' });
    expect(posts()).toBe(1);
  });

  it('届いたか不明な作成は照合待ちのまま、勝手に作り直さない', async () => {
    relay.failCreate('unknown');
    await expect(run(() => connectListing(OWNER, 'l1', TERMS))).rejects.toThrow();
    expect(await run(() => reconcileListing(OWNER, 'l1'))).toMatchObject({ state: 'checking' });
    expect(posts()).toBe(1);
  });

  it('作成前に断られた時だけ、明示の再試行で作り直せる', async () => {
    relay.failCreate('reject');
    expect(await code(run(() => connectListing(OWNER, 'l1', TERMS)))).toBe('RELAY_PRODUCT_REJECTED');
    expect(linkRow()?.state).toBe('prepared');
    expect(await run(() => connectListing(OWNER, 'l1', TERMS))).toMatchObject({ state: 'linked' });
    expect(posts()).toBe(2);
  });

  it('条件の違う再送・同じ内容の商品が2つある時は止める', async () => {
    relay.failCreate('unknown');
    await expect(run(() => connectListing(OWNER, 'l1', TERMS))).rejects.toThrow();
    expect(await code(run(() => connectListing(OWNER, 'l1', { ...TERMS, rate: 3000 })))).toBe('TERMS_CHANGED');
    const payload = { ...TERMS, website: 'https://maker.example.com/', submit: false };
    relay.catalog.push({ ...payload, id: 'p-1', owner_id: 'relay-owner-A' }, { ...payload, id: 'p-2', owner_id: 'relay-owner-A' });
    expect(await code(run(() => reconcileListing(OWNER, 'l1')))).toBe('PRODUCT_MATCH_AMBIGUOUS');
  });

  it('連携後に掲載を書き換えたら、古い対応を使い回さない', async () => {
    await run(() => connectListing(OWNER, 'l1', TERMS));
    state.db!.prepare("UPDATE marketplace_listings SET title='別の商品名' WHERE id='l1'").run();
    expect(await code(run(() => distributionStatus({ listingId: 'l1' }, OWNER)))).toBe('LISTING_CHANGED');
    expect(await run(() => distributionStatus({ slug: 'svc-one' }, PARTNER))).toMatchObject({ state: 'listing_only' });
  });
});

describe('紹介者', () => {
  async function linked() {
    await run(() => connectListing(OWNER, 'l1', TERMS));
  }

  it('SellRelay側の承認前は発行できず、承認後は別アカウントだけが1本発行できる', async () => {
    await linked();
    expect(await code(run(() => createReferral(PARTNER, 'svc-one', 'partner')))).toBe('REFERRAL_NOT_READY');
    relay.approve();
    expect(await code(run(() => createReferral(OWNER, 'svc-one', 'partner')))).toBe('SELF_REFERRAL');
    expect(await code(run(() => createReferral(PARTNER, 'svc-one', 'platform')))).toBe('PLATFORM_REFERRAL_NOT_IMPLEMENTED');
    const first = await run(() => createReferral(PARTNER, 'svc-one', 'partner'));
    expect(first).toMatchObject({ state: 'linked', canRefer: true });
    expect(first.referralUrl).toMatch(/^\/marketplace\/go\/[a-f0-9]{32}$/);
    const again = await run(() => createReferral(PARTNER, 'svc-one', 'partner'));
    expect(again.referralUrl).toBe(first.referralUrl);
    expect(await run(() => distributionStatus({ slug: 'svc-one' }, PARTNER))).toMatchObject({ canRefer: true, referralUrl: first.referralUrl });
    expect(await run(() => distributionStatus({ slug: 'svc-one' }, null))).toMatchObject({ state: 'account_required', canRefer: false, referralUrl: null });
    expect(await run(() => distributionStatus({ slug: 'svc-one' }, OWNER))).toMatchObject({ canRefer: false, referralUrl: null });
    // 外へ出すのは公開コードだけ。SellRelay のコードは含めない。
    expect(JSON.stringify(first)).not.toContain(String(relay.referrals[0].code));
  });

  it('紹介者の方針で許可されていなければ発行しない・既存リンクも隠す', async () => {
    await linked();
    relay.approve();
    await run(() => createReferral(PARTNER, 'svc-one', 'partner'));
    relay.allowPartner(false);
    expect(await run(() => distributionStatus({ slug: 'svc-one' }, PARTNER))).toMatchObject({ canRefer: false, referralUrl: null });
    expect(await code(run(() => createReferral(OTHER, 'svc-one', 'partner')))).toBe('REFERRAL_NOT_READY');
  });

  it('SellRelayが別人・別商品の紹介を返したら保存しない', async () => {
    await linked();
    relay.approve();
    relay.wrongReferral({ product_id: 'p-other', user_id: 'relay-partner-B', code: 'abc' });
    expect(await code(run(() => createReferral(PARTNER, 'svc-one', 'partner')))).toBe('RELAY_IDENTITY_MISMATCH');
    expect(state.db!.prepare('SELECT COUNT(*) AS n FROM marketplace_distribution_referrals').get()).toEqual({ n: 0 });
  });
});

describe('紹介リンクの転送', () => {
  async function issued(): Promise<string> {
    await run(() => connectListing(OWNER, 'l1', TERMS));
    relay.approve();
    return (await run(() => createReferral(PARTNER, 'svc-one', 'partner'))).referralUrl!.split('/').pop()!;
  }

  it('作者の申込みURLに紹介の印を足しただけの転送先へ送る', async () => {
    const publicCode = await issued();
    const location = await run(() => referralDestination(publicCode));
    const url = new URL(location);
    expect(url.origin + url.pathname).toBe('https://maker.example.com/checkout');
    expect(url.searchParams.get('plan')).toBe('monthly');
    expect(url.searchParams.get('sr_attribution')).toBe('contract-test-only');
  });

  it('別のサイトや追加の引数へは送らない', async () => {
    const publicCode = await issued();
    relay.unsafeRedirect('https://evil.example.com/checkout?plan=monthly&sr_attribution=x');
    expect(await code(run(() => referralDestination(publicCode)))).toBe('UNSAFE_REDIRECT');
    relay.unsafeRedirect('https://maker.example.com/checkout?plan=monthly&sr_attribution=x&next=https://evil.example.com');
    expect(await code(run(() => referralDestination(publicCode)))).toBe('UNSAFE_REDIRECT');
    relay.unsafeRedirect(null);
    state.db!.prepare("UPDATE marketplace_listings SET checkout_url='https://maker.example.com/other' WHERE id='l1'").run();
    expect(await code(run(() => referralDestination(publicCode)))).toBe('LISTING_CHANGED');
  });
});

describe('保存の制約', () => {
  it('出品者本人・同じSellRelayアカウントの紹介はDBでも拒否する', async () => {
    await run(() => connectListing(OWNER, 'l1', TERMS));
    const insert = state.db!.prepare(
      'INSERT INTO marketplace_distribution_referrals(public_code,listing_id,partner_id,relay_partner_id,relay_code) VALUES(?,?,?,?,?)');
    expect(() => insert.run('a'.repeat(32), 'l1', OWNER, 'relay-x', 'c1')).toThrow(/self referral/);
    expect(() => insert.run('b'.repeat(32), 'l1', PARTNER, 'relay-owner-A', 'c2')).toThrow(/self referral/);
    expect(() => insert.run('NOT-HEX', 'l1', PARTNER, 'relay-partner-B', 'c3')).toThrow();
  });

  it('退会では対応表の行だけが消え、掲載が無くなった対応は使われない', async () => {
    await run(() => connectListing(OWNER, 'l1', TERMS));
    relay.approve();
    const publicCode = (await run(() => createReferral(PARTNER, 'svc-one', 'partner'))).referralUrl!.split('/').pop()!;
    // 掲載が消えた（非公開になった）対応は、転送にも状態にも使わない
    state.db!.prepare("UPDATE marketplace_listings SET status='draft' WHERE id='l1'").run();
    expect(await code(run(() => referralDestination(publicCode)))).toBe('LISTING_NOT_FOUND');
    state.db!.prepare("UPDATE marketplace_listings SET status='published' WHERE id='l1'").run();
    state.db!.prepare('DELETE FROM users WHERE id=?').run(PARTNER);
    expect(state.db!.prepare('SELECT COUNT(*) AS n FROM marketplace_distribution_referrals').get()).toEqual({ n: 0 });
    state.db!.prepare('DELETE FROM users WHERE id=?').run(OWNER);
    expect(state.db!.prepare('SELECT COUNT(*) AS n FROM marketplace_distribution_links').get()).toEqual({ n: 0 });
    expect(relay.catalog).toHaveLength(1);
  });

  it('対応の持ち主・送った条件・確定した商品は後から書き換えられない', async () => {
    await run(() => connectListing(OWNER, 'l1', TERMS));
    for (const sql of ["UPDATE marketplace_distribution_links SET owner_id='partner-B'", "UPDATE marketplace_distribution_links SET product_payload='{}'",
      "UPDATE marketplace_distribution_links SET relay_product_id='p-x'", "UPDATE marketplace_distribution_links SET destination_url='https://evil.example.com/'"]) {
      expect(() => state.db!.prepare(sql).run()).toThrow(/fixed/);
    }
  });
});

describe('入力の検査', () => {
  it('報酬率は1%〜80%（0.01%単位の整数）、期間は1〜24か月、項目の過不足は拒否', () => {
    expect(parseTerms(TERMS)).toMatchObject({ rate: 2000, months: 12, platforms: ['web'] });
    for (const bad of [
      { ...TERMS, rate: 99 }, { ...TERMS, rate: 8001 }, { ...TERMS, rate: 12.5 }, { ...TERMS, months: 0 }, { ...TERMS, months: 25 },
      { ...TERMS, platforms: ['web', 'web'] }, { ...TERMS, platforms: [] }, { ...TERMS, currency: 'EUR' }, { ...TERMS, tagline: '短い' },
      { ...TERMS, extra: 1 }, Object.fromEntries(Object.entries(TERMS).filter(([key]) => key !== 'months')),
    ]) {
      expect(() => parseTerms(bad)).toThrow(DistributionError);
    }
  });

  it('転送先は登録URLと同じ場所・同じ引数に印1つだけ', () => {
    const base = 'https://maker.example.com/buy?x=1';
    expect(verifiedDestination('https://maker.example.com/buy?x=1&sr_attribution=t', base)).toContain('sr_attribution=t');
    for (const bad of ['https://maker.example.com/buy?x=1', 'https://maker.example.com/buy?x=2&sr_attribution=t',
      'http://maker.example.com/buy?x=1&sr_attribution=t', 'https://maker.example.com/buy?x=1&sr_attribution=a&sr_attribution=b', null]) {
      expect(() => verifiedDestination(bad, base)).toThrow(DistributionError);
    }
  });
});
