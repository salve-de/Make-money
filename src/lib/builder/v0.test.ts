import { afterEach, describe, expect, it, vi } from 'vitest';
import { createV0Chat, getV0Preview, sendV0Message } from './v0';

afterEach(() => vi.unstubAllGlobals());

describe('v0 builder client', () => {
  it('creates a private v0 chat and records returned credit usage', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.v0.dev/v2/chats');
      expect(init?.method).toBe('POST');
      const headers = new Headers(init?.headers);
      expect(headers.get('authorization')).toBe('Bearer server-key');
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.privacy).toBe('private');
      return new Response(JSON.stringify({
        chat: {
          id: 'chat_123',
          title: 'Test app',
          privacy: 'private',
          createdAt: new Date().toISOString(),
          authorId: 'author',
          metadata: {},
          writePermission: true,
        },
        usage: {
          model: 'v0-mini',
          tokens: { input: 10, output: 20, cacheRead: 0, cacheWrite: 0, total: 30 },
          creditsCost: { input: 0.01, output: 0.02, cacheRead: 0, cacheWrite: 0, total: 0.03 },
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await createV0Chat('server-key', {
      message: 'build',
      title: 'Test app',
      systemPrompt: 'system',
      metadata: { sourceIdeaId: 'idea-1' },
    });
    expect(result.chatId).toBe('chat_123');
    expect(result.usage.creditsCost).toBe(0.03);
    expect(result.usage.tokensTotal).toBe(30);
  });

  it('sends a revision to the same chat', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('https://api.v0.dev/v2/chats/chat_123/messages');
      return new Response(JSON.stringify({
        id: 'msg_1',
        chatId: 'chat_123',
        role: 'assistant',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        content: 'updated',
        parts: [],
        finishReason: 'stop',
        restorable: false,
        authorId: null,
        usage: {
          model: 'v0-mini',
          tokens: { input: 5, output: 5, cacheRead: 0, cacheWrite: 0, total: 10 },
          creditsCost: { input: 0.01, output: 0.01, cacheRead: 0, cacheWrite: 0, total: 0.02 },
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));

    const result = await sendV0Message('server-key', 'chat_123', 'change price');
    expect(result.content).toBe('updated');
    expect(result.usage.creditsCost).toBe(0.02);
  });

  it('accepts only HTTPS preview origins', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      url: 'https://preview.example/',
      token: 'preview-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const preview = await getV0Preview('server-key', 'chat_123');
    expect(preview?.url).toBe('https://preview.example/');
    expect(preview?.token).toBe('preview-token');
  });
});
