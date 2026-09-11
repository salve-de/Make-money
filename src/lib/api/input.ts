import { compileParser } from '@/shared/validate-json';

const DEFAULT_JSON_BODY_BYTES = 256 * 1024;
const text = { type: 'string', minLength: 1, maxLength: 2048, pattern: '\\S' };
const optionalText = { type: 'string', maxLength: 2048 };
const money = { anyOf: [{ type: 'integer' }, { type: 'string', maxLength: 20, pattern: '^-?[0-9]+$' }] };
const parseNewsletterShape = compileParser<{ email: string; source?: string }>({
  type: 'object', additionalProperties: false, required: ['email'],
  properties: { email: { type: 'string', minLength: 3, maxLength: 320, pattern: '\\S' }, source: { type: 'string', minLength: 1, maxLength: 120, pattern: '\\S' } },
}, 'newsletter request');
const parseNewsletterUnsubscribeShape = compileParser<{ unsubscribeToken: string }>({
  type: 'object', additionalProperties: false, required: ['unsubscribeToken'],
  properties: { unsubscribeToken: { type: 'string', minLength: 16, maxLength: 128, pattern: '^\\S+$' } },
}, 'newsletter unsubscribe request');
const parseSubmissionShape = compileParser<{
  businessName: string; url: string; monthlyRevenue: string | number; monthlyProfit: string | number;
  toolsUsed?: string; acquisitionChannel?: string; proofScreenshotUrl?: string;
}>({
  type: 'object', additionalProperties: false, required: ['businessName', 'url', 'monthlyRevenue', 'monthlyProfit'],
  properties: { businessName: { ...text, maxLength: 200 }, url: { ...text, maxLength: 2048 }, monthlyRevenue: money, monthlyProfit: money,
    toolsUsed: optionalText, acquisitionChannel: optionalText, proofScreenshotUrl: optionalText },
}, 'submission request');
const parseBookmarkShape = compileParser<{ itemType: 'business' | 'idea' | 'signal'; itemId: string }>({
  type: 'object', additionalProperties: false, required: ['itemType', 'itemId'], properties: {
    itemType: { type: 'string', enum: ['business', 'idea', 'signal'] }, itemId: { ...text, maxLength: 256 },
  },
}, 'bookmark request');

export class RequestBodyTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super(`Request body exceeds ${maxBytes} bytes`);
    this.name = 'RequestBodyTooLargeError';
  }
}

/** Read a request body without trusting Content-Length; chunked requests are bounded too. */
export async function readTextBody(req: Request, maxBytes = DEFAULT_JSON_BODY_BYTES): Promise<string> {
  const declaredLength = req.headers.get('content-length');
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isFinite(parsedLength) || parsedLength < 0) throw new Error('Invalid Content-Length');
    if (parsedLength > maxBytes) throw new RequestBodyTooLargeError(maxBytes);
  }

  if (!req.body) throw new Error('Request body is empty');
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new Error('Invalid request body chunk');
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError(maxBytes);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function readJsonBody(req: Request, maxBytes = DEFAULT_JSON_BODY_BYTES): Promise<unknown> {
  return JSON.parse(await readTextBody(req, maxBytes));
}

function httpUrl(value: string) {
  const result = value.trim();
  const url = new URL(result);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid URL protocol');
  return result;
}

export function parseNewsletter(input: unknown) {
  const data = parseNewsletterShape(input);
  const email = data.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email');
  return { email, source: data.source?.trim() ?? 'web_portal' };
}

export function parseNewsletterUnsubscribe(input: unknown) {
  const data = parseNewsletterUnsubscribeShape(input);
  return { unsubscribeToken: data.unsubscribeToken.trim() };
}

export function parseSubmission(input: unknown) {
  const data = parseSubmissionShape(input);
  const monthlyRevenue = Number(data.monthlyRevenue);
  const monthlyProfit = Number(data.monthlyProfit);
  // PostgreSQL integer columns: reject overflow before attempting persistence.
  if (!Number.isInteger(monthlyRevenue) || monthlyRevenue < 0 || monthlyRevenue > 2147483647 ||
      !Number.isInteger(monthlyProfit) || monthlyProfit < -2147483648 || monthlyProfit > 2147483647) {
    throw new Error('Invalid money amount');
  }
  return { businessName: data.businessName.trim(), url: httpUrl(data.url), monthlyRevenue, monthlyProfit,
    toolsUsed: data.toolsUsed?.trim() ?? '', acquisitionChannel: data.acquisitionChannel?.trim() ?? '',
    proofScreenshotUrl: data.proofScreenshotUrl?.trim() ? httpUrl(data.proofScreenshotUrl) : '' };
}

export function parseBookmark(input: unknown) {
  const data = parseBookmarkShape(input);
  return { itemType: data.itemType, itemId: data.itemId.trim() };
}

export async function readInput<T>(req: Request, parse: (input: unknown) => T, maxBytes = DEFAULT_JSON_BODY_BYTES): Promise<T | null> {
  try { return parse(await readJsonBody(req, maxBytes)); } catch { return null; }
}
