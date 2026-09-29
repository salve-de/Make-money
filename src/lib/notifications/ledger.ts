import { executeD1, queryD1 } from '@/lib/storage/d1';

/**
 * The send ledger behind "never mail the same edition twice". A row is claimed
 * before the email is sent and released again if the send fails, so a digest run
 * that overlaps or repeats another run can only ever send each mail once.
 * Only a one-way digest of the address is stored.
 */
export const NOTIFICATION_KINDS = {
  savedSearch: 'saved_search',
  newsletter: 'newsletter',
} as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[keyof typeof NOTIFICATION_KINDS];

/** Upper bound on ledger rows read for one edition. */
const SENT_ROW_CAP = 20_000;

export const LOAD_SENT_SQL =
  `SELECT recipient_hash AS recipientHash FROM notification_sends WHERE kind=? AND release_key=? LIMIT ${SENT_ROW_CAP}`;
/** RETURNING makes "did I win the claim" independent of how the driver reports changes. */
export const CLAIM_SEND_SQL =
  `INSERT INTO notification_sends(id,kind,recipient_hash,release_key,sent_at) VALUES(?,?,?,?,?)
   ON CONFLICT(kind,recipient_hash,release_key) DO NOTHING
   RETURNING id`;
export const RELEASE_SEND_SQL = 'DELETE FROM notification_sends WHERE kind=? AND recipient_hash=? AND release_key=?';

/** SHA-256 of the normalized address. Stable across runs, and not the address itself. */
export async function recipientHash(email: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`make-money:notify:v1:${email.trim().toLowerCase()}`));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * ISO-8601 week in Japan time, e.g. "2026-W40". The newsletter is keyed by week so a
 * subscriber gets at most one a week however often the digest is called.
 */
export function isoWeekKeyJst(now: Date): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()));
  // Move to the Thursday of this ISO week; its year is the ISO year.
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((day.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Digests of everyone already mailed for this kind and edition. */
export async function loadSentRecipients(kind: NotificationKind, releaseKey: string): Promise<Set<string>> {
  const rows = await queryD1<{ recipientHash: string }>(LOAD_SENT_SQL, [kind, releaseKey], (value) => {
    const hash = (value as { recipientHash?: unknown }).recipientHash;
    if (typeof hash !== 'string') throw new Error('Notification ledger row is malformed');
    return { recipientHash: hash };
  });
  return new Set(rows.map((row) => row.recipientHash));
}

/** True when this caller now owns the send; false when the edition was already claimed. */
export async function claimSend(
  kind: NotificationKind,
  hash: string,
  releaseKey: string,
  now: number = Date.now(),
): Promise<boolean> {
  const claimed = await queryD1<{ id: string }>(CLAIM_SEND_SQL, [crypto.randomUUID(), kind, hash, releaseKey, now]);
  return claimed.length > 0;
}

/** Give the claim back after a failed send so the next run can try again. */
export async function releaseSend(kind: NotificationKind, hash: string, releaseKey: string): Promise<void> {
  await executeD1(RELEASE_SEND_SQL, [kind, hash, releaseKey]);
}
