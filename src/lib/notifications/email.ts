import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';

/**
 * Outgoing mail through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
 * No SDK: the Worker only needs one POST. Nothing is sent unless RESEND_API_KEY and
 * NOTIFY_FROM_EMAIL are both set, and neither value is ever logged.
 */
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_MS = 1_000;
const MAX_RETRY_MS = 5_000;

/** Most cases one email lists. The rest are summarized as a count with a link to the site. */
export const MAX_MAIL_ENTITIES = 10;

export interface EmailConfig {
  apiKey: string;
  from: string;
}

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
  /** Resend keeps the first result for 24 hours, so a retry of the same mail is never a second mail. */
  idempotencyKey?: string;
}

export type SendEmailResult =
  | { ok: true; id: string | null; duplicate?: boolean }
  | { ok: false; status: number; retryable: boolean; code: string | null };

export async function readEmailConfig(): Promise<EmailConfig | null> {
  const [apiKey, from] = await Promise.all([
    getRuntimeEnvValue('RESEND_API_KEY'),
    getRuntimeEnvValue('NOTIFY_FROM_EMAIL'),
  ]);
  // A line break in the sender would let a configuration value add mail headers.
  if (!apiKey || !from || /[\r\n]/.test(from) || !from.includes('@')) return null;
  return { apiKey, from };
}

export async function isEmailConfigured(): Promise<boolean> {
  return (await readEmailConfig()) !== null;
}

/** Placeholder and reserved domains can never receive mail; do not spend a send on them. */
const UNDELIVERABLE_HOST = /(^|\.)(example\.(com|net|org)|example|invalid|test|localhost)$/i;

/**
 * True only for a real-looking address. `/api/user/me` stores `<uid>@anon.example.com` for
 * accounts that have no email; that placeholder must never be mailed or treated as a person.
 */
export function isDeliverableEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const email = value.trim();
  if (email.length > 254 || !/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/.test(email)) return false;
  return !UNDELIVERABLE_HOST.test(email.slice(email.lastIndexOf('@') + 1));
}

async function errorName(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    const name = body && typeof body === 'object' ? (body as { name?: unknown }).name : null;
    return typeof name === 'string' ? name.slice(0, 80) : null;
  } catch {
    return null;
  }
}

function retryDelayMs(response: Response): number {
  const header = response.headers.get('retry-after') ?? response.headers.get('ratelimit-reset');
  const seconds = header === null ? Number.NaN : Number(header);
  const delay = Number.isFinite(seconds) ? seconds * 1_000 : DEFAULT_RETRY_MS;
  return Math.min(Math.max(delay, 250), MAX_RETRY_MS);
}

/**
 * Send one email. A 429 waits and retries with the same idempotency key. Any other
 * failure is returned, not thrown, so one bad address cannot stop a whole digest.
 */
export async function sendEmail(
  message: OutboundEmail,
  options: { sleep?: (ms: number) => Promise<void> } = {},
): Promise<SendEmailResult> {
  const config = await readEmailConfig();
  if (!config) return { ok: false, status: 0, retryable: false, code: 'not_configured' };
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const payload = JSON.stringify({
    from: config.from,
    to: [message.to],
    subject: message.subject,
    text: message.text,
    html: message.html,
    ...(message.headers ? { headers: message.headers } : {}),
  });

  for (let attempt = 1; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey } : {}),
        },
        body: payload,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      // The request may have reached Resend before the connection failed. The idempotency
      // key makes the next attempt safe either way.
      return { ok: false, status: 0, retryable: true, code: 'network' };
    }

    if (response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const id = body && typeof body === 'object' ? (body as { id?: unknown }).id : null;
      return { ok: true, id: typeof id === 'string' ? id : null };
    }

    const code = await errorName(response);
    // The key was already used with a different body: that mail was accepted earlier.
    if (response.status === 409 && code === 'invalid_idempotent_request') return { ok: true, id: null, duplicate: true };
    if (response.status === 429 && attempt < MAX_ATTEMPTS) {
      await sleep(retryDelayMs(response));
      continue;
    }
    return {
      ok: false,
      status: response.status,
      retryable: response.status === 429 || response.status >= 500
        || (response.status === 409 && code === 'concurrent_idempotent_requests'),
      code,
    };
  }
}

// ---------------------------------------------------------------------------
// Message content
// ---------------------------------------------------------------------------

export interface MailEntity {
  id: string;
  name: string;
  tagline: string;
  /** Names of the saved searches that matched this case. Used by alert emails only. */
  conditions?: readonly string[];
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
}

/** Trailing slashes are removed. Anything that is not an http(s) URL is rejected. */
export function normalizeAppUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

export function entityLink(appUrl: string, entityId: string): string {
  return `${appUrl}/?entity=${encodeURIComponent(entityId)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function oneLine(value: string, max: number): string {
  const flat = Array.from(value.replace(/\s+/g, ' ').trim());
  return flat.length > max ? `${flat.slice(0, max - 1).join('')}…` : flat.join('');
}

/** The catalog fills an empty description with a stock sentence; it says nothing, so leave it out. */
const STOCK_TAGLINE = /公開情報観測データ/;
function usableTagline(value: string): string {
  const line = oneLine(value, 90);
  return line && !STOCK_TAGLINE.test(line) ? line : '';
}

function conditionsLabel(names: readonly string[] | undefined): string {
  if (!names || names.length === 0) return '';
  const shown = names.slice(0, 3).map((name) => oneLine(name, 40));
  return names.length > shown.length ? `${shown.join('、')} ほか${names.length - shown.length}件` : shown.join('、');
}

function listText(appUrl: string, entities: readonly MailEntity[]): string {
  return entities.map((entity, index) => {
    const lines = [`${index + 1}. ${oneLine(entity.name, 120)}`];
    const tagline = usableTagline(entity.tagline);
    if (tagline) lines.push(`   ${tagline}`);
    lines.push(`   ${entityLink(appUrl, entity.id)}`);
    const conditions = conditionsLabel(entity.conditions);
    if (conditions) lines.push(`   一致した条件: ${conditions}`);
    return lines.join('\n');
  }).join('\n\n');
}

function listHtml(appUrl: string, entities: readonly MailEntity[]): string {
  const items = entities.map((entity) => {
    const tagline = usableTagline(entity.tagline);
    const conditions = conditionsLabel(entity.conditions);
    return `<li style="margin:0 0 14px"><a href="${escapeHtml(entityLink(appUrl, entity.id))}" style="color:#0b57d0;font-weight:bold">${escapeHtml(oneLine(entity.name, 120))}</a>`
      + (tagline ? `<br>${escapeHtml(tagline)}` : '')
      + (conditions ? `<br><span style="color:#666666;font-size:12px">一致した条件: ${escapeHtml(conditions)}</span>` : '')
      + '</li>';
  }).join('');
  return `<ol style="margin:0 0 16px;padding-left:22px">${items}</ol>`;
}

function restNotice(appUrl: string, total: number, shown: number): { text: string; html: string } {
  const rest = total - shown;
  if (rest <= 0) return { text: '', html: '' };
  return {
    text: `\n\nほか${rest}件は、サイトで確認できます。\n${appUrl}/`,
    html: `<p style="margin:0 0 16px">ほか${rest}件は、<a href="${escapeHtml(`${appUrl}/`)}" style="color:#0b57d0">サイトで確認できます</a>。</p>`,
  };
}

function htmlDocument(body: string): string {
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"></head>'
    + '<body style="margin:0;padding:16px;background:#ffffff;color:#111111;'
    + "font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic',Meiryo,sans-serif;"
    + `font-size:14px;line-height:1.7">${body}</body></html>`;
}

/** Alert for one person: every case from the latest update that matches at least one saved search. */
export function buildSavedSearchEmail(input: {
  appUrl: string;
  entities: readonly MailEntity[];
  total: number;
}): EmailContent {
  const { appUrl, total } = input;
  const entities = input.entities.slice(0, MAX_MAIL_ENTITIES);
  const rest = restNotice(appUrl, total, entities.length);
  const manageUrl = `${appUrl}/alerts`;
  const stopHint = '通知を止めたいときは、上のページで条件ごとの通知をオフにするか、条件を削除してください。';
  const reason = 'このメールは、保存した検索条件の通知をオンにしているためお送りしています。';
  return {
    subject: `【Make Money】保存した条件に合う新着事例が${total}件あります`,
    text: `保存した検索条件に合う新着事例が${total}件ありました。\n\n${listText(appUrl, entities)}${rest.text}`
      + `\n\n----------------------------------------\n条件と通知の管理: ${manageUrl}\n${reason}\n${stopHint}\n`,
    html: htmlDocument(
      `<p style="margin:0 0 16px">保存した検索条件に合う新着事例が${total}件ありました。</p>`
      + listHtml(appUrl, entities)
      + rest.html
      + '<hr style="border:0;border-top:1px solid #dddddd;margin:16px 0">'
      + `<p style="margin:0 0 6px;font-size:12px;color:#555555"><a href="${escapeHtml(manageUrl)}" style="color:#0b57d0">条件と通知の管理</a></p>`
      + `<p style="margin:0;font-size:12px;color:#555555">${escapeHtml(reason)}<br>${escapeHtml(stopHint)}</p>`,
    ),
  };
}

/** Weekly mail for a newsletter subscriber. It always carries a working way to stop. */
export function buildNewsletterEmail(input: {
  appUrl: string;
  entities: readonly MailEntity[];
  total: number;
  releaseLabel: string;
  unsubscribeUrl: string;
}): EmailContent {
  const { appUrl, total, releaseLabel, unsubscribeUrl } = input;
  const entities = input.entities.slice(0, MAX_MAIL_ENTITIES);
  const rest = restNotice(appUrl, total, entities.length);
  const label = oneLine(releaseLabel, 40);
  const intro = `週に1回お送りしている新着事例のお知らせです。最新の更新（${label}）で追加された事例は${total}件でした。`;
  const reason = 'このメールは「新着をメールで受け取る」にご登録いただいたアドレスへお送りしています。';
  return {
    subject: `【Make Money】新着事例のお知らせ（${label}）`,
    text: `${intro}\n\n${listText(appUrl, entities)}${rest.text}`
      + `\n\n----------------------------------------\n配信の停止: ${unsubscribeUrl}\n${reason}\n`,
    html: htmlDocument(
      `<p style="margin:0 0 16px">${escapeHtml(intro)}</p>`
      + listHtml(appUrl, entities)
      + rest.html
      + '<hr style="border:0;border-top:1px solid #dddddd;margin:16px 0">'
      + `<p style="margin:0 0 6px;font-size:12px;color:#555555"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#0b57d0">配信を停止する</a></p>`
      + `<p style="margin:0;font-size:12px;color:#555555">${escapeHtml(reason)}</p>`,
    ),
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

/** Sign-up confirmation (double opt-in). Sent to an address that has not been verified yet, so it says what to do if the person did not ask for it. */
export function buildNewsletterConfirmationEmail(input: { confirmUrl: string; validHours: number }): EmailContent {
  const { confirmUrl, validHours } = input;
  const intro = '「新着をメールで受け取る」へのご登録ありがとうございます。まだ登録は完了していません。下のリンクを開き、表示された画面のボタンを押すと登録が完了します。';
  const expiry = `このリンクの有効期限は${validHours}時間です。`;
  const ignore = 'お心当たりがない場合は、このメールを無視してください。リンクを開かない限り、登録も配信も行われません。';
  return {
    subject: '【Make Money】メールアドレスの確認をお願いします',
    text: `${intro}\n\n登録を完了する: ${confirmUrl}\n\n${expiry}\n${ignore}\n`,
    html: htmlDocument(
      `<p style="margin:0 0 16px">${escapeHtml(intro)}</p>`
      + `<p style="margin:0 0 16px"><a href="${escapeHtml(confirmUrl)}" style="color:#0b57d0;font-weight:bold">登録を完了する</a></p>`
      + '<hr style="border:0;border-top:1px solid #dddddd;margin:16px 0">'
      + `<p style="margin:0;font-size:12px;color:#555555">${escapeHtml(expiry)}<br>${escapeHtml(ignore)}</p>`,
    ),
  };
}
