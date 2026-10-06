import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site/url';

/** 検索に出さない経路。API・作業中の画面・個人のページ・メンテナンス表示。 */
export const DISALLOWED_PATHS: readonly string[] = [
  '/api/',
  '/alerts',
  '/execute',
  '/build',
  '/verify',
  '/success',
  '/compare',
  '/marketplace/new',
  '/marketplace/businesses/new',
  '/marketplace/businesses/mine',
  '/maintenance',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: [...DISALLOWED_PATHS] }],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
