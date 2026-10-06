import { NextRequest, NextResponse } from 'next/server';

import { checkNewsletterConfirmLink } from '@/lib/notifications/confirm-link';
import { executeD1, queryD1 } from '@/lib/storage/d1';

export const dynamic = 'force-dynamic';

/**
 * The "finish sign-up" link in the confirmation mail (double opt-in).
 *
 * GET only shows a page with a button; POST does the work. Mail scanners and link
 * previews fetch every link in a message with GET, and that must not subscribe anyone
 * (the same reason as the unsubscribe link). The signed, expiring link is the only
 * credential, so no login is needed. The address never appears in the page or URL.
 */
const responseHeaders = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function page(title: string, body: string, status = 200): NextResponse {
  const html = '<!doctype html><html lang="ja"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'
    + `<title>${title}</title>`
    + '<style>body{margin:0;padding:24px 16px;background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,'
    + "'Hiragino Sans','Yu Gothic',Meiryo,sans-serif;line-height:1.7}main{max-width:32rem;margin:0 auto}"
    + 'h1{font-size:18px}button{font:inherit;min-height:44px;padding:0 20px;cursor:pointer}</style></head>'
    + `<body><main><h1>${title}</h1>${body}</main></body></html>`;
  return new NextResponse(html, { status, headers: responseHeaders });
}

const invalidLink = () => page(
  'このリンクは使えません',
  '<p>リンクが正しくありません。メールに書かれているリンクを、そのままお使いください。</p>',
  400,
);

const expiredLink = () => page(
  'リンクの有効期限が切れています',
  '<p>確認メールのリンクは、送信から48時間で無効になります。サイトの登録フォームからもう一度登録すると、新しい確認メールが届きます。</p>',
  410,
);

type Link = { id: string; expiresAt: string; signature: string };

async function readLink(request: NextRequest): Promise<{ link: Link } | { response: NextResponse }> {
  const params = request.nextUrl.searchParams;
  const link = { id: params.get('u') ?? '', expiresAt: params.get('e') ?? '', signature: params.get('s') ?? '' };
  const check = await checkNewsletterConfirmLink(link.id, link.expiresAt, link.signature);
  if (check === 'invalid') return { response: invalidLink() };
  if (check === 'expired') return { response: expiredLink() };
  return { link };
}

export async function GET(request: NextRequest) {
  const checked = await readLink(request);
  if ('response' in checked) return checked.response;
  const { link } = checked;
  const action = `/api/newsletter/confirm?u=${encodeURIComponent(link.id)}&e=${link.expiresAt}&s=${link.signature}`;
  return page(
    '登録を完了しますか？',
    '<p>「新着をメールで受け取る」の登録を完了します。ボタンを押すまでは、登録されません。</p>'
    + `<form method="post" action="${escapeHtml(action)}"><button type="submit">登録を完了する</button></form>`,
  );
}

export async function POST(request: NextRequest) {
  const checked = await readLink(request);
  if ('response' in checked) return checked.response;
  try {
    await executeD1(
      "UPDATE newsletter_subscribers SET confirmed_at=CURRENT_TIMESTAMP, status='active' WHERE id=? AND confirmed_at IS NULL",
      [checked.link.id],
    );
    const rows = await queryD1('SELECT confirmed_at AS confirmedAt FROM newsletter_subscribers WHERE id=?', [checked.link.id]);
    // The row is gone when the person already cancelled it; nothing is created from a link alone.
    if (rows.length !== 1 || typeof rows[0].confirmedAt !== 'string') {
      return page('登録が見つかりません', '<p>この登録はすでに取り消されています。必要な場合は、サイトの登録フォームからもう一度登録してください。</p>', 404);
    }
  } catch (error) {
    console.error('[newsletter/confirm] confirm failed:', error instanceof Error ? error.name : 'unknown');
    return page('登録を完了できませんでした', '<p>現在、処理できません。時間をおいて、もう一度お試しください。</p>', 503);
  }
  return page('登録が完了しました', '<p>今後、新着事例のメールをお送りします。配信は、メール内の停止リンクからいつでも止められます。</p>');
}
