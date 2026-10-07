import { findReleaseEntity } from '@/lib/company-access/catalog-release';
import { readLatestNewArrivalsRelease } from '@/lib/foundation/business-reader';
import { getCatalogMembership } from '@/lib/company-access/release-manifest';
import type { FinancialEntity } from '@/shared/terminal';
import type { DigestDeps } from './digest';
import { sendEmail } from './email';
import { claimSend, loadSentRecipients, releaseSend } from './ledger';
import { listActiveSubscribers, listAlertRecipients, markSavedSearchesNotified } from './recipients';
import { buildNewsletterUnsubscribeUrl } from './unsubscribe-link';

/**
 * 配信に載せる事例。公開目録（いま公開している版）にある事例だけを、画面の詳細と同じ公開版から読む。
 * 目録に無い ID は黙って除く。保存先の読み取り失敗は例外にして、何も送る前に配信を止める。
 */
export async function readPublishableEntities(ids: readonly string[]): Promise<FinancialEntity[]> {
  const rows = await Promise.all((await getCatalogMembership()).filterToCatalog(ids.map((id) => ({ id }))).map(({ id }) => findReleaseEntity(id)));
  return rows.filter((row): row is FinancialEntity => row !== null);
}

export function createRuntimeDigestDeps(appUrl: string): DigestDeps {
  return {
    now: () => new Date(),
    readRelease: async () => {
      const release = await readLatestNewArrivalsRelease();
      return release ? { releaseId: release.releaseId, label: release.label, entityIds: release.entityIds } : null;
    },
    readEntities: readPublishableEntities,
    listAlertRecipients,
    listSubscribers: listActiveSubscribers,
    loadSent: loadSentRecipients,
    claim: (kind, hash, releaseKey) => claimSend(kind, hash, releaseKey),
    unclaim: releaseSend,
    markNotified: markSavedSearchesNotified,
    unsubscribeUrl: (subscriberId) => buildNewsletterUnsubscribeUrl(appUrl, subscriberId),
    send: (message) => sendEmail(message),
  };
}
