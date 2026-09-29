import { describe, expect, it, vi } from 'vitest';
import type { SynthesizedIdea } from '@/shared/terminal';
import {
  BUILD_PREPARE_ENDPOINT,
  IDEA_RESEARCH_ENDPOINT,
  buildBuilderPrepareRequest,
  buildIdeaResearchRequest,
  builderPath,
  fetchIdeaResearch,
  prepareBuilderIdea,
} from './ideaResearchClient';

const IDEA_TEXT = '町工場の紙図面をLINEで受け付けてデータ化する月額サービス';

const caseRow = {
  id: 'ent_a',
  name: '事例A',
  tagline: '一行説明',
  sector: 'NICHE_SAAS',
  outcome: 'success',
  monthlyRevenueLabel: '¥150万円',
  score: 30,
};

const ai: SynthesizedIdea = {
  id: 'idea_research_1',
  dimension: 'SAVANNA_INSTINCT',
  dimensionLabel: 'ラベル',
  title: '図面LINE受付',
  targetPainWallet: '対象の痛み',
  structuralArbitrage: '突く歪み',
  projectedMonthlyProfitJpy: 300_000,
  operatingMargin: 60,
  requiredTools: [{ name: 'LINE公式アカウント', monthlyCostJpy: 5000, purpose: '受付' }],
  first100TractionPlaybook: ['手順1'],
  sourceEntityIds: ['ent_a'],
  userNoteInspiration: IDEA_TEXT,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const loginRequired = () => json({ cases: [caseRow], ai: null, aiUnavailableReason: 'LOGIN_REQUIRED' });
const withSummary = () => json({ cases: [caseRow], ai });

describe('request bodies', () => {
  it('builds the search request with the idea only, and adds Authorization only when signed in', () => {
    const anonymous = buildIdeaResearchRequest(IDEA_TEXT, null);
    expect(anonymous.url).toBe(IDEA_RESEARCH_ENDPOINT);
    expect(anonymous.url).toBe('/api/idea-research');
    expect(anonymous.init.method).toBe('POST');
    expect(JSON.parse(String(anonymous.init.body))).toEqual({ idea: IDEA_TEXT });
    expect(anonymous.init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(anonymous.init.cache).toBe('no-store');

    const signedIn = buildIdeaResearchRequest(IDEA_TEXT, 'token-123');
    expect(signedIn.init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer token-123' });
  });

  it('builds the Builder request that sends the AI summary as-is to the existing prepare endpoint', () => {
    const request = buildBuilderPrepareRequest(ai, 'token-123');
    expect(request.url).toBe(BUILD_PREPARE_ENDPOINT);
    expect(request.url).toBe('/api/build/prepare');
    expect(request.init.method).toBe('POST');
    expect(request.init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer token-123' });
    expect(JSON.parse(String(request.init.body))).toEqual({ idea: ai });
    expect(Object.keys(JSON.parse(String(request.init.body)))).toEqual(['idea']);
  });

  it('builds the Builder path for an id, encoding anything unusual', () => {
    expect(builderPath('idea_research_1')).toBe('/build/idea_research_1');
    expect(builderPath('a/b c?d')).toBe('/build/a%2Fb%20c%3Fd');
  });
});

describe('fetchIdeaResearch', () => {
  it('sends the request and reads cases and the AI summary', async () => {
    const fetchImpl = vi.fn(async () => withSummary());
    const result = await fetchIdeaResearch({ idea: IDEA_TEXT, token: 'token-123', fetchImpl });
    expect(result).toEqual({ ok: true, data: { cases: [caseRow], ai } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/idea-research');
    expect(JSON.parse(String(init.body))).toEqual({ idea: IDEA_TEXT });
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
  });

  it('does not send Authorization when signed out, and does not retry', async () => {
    const fetchImpl = vi.fn(async () => loginRequired());
    const refreshToken = vi.fn(async () => 'fresh');
    const result = await fetchIdeaResearch({ idea: IDEA_TEXT, token: null, refreshToken, fetchImpl });
    expect(result).toMatchObject({ ok: true, data: { ai: null, aiUnavailableReason: 'LOGIN_REQUIRED' } });
    expect((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].headers).not.toHaveProperty('Authorization');
    expect(refreshToken).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refreshes the token once and asks again when a signed-in request is told to log in', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(loginRequired())
      .mockResolvedValueOnce(withSummary());
    const refreshToken = vi.fn(async () => 'fresh-token');
    const result = await fetchIdeaResearch({ idea: IDEA_TEXT, token: 'stale-token', refreshToken, fetchImpl });
    expect(result).toEqual({ ok: true, data: { cases: [caseRow], ai } });
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const headers = (fetchImpl.mock.calls[1] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer fresh-token');
  });

  it.each([
    ['the refresh gives nothing', async () => null],
    ['the refresh gives the same token', async () => 'stale-token'],
  ])('keeps the first answer when %s', async (_label, refreshToken) => {
    const fetchImpl = vi.fn(async () => loginRequired());
    const result = await fetchIdeaResearch({ idea: IDEA_TEXT, token: 'stale-token', refreshToken, fetchImpl });
    expect(result).toMatchObject({ ok: true, data: { aiUnavailableReason: 'LOGIN_REQUIRED', cases: [caseRow] } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('keeps the first answer, with its cases, when the second request fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(loginRequired()).mockResolvedValueOnce(json({}, 500));
    const result = await fetchIdeaResearch({ idea: IDEA_TEXT, token: 'stale', refreshToken: async () => 'fresh', fetchImpl });
    expect(result).toMatchObject({ ok: true, data: { aiUnavailableReason: 'LOGIN_REQUIRED', cases: [caseRow] } });
  });

  it('does not retry for reasons other than a rejected login', async () => {
    const fetchImpl = vi.fn(async () => json({ cases: [], ai: null, aiUnavailableReason: 'NOT_CONFIGURED' }));
    const refreshToken = vi.fn(async () => 'fresh');
    await fetchIdeaResearch({ idea: IDEA_TEXT, token: 'token', refreshToken, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(refreshToken).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'INVALID_INPUT'],
    [413, 'INVALID_INPUT'],
    [429, 'RATE_LIMITED'],
    [500, 'UNAVAILABLE'],
    [503, 'UNAVAILABLE'],
  ])('maps HTTP %i to %s', async (status, kind) => {
    const result = await fetchIdeaResearch({ idea: IDEA_TEXT, token: null, fetchImpl: async () => json({ error: 'x' }, status) });
    expect(result).toEqual({ ok: false, kind });
  });

  it('reports NETWORK when the request cannot be sent', async () => {
    const result = await fetchIdeaResearch({ idea: IDEA_TEXT, token: null, fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
    expect(result).toEqual({ ok: false, kind: 'NETWORK' });
  });

  it.each([
    ['a body that is not JSON', async () => new Response('<html>', { status: 200 })],
    ['a body of the wrong shape', async () => json({ cases: 'nope', ai: null })],
    ['a case that is not readable', async () => json({ cases: [{ id: 'x' }], ai: null })],
  ])('reports BAD_RESPONSE for %s', async (_label, fetchImpl) => {
    expect(await fetchIdeaResearch({ idea: IDEA_TEXT, token: null, fetchImpl })).toEqual({ ok: false, kind: 'BAD_RESPONSE' });
  });
});

describe('prepareBuilderIdea', () => {
  const ok = () => json({ success: true, ideaId: 'idea_research_1' });

  it('saves the idea with the signed-in token and returns the id to open', async () => {
    const fetchImpl = vi.fn(async () => ok());
    const result = await prepareBuilderIdea({ idea: ai, token: 'token-123', fetchImpl });
    expect(result).toEqual({ ok: true, ideaId: 'idea_research_1' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/build/prepare');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
    expect(JSON.parse(String(init.body))).toEqual({ idea: ai });
  });

  it('refreshes the token once and sends again after a 401', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json({ error: 'Authentication required' }, 401)).mockResolvedValueOnce(ok());
    const result = await prepareBuilderIdea({ idea: ai, token: 'stale', refreshToken: async () => 'fresh', fetchImpl });
    expect(result).toEqual({ ok: true, ideaId: 'idea_research_1' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(((fetchImpl.mock.calls[1] as unknown as [string, RequestInit])[1].headers as Record<string, string>).Authorization).toBe('Bearer fresh');
  });

  it('asks to log in when a 401 cannot be fixed by refreshing', async () => {
    const unauthorized = () => json({ error: 'Authentication required' }, 401);
    const fetchImpl = vi.fn(async () => unauthorized());
    expect(await prepareBuilderIdea({ idea: ai, token: 't', fetchImpl })).toEqual({ ok: false, kind: 'LOGIN_REQUIRED' });
    expect(await prepareBuilderIdea({ idea: ai, token: 't', refreshToken: async () => null, fetchImpl })).toEqual({ ok: false, kind: 'LOGIN_REQUIRED' });
    expect(await prepareBuilderIdea({ idea: ai, token: 't', refreshToken: async () => 't', fetchImpl })).toEqual({ ok: false, kind: 'LOGIN_REQUIRED' });
  });

  it('does not retry other failures', async () => {
    const refreshToken = vi.fn(async () => 'fresh');
    const fetchImpl = vi.fn(async () => json({ error: 'busy' }, 429));
    expect(await prepareBuilderIdea({ idea: ai, token: 't', refreshToken, fetchImpl })).toEqual({ ok: false, kind: 'RATE_LIMITED' });
    expect(refreshToken).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a server error', async () => json({ error: 'Idea could not be prepared for building' }, 503)],
    ['an invalid idea', async () => json({ error: 'Invalid idea payload' }, 400)],
    ['an OK answer without an id', async () => json({ success: true })],
    ['an OK answer with an empty id', async () => json({ success: true, ideaId: '' })],
    ['an OK answer that is not JSON', async () => new Response('ok', { status: 200 })],
    ['a network error', async () => { throw new TypeError('Failed to fetch'); }],
  ])('reports FAILED for %s and never claims success', async (_label, fetchImpl) => {
    expect(await prepareBuilderIdea({ idea: ai, token: 't', fetchImpl })).toEqual({ ok: false, kind: 'FAILED' });
  });
});
