import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { queryD1 } from '@/lib/storage/d1';
import { normalizeContactEmail } from '@/shared/business-sale-input';

/**
 * 売り手への「問い合わせが届きました」メール。
 * - RESEND_API_KEY と NOTIFY_FROM_EMAIL が両方そろっているときだけ動く。未設定なら何もしない。
 * - 宛先は D1 の users.email（初回ログイン時に Firebase のトークンから保存したもの）を uid で引く。
 *   取れない・匿名アカウント用の仮アドレスなら送らない。
 * - 買い手のメッセージ本文・連絡先は入れない。サイトで確認するよう案内するだけ。
 * - 失敗しても問い合わせの保存結果は変えない。送れなかった理由の種類だけログに残す（宛先・キーは残さない）。
 */
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 5_000;
/** 掲載ごとの通知メールの上限。別アカウントを大量に作った連投で売り手の受信箱を埋めさせない。 */
const NOTICE_LIMIT_PER_LISTING_PER_HOUR = 3;
const ANONYMOUS_ADDRESS_SUFFIX = '@anon.example.com';
const NOTICE_SUBJECT = '【金鉱録】事業の売買に問い合わせが届きました';

export interface EmailConfig {
  apiKey: string;
  from: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export type NoticeResult =
  | { sent: true }
  | { sent: false; reason: 'not_configured' | 'throttled' | 'no_recipient' | 'failed' };

/** 送信に必要な設定。片方でも欠けたら null（送らない）。 */
export async function readEmailConfig(): Promise<EmailConfig | null> {
  const [apiKey, from] = await Promise.all([getRuntimeEnvValue('RESEND_API_KEY'), getRuntimeEnvValue('NOTIFY_FROM_EMAIL')]);
  return apiKey && from ? { apiKey, from } : null;
}

/** Resend の HTTP API を fetch で呼ぶ小さな関数。成功したときだけ true。 */
export async function sendResendEmail(config: EmailConfig, message: EmailMessage): Promise<boolean> {
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.from, to: [message.to], subject: message.subject, text: message.text }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** 通知メールのリンク元。設定された公開URLだけを使い、リクエストの Host からは作らない。 */
async function readAppOrigin(): Promise<string | null> {
  const configured = await getRuntimeEnvValue('NEXT_PUBLIC_APP_URL');
  if (!configured) return null;
  try {
    const url = new URL(configured);
    return url.protocol === 'https:' || url.hostname === 'localhost' ? url.origin : null;
  } catch {
    return null;
  }
}

/** 掲載名から改行・制御文字を除き、長さをそろえる（メール本文に入れるため）。 */
function plainTitle(title: string): string {
  return Array.from(title).filter((char) => {
    const code = char.codePointAt(0) ?? 0;
    return code >= 0x20 && code !== 0x7f;
  }).slice(0, 100).join('');
}

export function composeInquiryNotice(input: { listingTitle: string; appOrigin: string | null }): EmailMessage['text'] {
  const where = input.appOrigin
    ? `次のページで確認してください。\n${input.appOrigin}/marketplace/businesses/mine`
    : '金鉱録にログインし、「事業の売買」の「自分の掲載」で確認してください。';
  return [
    `金鉱録の「事業の売買」で、あなたの掲載「${plainTitle(input.listingTitle)}」に問い合わせが届きました。`,
    '',
    '問い合わせの内容と連絡先は、このメールには入れていません。',
    where,
    '',
    '心当たりがない場合や、これ以上受け付けたくない場合は、掲載を「募集終了」にしてください。',
  ].join('\n');
}

async function findSellerEmail(sellerUserId: string): Promise<string | null> {
  const rows = await queryD1<{ email: unknown }>('SELECT email FROM users WHERE id=? LIMIT 1', [sellerUserId]);
  const email = normalizeContactEmail(rows[0]?.email);
  return email && !email.endsWith(ANONYMOUS_ADDRESS_SUFFIX) ? email : null;
}

/** 決して throw しない。呼び出し側は結果を見ても見なくてもよい。 */
export async function notifySellerOfInquiry(
  request: Request,
  input: { listingId: string; sellerUserId: string; listingTitle: string },
): Promise<NoticeResult> {
  let result: NoticeResult;
  try {
    result = await deliver(request, input);
  } catch {
    result = { sent: false, reason: 'failed' };
  }
  if (!result.sent && result.reason !== 'not_configured') {
    console.warn('[business-sale] inquiry notice not sent', { reason: result.reason, listingId: input.listingId });
  }
  return result;
}

async function deliver(
  request: Request,
  input: { listingId: string; sellerUserId: string; listingTitle: string },
): Promise<NoticeResult> {
  const config = await readEmailConfig();
  if (!config) return { sent: false, reason: 'not_configured' };

  const allowed = await consumeRequestRateLimit(request, 'business-sale-notice', {
    limit: NOTICE_LIMIT_PER_LISTING_PER_HOUR,
    windowMs: 60 * 60 * 1000,
    subject: input.listingId,
  });
  if (!allowed) return { sent: false, reason: 'throttled' };

  const to = await findSellerEmail(input.sellerUserId);
  if (!to) return { sent: false, reason: 'no_recipient' };

  const text = composeInquiryNotice({ listingTitle: input.listingTitle, appOrigin: await readAppOrigin() });
  return (await sendResendEmail(config, { to, subject: NOTICE_SUBJECT, text }))
    ? { sent: true }
    : { sent: false, reason: 'failed' };
}
