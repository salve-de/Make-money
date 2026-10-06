import type { MetadataRoute } from 'next';
import { catalogIds } from '@/shared/catalog-membership';
import { buildSitemapEntries } from '@/lib/site/sitemap-entries';

/**
 * 公開目録（data/catalog-release.json）の事例IDだけを使う。R2・外部通信は使わない。
 * 事例が5万件に近づいたら generateSitemaps で分割する（現状は 3,000 件規模のため1ファイルで足りる）。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries(catalogIds());
}
