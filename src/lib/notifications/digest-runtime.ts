import { isPublishableEntity } from '@/lib/company-access/public-entity';
import { readLatestNewArrivalsRelease, type FoundationBusinessCase } from '@/lib/foundation/business-reader';
import {
  adaptFoundationDetailToFinancialEntity,
  adaptFoundationSummaryToFinancialEntity,
} from '@/lib/foundation/foundation-adapter';
import { mapServingReads, readMakeMoneyViewDetail } from '@/lib/foundation/make-money-view';
import { parseFoundationBusinessCase } from '@/lib/foundation/schema';
import type { FinancialEntity } from '@/shared/terminal';
import type { DigestDeps } from './digest';
import { sendEmail } from './email';
import { claimSend, loadSentRecipients, releaseSend } from './ledger';
import { listActiveSubscribers, listAlertRecipients, markSavedSearchesNotified } from './recipients';
import { buildNewsletterUnsubscribeUrl } from './unsubscribe-link';

/** The identifier shape of a published Foundation case (the same rule the public list uses). */
const ENTITY_ID = /^ent_[a-z0-9]+_[a-f0-9]{20}$/;

/**
 * Cases of the edition, read the way the public detail page reads them and held to the
 * same publication gate, so an email never names a case the site would not show.
 *
 * A storage failure throws, which stops the digest before anything is sent. A single case
 * that cannot be understood (bad shape, no display name, not publishable) is left out.
 */
export async function readPublishableEntities(ids: readonly string[]): Promise<FinancialEntity[]> {
  const rows = await mapServingReads(ids.filter((id) => ENTITY_ID.test(id)), async (id) => {
    const view = await readMakeMoneyViewDetail(id);
    if (!view) return null;
    try {
      const detail: FoundationBusinessCase = parseFoundationBusinessCase(view);
      // A row still named by its stored id has no display identity yet; the list fails closed on it too.
      if (ENTITY_ID.test(detail.name)) return null;
      if (!isPublishableEntity(adaptFoundationSummaryToFinancialEntity(detail))) return null;
      return adaptFoundationDetailToFinancialEntity(detail);
    } catch (error) {
      console.warn(`[notifications/digest] skipped a case that could not be read: ${id}`, error);
      return null;
    }
  });
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
