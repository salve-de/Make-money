import type { MetadataRoute } from 'next';
import { absoluteUrl } from './url';

/** sitemap 1ファイルの上限（URL数 50,000 / 50MB）。 */
export const SITEMAP_MAX_URLS = 50_000;

/** 検索に出してよい固定ページ。ログイン・個人データ・作業中の画面は入れない。 */
export const PUBLIC_STATIC_PATHS: readonly string[] = [
  '/',
  '/welcome',
  '/marketplace',
  '/marketplace/businesses',
  '/legal/terms',
  '/legal/privacy',
  '/legal/tokushoho',
];

/** 固定ページ＋公開目録の事例。上限を超える分は事例の末尾から切る（固定ページは必ず残す）。 */
export function buildSitemapEntries(catalogIds: readonly string[]): MetadataRoute.Sitemap {
  const staticEntries = PUBLIC_STATIC_PATHS.map((path) => ({ url: absoluteUrl(path) }));
  const room = Math.max(0, SITEMAP_MAX_URLS - staticEntries.length);
  const entityEntries = [...catalogIds]
    .sort()
    .slice(0, room)
    .map((id) => ({ url: absoluteUrl(`/?entity=${encodeURIComponent(id)}`) }));
  return [...staticEntries, ...entityEntries];
}
