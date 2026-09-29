import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { batchD1, executeD1, queryD1 } from '@/lib/storage/d1';
import { getProEntitlement } from '@/lib/payments/entitlement';
import { findManageableSubscription } from '@/lib/payments/billing';
import { executionOwnerKey } from '@/lib/execution/generation-store';
import { businessSaleDataRemains, businessSaleDeletionStatements } from '@/lib/marketplace/business-account';

export const dynamic = 'force-dynamic';
const json = (body: unknown, init: { status?: number } = {}) => NextResponse.json(body, { ...init, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' } });
interface UserRow { id: string; email: string; display_name: string | null; role: string }
interface DeletionReadback { users: number; execution_projects: number; marketplace_listings: number; execution_generation: number; verified_revenue?: number }
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const user = auth?.startsWith('Bearer ') ? await verifyFirebaseIdToken(auth.slice(7)) : null;
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await executeD1('INSERT INTO users (id,email,display_name) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING', [user.uid, user.email || `${user.uid}@anon.example.com`, user.name || null]);
    const [profile] = await queryD1<UserRow>('SELECT id,email,display_name,role FROM users WHERE id = ?', [user.uid]);
    if (!profile || profile.id !== user.uid || typeof profile.email !== 'string'
      || (profile.display_name !== null && typeof profile.display_name !== 'string') || !['member', 'admin'].includes(profile.role)) throw new Error('User persistence unavailable');
    return json({ uid: profile.id, email: profile.email, displayName: profile.display_name, role: profile.role,
      isPro: await getProEntitlement(user.uid) });
  } catch { return json({ error: '会員情報を取得できません' }, { status: 503 }); }
}

/** Delete user-owned application state in one D1 transaction. Payment facts
 * remain as an anonymized accounting record without the Firebase UID. This
 * endpoint deletes Make-Money data; Firebase credentials are managed by the
 * identity provider and are not claimed to be revoked here. */
export async function DELETE(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const user = auth?.startsWith('Bearer ') ? await verifyFirebaseIdToken(auth.slice(7)) : null;
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  // 更新され続ける契約を残したまま削除すると、台帳の本人の紐付けが消え、本人が解約できないまま請求が続く。
  // 解約（または解約予約）が済んでいない月額・年額があるときは、先に解約してもらう。
  try {
    const subscription = await findManageableSubscription(user.uid);
    if (subscription && !subscription.cancel_at_period_end && !subscription.cancel_at) {
      return json({ error: '月額・年額プランの契約が続いています。「契約の管理」から解約してから、アカウントを削除してください', code: 'subscription_active' }, { status: 409 });
    }
  } catch {
    return json({ error: '契約の状況を確認できないため、今は削除できません。時間をおいて再度お試しください' }, { status: 503 });
  }
  try {
    // A checkout can run before migration 0011 is applied. Older databases
    // have no listings to delete; do not break their existing account deletion.
    // The same holds for migration 0012 (verified_revenue): the user's UID is kept there
    // for the per-user cooldown, so those rows are deleted with the account when the table exists.
    // Saved searches (0013) and business-sale listings/inquiries (0014) follow the same rule. All flags come from one statement.
    const [schema] = await queryD1<{ available: number; verifications?: number; saved_searches?: number; businessSale?: number }>(
      "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='marketplace_listings') AS available, EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='verified_revenue') AS verifications, EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='saved_searches') AS saved_searches, EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='business_sale_listings') AS businessSale",
    );
    if (!schema || (schema.available !== 0 && schema.available !== 1)
      || (schema.verifications !== undefined && schema.verifications !== 0 && schema.verifications !== 1)
      || (schema.saved_searches !== undefined && schema.saved_searches !== 0 && schema.saved_searches !== 1)
      || (schema.businessSale !== undefined && schema.businessSale !== 0 && schema.businessSale !== 1)) throw new Error('Invalid schema readback');
    const hasListings = schema.available === 1;
    const hasVerifications = schema.verifications === 1;
    const hasSavedSearches = schema.saved_searches === 1;
    const hasBusinessSales = schema.businessSale === 1;
    const resetAt = new Date().toISOString();
    const ownerKey = executionOwnerKey(user.uid);
    await batchD1([
      { sql: 'DELETE FROM bookmarks WHERE user_id = ?', params: [user.uid] },
      { sql: 'DELETE FROM analyst_notes WHERE user_id = ?', params: [user.uid] },
      { sql: 'DELETE FROM chat_messages WHERE user_id = ?', params: [user.uid] },
      { sql: 'DELETE FROM synthesized_ideas WHERE user_id = ?', params: [user.uid] },
      ...(hasListings ? [{ sql: 'DELETE FROM marketplace_listings WHERE user_id = ?', params: [user.uid] }] : []),
      ...(hasVerifications ? [{ sql: 'DELETE FROM verified_revenue WHERE user_id = ?', params: [user.uid] }] : []),
      ...(hasBusinessSales ? businessSaleDeletionStatements(user.uid) : []),
      { sql: 'DELETE FROM build_sessions WHERE user_id = ?', params: [user.uid] },
      { sql: 'DELETE FROM submissions WHERE user_id = ?', params: [user.uid] },
      { sql: 'DELETE FROM newsletter_subscribers WHERE user_id = ?', params: [user.uid] },
      ...(hasSavedSearches ? [{ sql: 'DELETE FROM saved_searches WHERE user_id = ?', params: [user.uid] }] : []),
      { sql: 'DELETE FROM execution_projects WHERE user_id = ?', params: [user.uid] },
      { sql: 'INSERT INTO execution_resets(owner_key,generation,reset_at) VALUES(?,1,?) ON CONFLICT(owner_key) DO UPDATE SET generation=generation+1,reset_at=excluded.reset_at', params: [ownerKey, resetAt] },
      { sql: "UPDATE payment_events SET user_id = NULL, fact = json_remove(fact, '$.userId', '$.user_id') WHERE user_id = ?", params: [user.uid] },
      { sql: 'DELETE FROM users WHERE id = ?', params: [user.uid] },
    ]);
    const [remaining] = await queryD1<DeletionReadback>(
      `SELECT (SELECT COUNT(*) FROM users WHERE id = ?) AS users, (SELECT COUNT(*) FROM execution_projects WHERE user_id = ?) AS execution_projects, ${hasListings ? '(SELECT COUNT(*) FROM marketplace_listings WHERE user_id = ?)' : '0'} AS marketplace_listings, (SELECT generation FROM execution_resets WHERE owner_key = ?) AS execution_generation${hasVerifications ? ', (SELECT COUNT(*) FROM verified_revenue WHERE user_id = ?) AS verified_revenue' : ''}`,
      [user.uid, user.uid, ...(hasListings ? [user.uid] : []), ownerKey, ...(hasVerifications ? [user.uid] : [])],
    );
    if (!remaining || Number(remaining.users) !== 0 || Number(remaining.execution_projects) !== 0
      || Number(remaining.marketplace_listings) !== 0
      || (hasVerifications && Number(remaining.verified_revenue) !== 0)
      || !Number.isSafeInteger(Number(remaining.execution_generation)) || Number(remaining.execution_generation) < 1) {
      throw new Error('User deletion readback failed');
    }
    if (hasBusinessSales && await businessSaleDataRemains(user.uid)) throw new Error('Business sale deletion readback failed');
    return json({
      success: true,
      scope: 'application_data',
      executionGeneration: Number(remaining.execution_generation),
      executionResetAt: resetAt,
    });
  } catch {
    return json({ error: 'アカウント情報を削除できません' }, { status: 503 });
  }
}
