import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { publicEntity } from '@/lib/company-access/public-entity';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import { parseFinancialEntitiesResiliently } from '@/shared/financial-entity-schema';
import { reconcileFinancialEntity } from '@/platform/data/financial-reconciliation';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { deriveDiscoveryDataset } from '@/features/discover/discovery-model';
import { DiscoverClient } from './DiscoverClient';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'MAKEMONEY DISCOVER | 金を作った「決定的な一手」',
  description:
    '実在する事業・成功・失敗事例から、何が結果を変えたのか、他でも再現されたのか、今も生きているのかを一画面で掘る。',
};

async function getDiscoveryDataset() {
  try {
    const localIndexPath = resolve(process.cwd(), 'data/entities-index.json');
    const parsed: unknown = JSON.parse(await readFile(localIndexPath, 'utf8'));
    const { validEntities, invalidEntities } = parseFinancialEntitiesResiliently(parsed);

    if (invalidEntities.length > 0) {
      console.error(
        `[DiscoverPage] Quarantined ${invalidEntities.length} invalid entities while serving ${validEntities.length} valid entities.`,
      );
    }

    if (validEntities.length > 0) {
      const entities = validEntities
        .map(reconcileFinancialEntity)
        .map(normalizeFinancialEntity)
        .map(publicEntity);

      return deriveDiscoveryDataset(entities);
    }
  } catch (error) {
    console.error('[DiscoverPage] Failed to read entities-index.json; using static core.', error);
  }

  return deriveDiscoveryDataset(INSTITUTIONAL_ENTITIES.map(publicEntity));
}

export default async function DiscoverPage() {
  const dataset = await getDiscoveryDataset();

  return <DiscoverClient dataset={dataset} />;
}
