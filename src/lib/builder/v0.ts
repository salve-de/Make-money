import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';

const V0_BASE_URL = 'https://api.v0.dev/v2';
const MAX_JSON_BYTES = 2 * 1024 * 1024;

export interface V0Usage {
  model: string | null;
  creditsCost: number;
  tokensTotal: number;
}

export interface V0ChatResult {
  chatId: string;
  title?: string;
  usage: V0Usage;
}

export interface V0MessageResult {
  messageId: string;
  content: string;
  usage: V0Usage;
}

export interface V0Preview {
  url: string;
  token: string;
  expiresAt: string;
}

class V0ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'V0ApiError';
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid v0 response');
  return value as Record<string, unknown>;
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function usageFrom(value: unknown): V0Usage {
  const root = record(value);
  const tokens = root.tokens && typeof root.tokens === 'object' ? record(root.tokens) : {};
  const credits = root.creditsCost && typeof root.creditsCost === 'object' ? record(root.creditsCost) : {};
  return {
    model: typeof root.model === 'string' ? root.model : null,
    creditsCost: number(credits.total),
    tokensTotal: number(tokens.total),
  };
}

async function requestV0(
  apiKey: string,
  path: string,
  init: RequestInit = {},
  timeoutMs = 180_000,
): Promise<unknown> {
  const response = await fetch(`${V0_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await response.text();
  if (text.length > MAX_JSON_BYTES) throw new Error('v0 response exceeded size limit');

  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new V0ApiError('v0 returned an invalid response', response.status);
    }
  }

  if (!response.ok) {
    const errorRecord = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : {};
    const message = typeof errorRecord.message === 'string'
      ? errorRecord.message
      : typeof errorRecord.error === 'string'
      ? errorRecord.error
      : `v0 API request failed (${response.status})`;
    throw new V0ApiError(message, response.status);
  }

  return payload;
}

export async function getV0ApiKey(): Promise<string | undefined> {
  return getRuntimeEnvValue('V0_API_KEY', { runtimeFirst: true });
}

export async function createV0Chat(
  apiKey: string,
  input: { message: string; title: string; systemPrompt: string; metadata: Record<string, string> },
): Promise<V0ChatResult> {
  const payload = record(await requestV0(apiKey, '/chats', {
    method: 'POST',
    body: JSON.stringify({
      message: input.message,
      title: input.title.slice(0, 120),
      systemPrompt: input.systemPrompt,
      privacy: 'private',
      metadata: input.metadata,
      modelConfiguration: { modelId: 'v0-mini', imageGenerations: false },
    }),
  }));

  const chat = record(payload.chat);
  if (typeof chat.id !== 'string' || !chat.id) throw new Error('v0 response did not contain a chat id');

  return {
    chatId: chat.id,
    title: typeof chat.title === 'string' ? chat.title : undefined,
    usage: usageFrom(payload.usage),
  };
}

export async function sendV0Message(
  apiKey: string,
  chatId: string,
  message: string,
): Promise<V0MessageResult> {
  const payload = record(await requestV0(apiKey, `/chats/${encodeURIComponent(chatId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      message,
      modelConfiguration: { modelId: 'v0-mini', imageGenerations: false },
    }),
  }));

  if (typeof payload.id !== 'string' || typeof payload.content !== 'string') {
    throw new Error('v0 response did not contain a valid message');
  }

  return {
    messageId: payload.id,
    content: payload.content,
    usage: usageFrom(payload.usage),
  };
}

export async function getV0Preview(apiKey: string, chatId: string): Promise<V0Preview | null> {
  const payload = await requestV0(apiKey, `/chats/${encodeURIComponent(chatId)}/preview`, { method: 'GET' }, 30_000);
  if (payload === null) return null;

  const preview = record(payload);
  if (typeof preview.url !== 'string' || typeof preview.token !== 'string') throw new Error('Invalid v0 preview response');
  const url = new URL(preview.url);
  if (url.protocol !== 'https:') throw new Error('v0 preview must use HTTPS');

  return {
    url: url.toString(),
    token: preview.token,
    expiresAt: typeof preview.expiresAt === 'string'
      ? preview.expiresAt
      : new Date(Date.now() + 5 * 60_000).toISOString(),
  };
}

function hostMatches(hostname: string, pattern: string): boolean {
  const host = hostname.toLowerCase();
  const p = pattern.toLowerCase();
  if (p === host) return true;
  if (p.startsWith('**.')) return host.endsWith(`.${p.slice(3)}`);
  if (p.startsWith('*.')) {
    const suffix = p.slice(2);
    const labels = host.split('.');
    return labels.length === suffix.split('.').length + 1 && host.endsWith(`.${suffix}`);
  }
  return false;
}

export async function ensureV0PreviewHost(apiKey: string, hostname: string): Promise<void> {
  const host = hostname.trim().toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return;

  const payload = record(await requestV0(apiKey, '/settings/preview-hosts', { method: 'GET' }, 30_000));
  const hosts = Array.isArray(payload.hosts) ? payload.hosts.filter((value): value is string => typeof value === 'string') : [];
  if (hosts.some((pattern) => hostMatches(host, pattern))) return;

  await requestV0(apiKey, '/settings/preview-hosts', {
    method: 'PATCH',
    body: JSON.stringify({ hosts: [host] }),
  }, 30_000);
}


export async function downloadV0Source(apiKey: string, chatId: string): Promise<Response> {
  const response = await fetch(`${V0_BASE_URL}/chats/${encodeURIComponent(chatId)}/files/download`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/zip' },
    cache: 'no-store',
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const message = (await response.text()).slice(0, 1000);
    throw new V0ApiError(message || `v0 source export failed (${response.status})`, response.status);
  }
  return response;
}
