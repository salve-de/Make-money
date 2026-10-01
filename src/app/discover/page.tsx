import type { Metadata } from 'next';
import { CatalogUnavailableError, readReleaseDiscovery } from '@/lib/company-access/catalog-release';
import { DiscoverClient } from './DiscoverClient';

export const revalidate = 300;

export const metadata: Metadata = {
  title: '事例を探す | Make Money',
  description:
    '登録されている事業事例を、出典・時点・確認状況とあわせて探せます。',
};

export default async function DiscoverPage() {
  let dataset: Awaited<ReturnType<typeof readReleaseDiscovery>>;
  try {
    dataset = await readReleaseDiscovery();
  } catch (error) {
    if (!(error instanceof CatalogUnavailableError)) throw error;
    return <p role="alert" className="px-3 py-4 text-sm text-term-fg">目録を読み込めません。しばらくしてから、ページを開き直してください。</p>;
  }
  return <DiscoverClient dataset={dataset} />;
}
