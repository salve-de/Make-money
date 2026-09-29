import { NextRequest, NextResponse } from 'next/server';

import { deleteNewsletterSubscriber } from '@/lib/notifications/recipients';
import { verifyNewsletterUnsubscribe } from '@/lib/notifications/unsubscribe-link';

export const dynamic = 'force-dynamic';

/**
 * The "stop sending" link in newsletter emails.
 *
 * GET only shows a confirmation page: mail scanners and link previews fetch every link in
 * a message, and that must not unsubscribe anyone. POST does the work, and is also what a
 * mail client sends for one-click unsubscribe (RFC 8058, List-Unsubscribe-Post). The
 * signature in the link is the only credential, so no login is needed.
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

/** The subscriber id and signature from the query string, or null when either is missing or malformed. */
async function verifiedLink(request: NextRequest): Promise<{ id: string; signature: string } | null> {
  const id = request.nextUrl.searchParams.get('u') ?? '';
  const signature = request.nextUrl.searchParams.get('s') ?? '';
  return await verifyNewsletterUnsubscribe(id, signature) ? { id, signature } : null;
}

export async function GET(request: NextRequest) {
  const link = await verifiedLink(request);
  if (!link) return invalidLink();
  const action = `/api/notifications/unsubscribe?u=${encodeURIComponent(link.id)}&s=${link.signature}`;
  return page(
    '配信を停止しますか？',
    '<p>「新着をメールで受け取る」の配信を停止します。</p>'
    + `<form method="post" action="${escapeHtml(action)}"><button type="submit">配信を停止する</button></form>`,
  );
}

export async function POST(request: NextRequest) {
  const link = await verifiedLink(request);
  if (!link) return invalidLink();
  try {
    await deleteNewsletterSubscriber(link.id);
  } catch (error) {
    console.error('[notifications/unsubscribe] delete failed:', error);
    return page('配信を停止できませんでした', '<p>現在、処理できません。時間をおいて、もう一度お試しください。</p>', 503);
  }
  return page('配信を停止しました', '<p>今後、新着事例のメールはお送りしません。</p>');
}
