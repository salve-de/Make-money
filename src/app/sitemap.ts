import type { MetadataRoute } from 'next';
import { getCatalogMembership } from '@/lib/company-access/release-manifest';
import { buildSitemapEntries } from '@/lib/site/sitemap-entries';

/**
 * 公開目録（いま公開している版）の事例IDだけを使う。版は目印（R2）から数分おきに読み、読めなければ同梱の data/catalog-release.json。
 * 事例が5万件に近づいたら generateSitemaps で分割する（現状は 3,000 件規模のため1ファイルで足りる）。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries((await getCatalogMembership()).catalogIds());
}
