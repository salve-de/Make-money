import { compileParser } from '@/shared/validate-json';

const text = { type: 'string', minLength: 1, pattern: '\\S' };
const optionalText = { type: 'string' };
const money = { anyOf: [{ type: 'integer' }, { type: 'string', pattern: '^-?[0-9]+$' }] };
const parseNewsletterShape = compileParser<{ email: string; source?: string }>({
  type: 'object', required: ['email'], properties: { email: text, source: text },
}, 'newsletter request');
const parseSubmissionShape = compileParser<{
  businessName: string; url: string; monthlyRevenue: string | number; monthlyProfit: string | number;
  toolsUsed?: string; acquisitionChannel?: string; proofScreenshotUrl?: string;
}>({
  type: 'object', required: ['businessName', 'url', 'monthlyRevenue', 'monthlyProfit'],
  properties: { businessName: text, url: text, monthlyRevenue: money, monthlyProfit: money,
    toolsUsed: optionalText, acquisitionChannel: optionalText, proofScreenshotUrl: optionalText },
}, 'submission request');
const parseBookmarkShape = compileParser<{ itemType: 'business' | 'idea' | 'signal'; itemId: string }>({
  type: 'object', required: ['itemType', 'itemId'], properties: {
    itemType: { enum: ['business', 'idea', 'signal'] }, itemId: text,
  },
}, 'bookmark request');

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

export async function readInput<T>(req: Request, parse: (input: unknown) => T): Promise<T | null> {
  try { return parse(await req.json()); } catch { return null; }
}
