import { afterEach, describe, expect, it, vi } from 'vitest';
import { boundedGeminiText, callGeminiApi } from './gemini';

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

const textReply = (text: string) => reply({ candidates: [{ content: { parts: [{ text }] } }] });

afterEach(() => vi.restoreAllMocks());

describe('callGeminiApi', () => {
  it('sends the same request as before when no options are given', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(textReply('答え'));
    const result = await callGeminiApi('質問', 'test-key');
    expect(result).toEqual({ text: '答え', sources: undefined });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    expect(String(url)).not.toContain('test-key');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json', 'x-goog-api-key': 'test-key' });
    expect(init?.signal).toBeUndefined();
    expect(JSON.parse(String(init?.body))).toEqual({
      contents: [{ parts: [{ text: '質問' }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    });
  });

  it('turns on Google Search only when asked, and returns the pages it used', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply({
      candidates: [{
        content: { parts: [{ text: '検索つきの答え' }] },
        groundingMetadata: { groundingChunks: [{ web: { uri: 'https://example.com/a', title: '記事A' } }, { web: { uri: 'https://example.com/b' } }, {}] },
      }],
    }));
    const result = await callGeminiApi('質問', 'k', true);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).tools).toEqual([{ googleSearch: {} }]);
    expect(result.sources).toEqual([
      { title: '記事A', url: 'https://example.com/a' },
      { title: 'https://example.com/b', url: 'https://example.com/b' },
    ]);
  });

  it('can ask for JSON, a longer answer and a time limit, but never combines JSON mode with search', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => textReply('{}'));
    await callGeminiApi('質問', 'k', false, { json: true, maxOutputTokens: 4096, timeoutMs: 5000 });
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body)).generationConfig).toEqual({ temperature: 0.3, maxOutputTokens: 4096, responseMimeType: 'application/json' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);

    await callGeminiApi('質問', 'k', true, { json: true });
    const searchBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(searchBody.generationConfig).not.toHaveProperty('responseMimeType');
    expect(searchBody.tools).toEqual([{ googleSearch: {} }]);
  });

  it('throws without echoing the key when Gemini answers with an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply({ error: 'quota' }, 429));
    const failure = await callGeminiApi('質問', 'secret-key').catch((error: Error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe('Gemini API returned status 429');
    expect((failure as Error).message).not.toContain('secret-key');
  });

  it('returns an empty text when Gemini gives no candidate', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply({ candidates: [] }));
    expect((await callGeminiApi('質問', 'k')).text).toBe('');
  });
});

describe('boundedGeminiText', () => {
  it('passes normal text through and rejects empty or oversized answers', () => {
    expect(boundedGeminiText('答え')).toBe('答え');
    expect(() => boundedGeminiText('')).toThrow('Gemini response exceeded the safety limit');
    expect(() => boundedGeminiText('x'.repeat(128 * 1024 + 1))).toThrow('Gemini response exceeded the safety limit');
    expect(boundedGeminiText('x'.repeat(128 * 1024))).toHaveLength(128 * 1024);
  });
});
