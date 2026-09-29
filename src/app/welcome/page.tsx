import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { publicEntity } from '@/lib/company-access/public-entity';
import manifest from '../../../data/catalog-release.json';
import WelcomeClient from './WelcomeClient';

export default function WelcomePage() {
  return (
    <WelcomeClient
      entities={INSTITUTIONAL_ENTITIES.filter((e) => ['ent_photoai', 'ent_keyence', 'ent_stripe'].includes(e.id)).map(publicEntity)}
      publishedCount={manifest.publishedCount}
      collectedCount={manifest.sourceCount}
    />
  );
}
