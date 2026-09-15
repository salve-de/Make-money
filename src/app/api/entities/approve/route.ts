import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { queryD1 } from '@/lib/storage/d1';
import {
  approveD1Entities,
  EntityApprovalStoreError,
  listD1ApprovedEntityIds,
} from '@/lib/storage/entity-approvals';
import {
  ENTITY_APPROVAL_ID_PATTERN,
  MAX_APPROVAL_IDS_PER_REQUEST,
  MAX_APPROVAL_PROJECTION_IDS,
} from '@/shared/entity-approval-contract';

export const dynamic = 'force-dynamic';
const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
const publicHeaders = { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=300' };

function json(body: unknown, status = 200, headers = privateHeaders) {
  return NextResponse.json(body, { status, headers });
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  return origin === null || origin === req.nextUrl.origin;
}

function normalizeIds(inputIds: unknown, maxIds: number): string[] {
  if (!Array.isArray(inputIds) || inputIds.length > maxIds) throw new Error('Invalid entity IDs');
  const ids = [...new Set(inputIds.map((id) => {
    if (typeof id !== 'string') throw new Error('Invalid entity ID');
    return id.trim().toLowerCase();
  }))];
  if (ids.some((id) => !ENTITY_APPROVAL_ID_PATTERN.test(id))) throw new Error('Invalid entity IDs');
  return ids;
}

async function requireAdmin(req: NextRequest): Promise<{ uid: string } | null | 'member'> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const user = await verifyFirebaseIdToken(auth.slice(7));
  if (!user) return null;
  const roles = await queryD1<{ role: string }>('SELECT role FROM users WHERE id = ?', [user.uid], (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid user role');
    const role = (value as Record<string, unknown>).role;
    if (role !== 'member' && role !== 'admin') throw new Error('Invalid user role');
    return { role };
  });
  return roles[0]?.role === 'admin' ? { uid: user.uid } : 'member';
}

/**
 * Public approval state is queried only for IDs the caller already has. This
 * keeps every D1 read and response bounded as the global approval table grows.
 */
export async function GET(req: NextRequest) {
  let ids: string[];
  try {
    ids = normalizeIds(req.nextUrl.searchParams.getAll('entityId'), MAX_APPROVAL_PROJECTION_IDS);
  } catch {
    return json({ success: false, error: 'Invalid approval projection request' }, 400, publicHeaders);
  }
  if (ids.length === 0) return json({ success: true, entityIds: [] }, 200, publicHeaders);

  try {
    return json({ success: true, entityIds: await listD1ApprovedEntityIds(ids) }, 200, publicHeaders);
  } catch (error) {
    console.error('[entities/approve] Approval projection read failed:', error);
    return json({ success: false, error: 'Approval overlay unavailable' }, 503, publicHeaders);
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ success: false, error: 'Cross-origin approval denied' }, 403);

  let ids: string[];
  let entityId: string | null;
  try {
    const body = await readJsonBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
    entityId = 'entityId' in body && typeof body.entityId === 'string' ? body.entityId : null;
    if ('all' in body && body.all === true) throw new Error('Explicit entity IDs required');
    const inputIds: unknown = 'entityIds' in body ? body.entityIds : entityId ? [entityId] : [];
    ids = normalizeIds(inputIds, MAX_APPROVAL_IDS_PER_REQUEST);
    if (!ids.length) throw new Error('No entity IDs');
  } catch (error) {
    return json(
      { success: false, error: 'Invalid approval request' },
      error instanceof RequestBodyTooLargeError ? 413 : 400,
    );
  }

  try {
    const admin = await requireAdmin(req);
    if (admin === null) return json({ success: false, error: 'Unauthorized' }, 401);
    if (admin === 'member') return json({ success: false, error: 'Admin role required' }, 403);
    const result = await approveD1Entities(ids, admin.uid);
    return json({
      success: true,
      ...result,
      entityId,
      message: `承認完了。${result.approvedCount}件を本番承認台帳へ記録しました。`,
    });
  } catch (error) {
    console.error('[entities/approve] Production persistence failed:', error);
    return json(
      { success: false, error: error instanceof EntityApprovalStoreError ? error.message : 'Approval unavailable' },
      503,
    );
  }
}
