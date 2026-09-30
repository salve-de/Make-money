import { matchesCatalogQuery } from '@/platform/model/entity-filter';
import type { FinancialEntity } from '@/shared/terminal';
import {
  buildNewsletterEmail,
  buildSavedSearchEmail,
  isDeliverableEmail,
  MAX_MAIL_ENTITIES,
  type EmailContent,
  type MailEntity,
  type OutboundEmail,
  type SendEmailResult,
} from './email';
import { isoWeekKeyJst, NOTIFICATION_KINDS, recipientHash, type NotificationKind } from './ledger';
import type { DigestAlertRecipient, DigestAlertSearch, DigestRelease, DigestSubscriber } from './types';

/**
 * One digest run: read the newest edition of new cases, mail each person whose saved
 * searches match it (one mail per person, at most 10 cases), and mail the weekly
 * newsletter. All I/O is passed in as `deps` so the rules below can be tested without
 * a database, storage or mail provider.
 *
 * Safety properties:
 * - A mail is claimed in the ledger before it is sent, so repeating or overlapping a run
 *   never sends the same edition twice. A failed send gives its claim back.
 * - Storage is read before anything is sent. If it cannot be read the run stops with
 *   nothing sent, so a re-run redoes the whole edition instead of a partial one.
 * - Work per run is bounded. When a bound stops a run short the result says so, and
 *   running again continues where it stopped.
 */

/** Cases of one edition read from storage per run. */
export const MAX_ENTITY_READS = 150;
/** Mails one run will attempt. */
export const MAX_EMAILS_PER_RUN = 200;

export interface DigestDeps {
  now(): Date;
  readRelease(): Promise<DigestRelease | null>;
  /** Publishable cases only, in the order of `ids`. Throws when storage cannot be read. */
  readEntities(ids: readonly string[]): Promise<FinancialEntity[]>;
  listAlertRecipients(): Promise<{ recipients: DigestAlertRecipient[]; truncated: boolean }>;
  listSubscribers(): Promise<{ subscribers: DigestSubscriber[]; truncated: boolean }>;
  loadSent(kind: NotificationKind, releaseKey: string): Promise<ReadonlySet<string>>;
  claim(kind: NotificationKind, hash: string, releaseKey: string): Promise<boolean>;
  unclaim(kind: NotificationKind, hash: string, releaseKey: string): Promise<void>;
  markNotified(userId: string, searchIds: readonly string[], releaseKey: string): Promise<void>;
  unsubscribeUrl(subscriberId: string): Promise<string | null>;
  send(message: OutboundEmail): Promise<SendEmailResult>;
}

export interface DigestResult {
  release: string | null;
  sent: number;
  /** People who were due a mail but did not get one now: already mailed, or no usable address. */
  skipped: number;
  failed: number;
  /** Present when a bound stopped the run before everyone was covered. Run again to continue. */
  truncated?: true;
}

interface RunState {
  deps: DigestDeps;
  appUrl: string;
  budget: number;
  sent: number;
  skipped: number;
  failed: number;
  truncated: boolean;
}

type Outcome = 'sent' | 'skipped' | 'failed' | 'stopped';

function toMailEntity(entity: FinancialEntity, conditions?: string[]): MailEntity {
  return { id: entity.id, name: entity.name, tagline: entity.tagline, ...(conditions ? { conditions } : {}) };
}

function matches(entity: FinancialEntity, search: DigestAlertSearch): boolean {
  // The cases a person saved are not a condition. Storage already refuses such a row; this is the last line of defense.
  if (search.filters.filter === 'BOOKMARKED') return false;
  try {
    return matchesCatalogQuery(entity, search.query, search.filters);
  } catch {
    // A case that cannot be evaluated must not be announced as a match.
    return false;
  }
}

/** Every case in the edition that matches at least one of the person's searches, with the searches that matched. */
function matchRecipient(recipient: DigestAlertRecipient, entities: readonly FinancialEntity[]) {
  const conditionsByEntity = new Map<string, string[]>();
  const searchIds: string[] = [];
  for (const search of recipient.searches) {
    let matchedAny = false;
    for (const entity of entities) {
      if (!matches(entity, search)) continue;
      matchedAny = true;
      const names = conditionsByEntity.get(entity.id) ?? [];
      if (!names.includes(search.name)) names.push(search.name);
      conditionsByEntity.set(entity.id, names);
    }
    if (matchedAny) searchIds.push(search.id);
  }
  const matched = entities
    .filter((entity) => conditionsByEntity.has(entity.id))
    .map((entity) => toMailEntity(entity, conditionsByEntity.get(entity.id)));
  return { matched, searchIds };
}

/** Claim, send, and give the claim back if the send failed. */
async function deliver(
  state: RunState,
  input: {
    kind: NotificationKind;
    email: string;
    releaseKey: string;
    alreadySent: Set<string>;
    build: () => Promise<EmailContent | null>;
  },
): Promise<Outcome> {
  const { deps } = state;
  const hash = await recipientHash(input.email);
  if (input.alreadySent.has(hash)) {
    state.skipped += 1;
    return 'skipped';
  }
  if (state.budget <= 0) {
    state.truncated = true;
    return 'stopped';
  }
  const content = await input.build();
  if (!content) {
    state.skipped += 1;
    return 'skipped';
  }
  if (!await deps.claim(input.kind, hash, input.releaseKey)) {
    // Another run got there first.
    input.alreadySent.add(hash);
    state.skipped += 1;
    return 'skipped';
  }
  state.budget -= 1;
  const result = await deps.send({
    ...content,
    to: input.email,
    idempotencyKey: `mm-${input.kind}-${hash}-${input.releaseKey}`,
  });
  if (!result.ok) {
    try {
      await deps.unclaim(input.kind, hash, input.releaseKey);
    } catch (error) {
      console.error('[notifications/digest] could not release a failed send:', error);
    }
    state.failed += 1;
    return 'failed';
  }
  input.alreadySent.add(hash);
  if (result.duplicate) {
    // The provider already holds this exact mail; the claim stays so it is not tried again.
    state.skipped += 1;
    return 'skipped';
  }
  state.sent += 1;
  return 'sent';
}

async function sendAlerts(state: RunState, release: DigestRelease, entities: readonly FinancialEntity[]): Promise<void> {
  const { deps } = state;
  const { recipients, truncated } = await deps.listAlertRecipients();
  if (truncated) state.truncated = true;
  if (recipients.length === 0) return;
  const kind = NOTIFICATION_KINDS.savedSearch;
  const alreadySent = new Set(await deps.loadSent(kind, release.releaseId));

  for (const recipient of recipients) {
    const { matched, searchIds } = matchRecipient(recipient, entities);
    if (matched.length === 0) continue;
    if (!isDeliverableEmail(recipient.email)) {
      state.skipped += 1;
      continue;
    }
    const outcome = await deliver(state, {
      kind,
      email: recipient.email.trim().toLowerCase(),
      releaseKey: release.releaseId,
      alreadySent,
      build: async () => buildSavedSearchEmail({ appUrl: state.appUrl, entities: matched.slice(0, MAX_MAIL_ENTITIES), total: matched.length }),
    });
    if (outcome === 'stopped') return;
    if (outcome === 'sent') {
      try {
        await deps.markNotified(recipient.userId, searchIds, release.releaseId);
      } catch (error) {
        // Informational only: the ledger already guarantees the mail is not repeated.
        console.error('[notifications/digest] could not record the notified edition:', error);
      }
    }
  }
}

async function sendNewsletter(state: RunState, release: DigestRelease, entities: readonly FinancialEntity[]): Promise<void> {
  const { deps } = state;
  const { subscribers, truncated } = await deps.listSubscribers();
  if (truncated) state.truncated = true;
  if (subscribers.length === 0) return;
  const kind = NOTIFICATION_KINDS.newsletter;
  // Keyed by week, not by edition: however often the digest is called, a subscriber gets one a week.
  const weekKey = isoWeekKeyJst(deps.now());
  const alreadySent = new Set(await deps.loadSent(kind, weekKey));
  const featured = entities.slice(0, MAX_MAIL_ENTITIES).map((entity) => toMailEntity(entity));

  for (const subscriber of subscribers) {
    if (!isDeliverableEmail(subscriber.email)) {
      state.skipped += 1;
      continue;
    }
    const outcome = await deliver(state, {
      kind,
      email: subscriber.email.trim().toLowerCase(),
      releaseKey: weekKey,
      alreadySent,
      build: async () => {
        // A newsletter without a working way to stop is never sent.
        const unsubscribeUrl = await deps.unsubscribeUrl(subscriber.id);
        if (!unsubscribeUrl) return null;
        return buildNewsletterEmail({
          appUrl: state.appUrl,
          entities: featured,
          total: entities.length,
          releaseLabel: release.label,
          unsubscribeUrl,
        });
      },
    });
    if (outcome === 'stopped') return;
  }
}

export async function runDigest(deps: DigestDeps, options: { appUrl: string }): Promise<DigestResult> {
  const release = await deps.readRelease();
  if (!release) return { release: null, sent: 0, skipped: 0, failed: 0 };

  const state: RunState = {
    deps,
    appUrl: options.appUrl,
    budget: MAX_EMAILS_PER_RUN,
    sent: 0,
    skipped: 0,
    failed: 0,
    truncated: release.entityIds.length > MAX_ENTITY_READS,
  };
  // Read every case before sending anything: a storage failure here stops the run with nothing sent.
  const entities = await deps.readEntities(release.entityIds.slice(0, MAX_ENTITY_READS));
  if (entities.length > 0) {
    await sendAlerts(state, release, entities);
    await sendNewsletter(state, release, entities);
  }
  return {
    release: release.releaseId,
    sent: state.sent,
    skipped: state.skipped,
    failed: state.failed,
    ...(state.truncated ? { truncated: true as const } : {}),
  };
}
