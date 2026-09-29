/**
 * サイトのURLから、比べるためのドメインを取り出す。
 * www.を除き、小文字にする。パス・ポート・クエリは捨てる。
 * 解釈できないもの（空、http/https以外、IPアドレス、認証情報つき、ドットのないホスト）は null。
 */
export function siteDomain(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || raw.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) return null;
  let host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('www.')) host = host.slice(4);
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host) || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return null;
  return host;
}

/**
 * 誰のものでもよい共有サービスのホスト。ここにある公式サイトは、
 * 「決済アカウントのサイトと同じ」だけでは持ち主を確認できないため、照合の対象にしない。
 * よく使われるものだけを挙げた簡易リストで、網羅はしない。
 */
const SHARED_SITE_ROOTS = [
  'github.com', 'gitlab.com', 'bitbucket.org',
  'x.com', 'twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com',
  'youtube.com', 'youtu.be', 'tiktok.com', 'reddit.com',
  'medium.com', 'substack.com', 'notion.so', 'wikipedia.org',
  'apps.apple.com', 'play.google.com', 'chromewebstore.google.com', 'docs.google.com', 'sites.google.com',
  'producthunt.com', 'indiehackers.com', 'ycombinator.com', 'linktr.ee',
] as const;

export function isSharedSiteDomain(domain: string): boolean {
  return SHARED_SITE_ROOTS.some((root) => domain === root || domain.endsWith(`.${root}`));
}
