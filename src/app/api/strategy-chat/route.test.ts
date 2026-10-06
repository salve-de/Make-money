import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  env: vi.fn(),
  verify: vi.fn(),
  rate: vi.fn(),
  gemini: vi.fn(),
  execute: vi.fn(),
  query: vi.fn(),
  batch: vi.fn(),
  release: vi.fn(),
}));

vi.mock('@/lib/runtime/cloudflare', () => ({ getRuntimeEnvValue: mocks.env }));
vi.mock('@/lib/firebase/server', () => ({ verifyFirebaseIdToken: mocks.verify }));
vi.mock('@/lib/security/rate-limit', () => ({ consumeRequestRateLimit: mocks.rate }));
vi.mock('@/lib/strategy/gemini', () => ({
  callGeminiApi: mocks.gemini,
  boundedGeminiText: (text: string) => text,
}));
vi.mock('@/lib/storage/d1', () => ({ executeD1: mocks.execute, queryD1: mocks.query, batchD1: mocks.batch }));
vi.mock('@/lib/company-access/catalog-release', () => ({
  CatalogUnavailableError: class CatalogUnavailableError extends Error {},
  findReleaseEntity: vi.fn(async () => null),
  readReleaseSummaries: mocks.release,
}));

import { POST } from './route';

function chat(token?: string) {
  return new NextRequest('http://localhost/api/strategy-chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ action: 'CHAT', messages: [{ role: 'user', content: '最新の相場は？' }] }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.env.mockImplementation(async (name: string) => (name === 'GEMINI_API_KEY' ? 'test-gemini-key' : undefined));
  mocks.verify.mockImplementation(async (token: string) => (token === 'valid' ? { uid: 'user-1' } : null));
  mocks.rate.mockResolvedValue(true);
  mocks.execute.mockResolvedValue({ changes: 1 });
  mocks.query.mockResolvedValue([]);
  mocks.gemini.mockResolvedValue({ text: '答え\nPROMPTS:\n次の質問1\n次の質問2\n次の質問3' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('POST /api/strategy-chat の生成AI費用の守り', () => {
  it('生成AIの鍵があるのに未ログインなら、AIを呼ばず 401', async () => {
    const response = await POST(chat());
    expect(response.status).toBe(401);
    expect(mocks.gemini).not.toHaveBeenCalled();
    expect(mocks.rate).not.toHaveBeenCalled();
  });

  it('ログイン済みなら、本人の ID で回数を数えてから AI を呼ぶ', async () => {
    const response = await POST(chat('valid'));
    expect(response.status).toBe(200);
    expect(mocks.rate).toHaveBeenCalledWith(expect.anything(), 'strategy-chat-ai', expect.objectContaining({ subject: 'user-1', limit: 60 }));
    expect(mocks.gemini).toHaveBeenCalledTimes(1);
    expect((await response.json()).engine).toBe('gemini');
  });

  it('上限を超えたら 429 と Retry-After を返し、AI を呼ばない', async () => {
    mocks.rate.mockResolvedValue(false);
    const response = await POST(chat('valid'));
    expect(response.status).toBe(429);
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(mocks.gemini).not.toHaveBeenCalled();
  });

  it('回数を数えられない時は、費用のかかる AI を呼ばず内蔵の推論で答える', async () => {
    mocks.rate.mockRejectedValue(new Error('D1 offline'));
    const response = await POST(chat('valid'));
    expect(response.status).toBe(200);
    expect((await response.json()).engine).toBe('fallback_internal');
    expect(mocks.gemini).not.toHaveBeenCalled();
  });

  it('想定外の失敗では、内部のエラー文を返さない', async () => {
    mocks.env.mockImplementation(async () => undefined);
    mocks.query.mockRejectedValue(new Error('secret-bucket-name unreachable'));
    mocks.execute.mockRejectedValue(new Error('secret-bucket-name unreachable'));
    mocks.release.mockRejectedValue(new Error('secret-bucket-name unreachable'));
    const synth = new NextRequest('http://localhost/api/strategy-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'SYNTHESIZE', selectedEntityIds: [], notes: {} }),
    });
    const response = await POST(synth);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('secret-bucket-name');
  });
});
