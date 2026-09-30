import { sha256Sync } from '@/shared/sha256';
import { SITE_OWNERSHIP_DNS_PREFIX, SITE_OWNERSHIP_FILE_PATH } from '@/shared/verification';

/**
 * 事例の公式サイトを本当に運営しているかの確認。
 * Stripeのビジネス設定のURLは誰でも書き換えられるので、それだけでは持ち主の証明にならない。
 * 運営者だけが置けるもの（サイトのファイル、またはDNSのTXTレコード）に合言葉があるかを見る。
 *
 * 合言葉はログイン中の利用者とドメインから決まる。サイトで公開されても、別の利用者の確認には使えない。
 */
export function siteOwnershipToken(userId: string, domain: string): string {
  return `kinrokoku-verify-${sha256Sync(`kinrokoku-site-ownership:v1:${userId}:${domain}`).slice(0, 40)}`;
}

export const siteOwnershipDnsName = (domain: string) => `${SITE_OWNERSHIP_DNS_PREFIX}.${domain}`;

const TIMEOUT_MS = 5000;
const MAX_BODY_CHARS = 4096;
const DNS_OVER_HTTPS = 'https://cloudflare-dns.com/dns-query';

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

/** 同じサイトの www. 付き・無しの間の移動だけを許す（ほかのサイトへ飛ばして合言葉を置く抜け道を塞ぐ）。 */
function sameSite(url: string, domain: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === 'https:' && (host === domain || host === `www.${domain}`);
  } catch {
    return false;
  }
}

async function fileHasToken(domain: string, token: string, fetcher: Fetcher): Promise<boolean> {
  let url = `https://${domain}${SITE_OWNERSHIP_FILE_PATH}`;
  for (let hop = 0; hop < 3; hop += 1) {
    const response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'text/plain' } });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location');
      if (!next) return false;
      const resolved = new URL(next, url).toString();
      if (!sameSite(resolved, domain)) return false;
      url = resolved;
      continue;
    }
    if (!response.ok) return false;
    const body = (await response.text()).slice(0, MAX_BODY_CHARS);
    return body.split(/\s+/).includes(token);
  }
  return false;
}

async function dnsHasToken(domain: string, token: string, fetcher: Fetcher): Promise<boolean> {
  const query = `${DNS_OVER_HTTPS}?name=${encodeURIComponent(siteOwnershipDnsName(domain))}&type=TXT`;
  const response = await fetcher(query, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'application/dns-json' } });
  if (!response.ok) return false;
  const body = await response.json() as { Answer?: Array<{ type?: number; data?: unknown }> };
  return (body.Answer ?? []).some((answer) => answer.type === 16 && typeof answer.data === 'string'
    && answer.data.replace(/"\s*"/g, '').replace(/^"|"$/g, '').trim() === token);
}

/** サイトのファイルかDNSのどちらかに合言葉があれば true。どちらも読めなければ false（持ち主とは扱わない）。 */
export async function proveSiteOwnership(domain: string, token: string, fetcher: Fetcher = fetch): Promise<boolean> {
  for (const check of [fileHasToken, dnsHasToken]) {
    try {
      if (await check(domain, token, fetcher)) return true;
    } catch {
      // 読めない・時間切れは「確認できなかった」として次の方法へ
    }
  }
  return false;
}
