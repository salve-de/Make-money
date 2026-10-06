/**
 * サイトの基準URL（1か所）。
 *
 * 本番ドメインはコードに書かない。公開の手順書どおり、ビルド時に環境変数 NEXT_PUBLIC_SITE_URL を設定する
 * （例: https://example.com 。末尾のスラッシュ・パス・クエリは無視して、オリジンだけを使う）。
 * 未設定・不正な値のときは開発用の http://localhost:3000 に落とす。
 * NEXT_PUBLIC_ の値はビルド時に埋め込まれるため、公開用のビルドを作る前に必ず設定する。
 */
const DEV_FALLBACK_URL = 'http://localhost:3000';

/** 環境変数の値からオリジンを取り出す。http / https 以外や解釈できない値は null。 */
export function normalizeSiteUrl(raw: string | undefined | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** 本番用の基準URLが設定されているか（公開前の点検用）。 */
export function isSiteUrlConfigured(): boolean {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) !== null;
}

/** 基準URL（末尾スラッシュなし）。 */
export function siteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? DEV_FALLBACK_URL;
}

/** 基準URLにパスを付けた絶対URL。パスは / で始める（付けなければ補う）。 */
export function absoluteUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl()}${normalized}`;
}
