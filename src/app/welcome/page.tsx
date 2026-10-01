import { readReleaseSummaries } from '@/lib/company-access/catalog-release';
import type { FinancialEntity } from '@/shared/terminal';
import manifest from '../../../data/catalog-release.json';
import WelcomeClient from './WelcomeClient';

export const dynamic = 'force-dynamic';

const PICK_COUNT = 3;

/** 公開目録の先頭数件。目録を読めない時は空にして、見本データには落とさない。 */
async function readPicks(): Promise<FinancialEntity[]> {
  try {
    return (await readReleaseSummaries()).slice(0, PICK_COUNT);
  } catch {
    return [];
  }
}

export default async function WelcomePage() {
  return <WelcomeClient entities={await readPicks()} publishedCount={manifest.publishedCount} />;
}
