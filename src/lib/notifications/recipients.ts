import { parseStoredFilters } from '@/lib/saved-searches/store';
import { executeD1, queryD1 } from '@/lib/storage/d1';
import type { DigestAlertRecipient, DigestSubscriber } from './types';

/**
 * Who a digest may write to. Addresses come only from what the database already holds
 * (`users.email`, `newsletter_subscribers.email`); nothing is guessed or made up.
 * Each list is bounded, and reports `truncated` when the bound was reached so an
 * operator can see that a run did not cover everyone.
 */
const ALERT_ROW_CAP = 5_000;
const SUBSCRIBER_ROW_CAP = 5_000;
const NOTIFIED_ID_CAP = 100;

/** LEFT JOIN: an account with no users row still appears, with a null email, so it can be counted as skipped. */
export const LIST_ALERT_SEARCHES_SQL =
  `SELECT s.id AS id, s.user_id AS userId, s.name AS name, s.query AS query, s.filters AS filters, u.email AS email
   FROM saved_searches s LEFT JOIN users u ON u.id = s.user_id
   WHERE s.notify = 1
   ORDER BY s.user_id, s.created_at, s.id
   LIMIT ${ALERT_ROW_CAP}`;
export const LIST_SUBSCRIBERS_SQL =
  `SELECT id, email FROM newsletter_subscribers WHERE status = 'active' ORDER BY subscribed_at, id LIMIT ${SUBSCRIBER_ROW_CAP}`;
export const DELETE_SUBSCRIBER_SQL = 'DELETE FROM newsletter_subscribers WHERE id = ?';

interface AlertRow {
  id: string;
  userId: string;
  name: string;
  query: string;
  filters: string;
  email: string | null;
}

function parseAlertRow(value: unknown): AlertRow {
  const row = value as Partial<Record<keyof AlertRow, unknown>>;
  if (
    !row || typeof row.id !== 'string' || typeof row.userId !== 'string' || typeof row.name !== 'string'
    || typeof row.query !== 'string' || typeof row.filters !== 'string'
    || (row.email !== null && typeof row.email !== 'string')
  ) throw new Error('Saved search recipient row is malformed');
  return row as AlertRow;
}

export async function listAlertRecipients(): Promise<{ recipients: DigestAlertRecipient[]; truncated: boolean }> {
  const rows = await queryD1(LIST_ALERT_SEARCHES_SQL, [], parseAlertRow);
  const byUser = new Map<string, DigestAlertRecipient>();
  for (const row of rows) {
    // A row that no longer parses is skipped, never guessed at: it must not match more than the person asked for.
    const filters = parseStoredFilters(row.filters);
    if (!filters) continue;
    let recipient = byUser.get(row.userId);
    if (!recipient) {
      recipient = { userId: row.userId, email: row.email, searches: [] };
      byUser.set(row.userId, recipient);
    }
    recipient.searches.push({ id: row.id, name: row.name, query: row.query, filters });
  }
  return { recipients: [...byUser.values()], truncated: rows.length >= ALERT_ROW_CAP };
}

/** Record which edition last mailed these searches. Informational; the ledger is what prevents duplicates. */
export async function markSavedSearchesNotified(userId: string, searchIds: readonly string[], releaseKey: string): Promise<void> {
  const ids = searchIds.slice(0, NOTIFIED_ID_CAP);
  if (ids.length === 0) return;
  await executeD1(
    `UPDATE saved_searches SET last_notified_release=? WHERE user_id=? AND id IN (${ids.map(() => '?').join(',')})`,
    [releaseKey, userId, ...ids],
  );
}

export async function listActiveSubscribers(): Promise<{ subscribers: DigestSubscriber[]; truncated: boolean }> {
  const subscribers = await queryD1<DigestSubscriber>(LIST_SUBSCRIBERS_SQL, [], (value) => {
    const row = value as Partial<Record<keyof DigestSubscriber, unknown>>;
    if (!row || typeof row.id !== 'string' || typeof row.email !== 'string') throw new Error('Newsletter subscriber row is malformed');
    return { id: row.id, email: row.email };
  });
  return { subscribers, truncated: subscribers.length >= SUBSCRIBER_ROW_CAP };
}

/** Same effect as the anonymous DELETE /api/newsletter/subscribe: the row, and with it the address, is removed. */
export async function deleteNewsletterSubscriber(subscriberId: string): Promise<void> {
  await executeD1(DELETE_SUBSCRIBER_SQL, [subscriberId]);
}
