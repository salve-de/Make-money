import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { NextRequest } from 'next/server';
import type { FinancialEntity } from '@/shared/terminal';

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  verify: vi.fn(),
  rate: vi.fn(),
  env: vi.fn(),
}));
vi.mock('@/lib/company-access/local-entity-index', () => ({ readCachedLocalPublishableEntities: mocks.read }));
vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: mocks.verify }));
vi.mock('@/lib/security/rate-limit', () => ({ consumeRequestRateLimit: mocks.rate }));
vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: mocks.env }));

import { POST } from './route';

const REPLACEMENT = '公開事例に規約・法令違反につながる記述が含まれるため、許可を得た正規の手段へ置き換えて検証します。';
const IDEA = '町工場の紙図面をLINEで受け付けてデータ化する月額サービス';

function entity(options: { id: string; name?: string; tagline?: string; tags?: string[]; pnl?: Record<string, unknown> }): FinancialEntity {
  return {
    id: options.id,
    name: options.name ?? `Company ${options.id}`,
    tagline: options.tagline ?? '',
    tags: options.tags ?? [],
    sector: 'NICHE_SAAS',
    founder: 'SECRET FOUNDER NAME',
    url: 'https://secret.example/private',
    strategy: { blindspot: 'SECRET BLINDSPOT' },
    pnl: { monthlyRevenue: 1_500_000, isRevenueUnconfirmed: false, revenueLabel: '¥150万円', estimationLogic: 'SECRET LOGIC', ...options.pnl },
  } as unknown as FinancialEntity;
}

function fillers(count: number): FinancialEntity[] {
  const chars = Array.from({ length: 120 }, (_, i) => String.fromCodePoint(0x4ec8 + i));
  const words = Array.from({ length: 60 }, (_, i) => chars[i * 2] + chars[i * 2 + 1]);
  let seed = 11;
  const next = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed; };
  return Array.from({ length: count }, (_, i) => entity({
    id: `filler_${i}`,
    name: `Filler ${i}`,
    tagline: Array.from({ length: 6 }, () => words[next() % words.length]).join(''),
    pnl: { revenueLabel: undefined },
  }));
}

const FACTORY = entity({ id: 'ent_factory', name: 'Zukan Cloud', tagline: '町工場の紙図面をLINEで受け付けてデータ化する' });
const FAILED = entity({
  id: 'ent_failed',
  name: 'Paper Trail',
  tagline: '町工場の紙図面をLINEで受け付ける前に資金が尽きた',
  tags: ['失敗'],
  pnl: { financialStatus: 'POST_MORTEM', revenueLabel: '月商¥500万円（月間赤字¥5,000万円）' },
});
const UNCONFIRMED = entity({
  id: 'ent_unconfirmed',
  name: 'Quiet Drawings',
  tagline: '町工場の紙図面をLINEで受け付ける',
  pnl: { isRevenueUnconfirmed: true, monthlyRevenue: 0, revenueLabel: '売上非公開' },
});
const CATALOG = [...fillers(300), FACTORY, FAILED, UNCONFIRMED];

function request(body: unknown, options: { token?: string; raw?: boolean } = {}) {
  return new NextRequest('http://localhost/api/idea-research', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(options.token ? { authorization: `Bearer ${options.token}` } : {}) },
    body: options.raw ? String(body) : JSON.stringify(body),
  });
}

function aiPayload(overrides: Record<string, unknown> = {}) {
  return {
    dimension: 'CONTRARIAN_BLINDSPOT',
    title: '図面LINE受付',
    targetPainWallet: '紙図面を探し回る現場責任者',
    structuralArbitrage: '大手の基幹システムは高額で、LINE受付だけの軽い形が空いている',
    projectedMonthlyProfitJpy: 300_000,
    operatingMargin: 60,
    requiredTools: [{ name: 'LINE公式アカウント', monthlyCostJpy: 5000, purpose: '受付' }],
    first100TractionPlaybook: ['地域の商工会に、同意を得たうえで紹介を依頼する'],
    sourceEntityIds: ['ent_factory', 'ent_not_given'],
    ...overrides,
  };
}

function geminiReply(payload: unknown) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }), { status: 200 });
}

let fetchMock: MockInstance<typeof fetch>;

beforeEach(() => {
  mocks.read.mockReset().mockResolvedValue(CATALOG);
  mocks.verify.mockReset().mockResolvedValue({ uid: 'user-1' });
  mocks.rate.mockReset().mockResolvedValue(true);
  mocks.env.mockReset().mockResolvedValue('test-gemini-key');
  fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => geminiReply(aiPayload()));
});

afterEach(() => vi.restoreAllMocks());

describe('POST /api/idea-research input', () => {
  it.each([
    ['a missing idea', {}],
    ['an idea that is not text', { idea: 12345 }],
    ['an idea shorter than 10 characters', { idea: '短いアイデア' }],
    ['an idea that is only spaces', { idea: `${' '.repeat(20)}` }],
    ['an idea longer than 1000 characters', { idea: 'あ'.repeat(1001) }],
    ['an unknown key next to a valid idea', { idea: IDEA, role: 'admin' }],
    ['an array body', [IDEA]],
    ['a null body', null],
    ['a plain string body', IDEA],
  ])('rejects %s with 400 before touching the rate limit, catalog or AI', async (_label, body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.rate).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed and empty JSON with 400', async () => {
    expect((await POST(request('{', { raw: true }))).status).toBe(400);
    expect((await POST(request('', { raw: true }))).status).toBe(400);
  });

  it('rejects a body over 8KB with 413', async () => {
    const response = await POST(request({ idea: IDEA, padding: 'x'.repeat(9 * 1024) }));
    expect(response.status).toBe(413);
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it('accepts exactly 10 and exactly 1000 characters, and trims the idea before searching', async () => {
    expect((await POST(request({ idea: 'あ'.repeat(10) }))).status).toBe(200);
    expect((await POST(request({ idea: 'あ'.repeat(1000) }))).status).toBe(200);
    expect((await POST(request({ idea: `  ${'あ'.repeat(10)}  ` }))).status).toBe(200);
    expect((await POST(request({ idea: `  ${'あ'.repeat(9)}  ` }))).status).toBe(400);
  });
});

describe('POST /api/idea-research without signing in', () => {
  it('returns similar cases, no AI summary and LOGIN_REQUIRED, using the per-IP limit', async () => {
    const response = await POST(request({ idea: IDEA }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(body.ai).toBeNull();
    expect(body.aiUnavailableReason).toBe('LOGIN_REQUIRED');
    expect(body.cases.length).toBeGreaterThan(0);
    expect(mocks.rate).toHaveBeenCalledTimes(1);
    expect(mocks.rate).toHaveBeenCalledWith(expect.anything(), 'idea-research-anonymous', { limit: 20, windowMs: 60 * 60 * 1000 });
    // 未ログインには API キーの有無も見せず、AI も呼ばない
    expect(mocks.env).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns cases with only public summary fields, success and failure together, and no numbers for unconfirmed revenue', async () => {
    const body = await (await POST(request({ idea: IDEA }))).json();
    const byId = new Map<string, Record<string, unknown>>(body.cases.map((item: Record<string, unknown>) => [item.id as string, item]));
    expect(byId.get('ent_factory')).toMatchObject({ name: 'Zukan Cloud', outcome: 'success', monthlyRevenueLabel: '¥150万円', sector: 'NICHE_SAAS' });
    expect(byId.get('ent_failed')).toMatchObject({ outcome: 'failure', monthlyRevenueLabel: '月商¥500万円（月間赤字¥5,000万円）' });
    expect(byId.get('ent_unconfirmed')).toMatchObject({ outcome: 'unknown', monthlyRevenueLabel: null });
    for (const item of body.cases) {
      expect(Object.keys(item).sort()).toEqual(['id', 'monthlyRevenueLabel', 'name', 'outcome', 'score', 'sector', 'tagline']);
    }
    const serialized = JSON.stringify(body);
    for (const secret of ['SECRET FOUNDER NAME', 'secret.example', 'SECRET BLINDSPOT', 'SECRET LOGIC', 'estimationLogic']) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('returns an empty case list, not an error, when nothing is similar', async () => {
    const response = await POST(request({ idea: 'ひらがなだけで書かれた、比べようのないアイデアです' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cases: [], ai: null, aiUnavailableReason: 'LOGIN_REQUIRED' });
  });

  it('treats an invalid or unverifiable token as not signed in, and still returns cases', async () => {
    mocks.verify.mockResolvedValue(null);
    const rejected = await (await POST(request({ idea: IDEA }, { token: 'expired' }))).json();
    expect(rejected.aiUnavailableReason).toBe('LOGIN_REQUIRED');
    expect(rejected.cases.length).toBeGreaterThan(0);
    expect(mocks.rate).toHaveBeenLastCalledWith(expect.anything(), 'idea-research-anonymous', expect.anything());

    mocks.verify.mockRejectedValue(new Error('jwks unavailable'));
    const failed = await POST(request({ idea: IDEA }, { token: 'anything' }));
    expect(failed.status).toBe(200);
    expect((await failed.json()).aiUnavailableReason).toBe('LOGIN_REQUIRED');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/idea-research when signed in', () => {
  it('adds an AI summary that is checked, with a server-made id and only the given case ids', async () => {
    const response = await POST(request({ idea: IDEA }, { token: 'valid' }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).not.toHaveProperty('aiUnavailableReason');
    expect(body.ai).toMatchObject({
      title: '図面LINE受付',
      dimension: 'CONTRARIAN_BLINDSPOT',
      sourceEntityIds: ['ent_factory'],
      userNoteInspiration: IDEA,
      projectedMonthlyProfitJpy: 300_000,
      operatingMargin: 60,
    });
    expect(body.ai.id).toMatch(/^idea_research_[0-9a-f-]{36}$/);
    expect(mocks.rate).toHaveBeenCalledWith(expect.anything(), 'idea-research-user', { limit: 60, windowMs: 60 * 60 * 1000, subject: 'user-1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives Gemini only the idea and the name, one-line description and confirmed revenue label of each case', async () => {
    await POST(request({ idea: IDEA }, { token: 'valid' }));
    const [, init] = fetchMock.mock.calls[0] as unknown as [unknown, RequestInit];
    const prompt: string = JSON.parse(String(init.body)).contents[0].parts[0].text;
    expect(prompt).toContain(JSON.stringify(IDEA));
    expect(prompt).toContain('Zukan Cloud');
    expect(prompt).toContain('¥150万円');
    expect(prompt).toContain('"monthlyRevenue":"未確認"');
    expect(prompt).not.toContain('売上非公開');
    for (const secret of ['SECRET FOUNDER NAME', 'secret.example', 'SECRET BLINDSPOT', 'SECRET LOGIC', 'test-gemini-key']) {
      expect(prompt).not.toContain(secret);
    }
  });

  it('sets profit and margin to 0 when none of the found cases has confirmed revenue', async () => {
    mocks.read.mockResolvedValue([...fillers(300), UNCONFIRMED]);
    const body = await (await POST(request({ idea: IDEA }, { token: 'valid' }))).json();
    expect(body.cases.map((item: { id: string }) => item.id)).toEqual(['ent_unconfirmed']);
    expect(body.ai).toMatchObject({ projectedMonthlyProfitJpy: 0, operatingMargin: 0, sourceEntityIds: [] });
  });

  it('still returns an AI summary when no similar case exists, without profit numbers or sources', async () => {
    const body = await (await POST(request({ idea: 'ひらがなだけで書かれた、比べようのないアイデアです' }, { token: 'valid' }))).json();
    expect(body.cases).toEqual([]);
    expect(body.ai).toMatchObject({ projectedMonthlyProfitJpy: 0, operatingMargin: 0, sourceEntityIds: [] });
  });

  it('replaces steps that teach deceptive or terms-violating tactics with the standard text', async () => {
    fetchMock.mockImplementation(async () => geminiReply(aiPayload({
      first100TractionPlaybook: ['自演アカウントで拡散する', '迷惑DMを大量に送る', '商工会に同意を得て紹介を依頼する'],
    })));
    const body = await (await POST(request({ idea: IDEA }, { token: 'valid' }))).json();
    expect(body.ai.first100TractionPlaybook).toEqual([REPLACEMENT, REPLACEMENT, '商工会に同意を得て紹介を依頼する']);
  });

  it('reports NOT_CONFIGURED, and still returns cases, when there is no Gemini key', async () => {
    mocks.env.mockResolvedValue(undefined);
    const response = await POST(request({ idea: IDEA }, { token: 'valid' }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ai).toBeNull();
    expect(body.aiUnavailableReason).toBe('NOT_CONFIGURED');
    expect(body.cases.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to the second key name', async () => {
    mocks.env.mockImplementation(async (name: string) => (name === 'GOOGLE_GENERATIVE_AI_API_KEY' ? 'second-key' : undefined));
    const body = await (await POST(request({ idea: IDEA }, { token: 'valid' }))).json();
    expect(body.ai).not.toBeNull();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [unknown, RequestInit];
    expect(String(url)).not.toContain('second-key');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('second-key');
  });

  it.each([
    ['an HTTP error', () => new Response('{}', { status: 503 })],
    ['a reply that is not JSON', () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '申し訳ありません' }] } }] }))],
    ['JSON that is not a usable idea', () => geminiReply({ title: '' })],
    ['a blocked (empty) reply', () => new Response(JSON.stringify({ candidates: [] }))],
  ])('reports FAILED, and still returns cases, on %s', async (_label, reply) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fetchMock.mockImplementation(async () => reply());
    const response = await POST(request({ idea: IDEA }, { token: 'valid' }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ai).toBeNull();
    expect(body.aiUnavailableReason).toBe('FAILED');
    expect(body.cases.length).toBeGreaterThan(0);
    // 個人が書いたアイデアや AI の応答をログに残さない
    expect(JSON.stringify(warn.mock.calls)).not.toContain(IDEA);
  });

  it('reports FAILED when the network call itself fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const body = await (await POST(request({ idea: IDEA }, { token: 'valid' }))).json();
    expect(body).toMatchObject({ ai: null, aiUnavailableReason: 'FAILED' });
    expect(body.cases.length).toBeGreaterThan(0);
  });
});

describe('POST /api/idea-research limits and outages', () => {
  it('answers 429 with Retry-After when the limit is used up, without searching or calling AI', async () => {
    mocks.rate.mockResolvedValue(false);
    const response = await POST(request({ idea: IDEA }, { token: 'valid' }));
    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const retryAfter = Number(response.headers.get('retry-after'));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(3600);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still returns similar cases when the limit store is down, but does not spend money on AI', async () => {
    mocks.rate.mockRejectedValue(new Error('D1 unavailable'));
    const signedIn = await POST(request({ idea: IDEA }, { token: 'valid' }));
    const signedInBody = await signedIn.json();
    expect(signedIn.status).toBe(200);
    expect(signedInBody.cases.length).toBeGreaterThan(0);
    expect(signedInBody).toMatchObject({ ai: null, aiUnavailableReason: 'FAILED' });

    const anonymous = await (await POST(request({ idea: IDEA }))).json();
    expect(anonymous.cases.length).toBeGreaterThan(0);
    expect(anonymous.aiUnavailableReason).toBe('LOGIN_REQUIRED');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 503 when the catalog cannot be read, instead of pretending nothing is similar', async () => {
    mocks.read.mockRejectedValue(new Error('missing object'));
    const response = await POST(request({ idea: IDEA }, { token: 'valid' }));
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('gives the same cases for the same idea every time', async () => {
    const first = await (await POST(request({ idea: IDEA }))).json();
    const second = await (await POST(request({ idea: IDEA }, { token: 'valid' }))).json();
    expect(second.cases).toEqual(first.cases);
  });
});
