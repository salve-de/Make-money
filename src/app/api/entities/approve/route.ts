import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { queryD1 } from '@/lib/storage/d1';
import { approveLocalEntities, ApprovalStoreError } from '@/lib/storage/local-entity-approvals';
import {
  approveD1Entities,
  EntityApprovalStoreError,
  listD1ApprovedEntityIds,
} from '@/lib/storage/entity-approvals';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const ENTITY_ID = /^[a-z0-9][a-z0-9._:-]{0,199}$/;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  return origin === null || origin === req.nextUrl.origin;
}

function isLocalEditor(req: NextRequest): boolean {
  return process.env.NODE_ENV !== 'production' && LOOPBACK_HOSTS.has(req.nextUrl.hostname);
}

function normalizeIds(inputIds: unknown): string[] {
  if (!Array.isArray(inputIds)) throw new Error('Invalid entity IDs');
  const ids = [...new Set(inputIds.map((id) => {
    if (typeof id !== 'string') throw new Error('Invalid entity ID');
    return id.trim().toLowerCase();
  }))];
  if (ids.some((id) => !ENTITY_ID.test(id))) throw new Error('Invalid entity IDs');
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
 * Global approval IDs are not private user data. They are an editorial overlay
 * used to remove the transient `収集事例` marker without mutating research data.
 */
export async function GET(req: NextRequest) {
  if (isLocalEditor(req)) return json({ success: true, entityIds: [] });
  try {
    return json({ success: true, entityIds: await listD1ApprovedEntityIds() });
  } catch (error) {
    console.error('[entities/approve] Approval overlay read failed:', error);
    return json({ success: false, error: 'Approval overlay unavailable' }, 503);
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ success: false, error: 'Cross-origin approval denied' }, 403);

  let ids: string[];
  let all: boolean;
  let entityId: string | null;
  try {
    const body = await readJsonBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
    entityId = 'entityId' in body && typeof body.entityId === 'string' ? body.entityId : null;
    all = 'all' in body && body.all === true;
    const inputIds: unknown = 'entityIds' in body ? body.entityIds : entityId ? [entityId] : [];
    ids = normalizeIds(inputIds);
    if (!ids.length && !all) throw new Error('No entity IDs');
  } catch (error) {
    return json({ success: false, error: 'Invalid approval request' }, error instanceof RequestBodyTooLargeError ? 413 : 400);
  }

  if (isLocalEditor(req)) {
    try {
      const result = await approveLocalEntities(path.join(process.cwd(), 'data'), ids, all);
      return json({
        success: true,
        ...result,
        entityId,
        all,
        message: `承認完了。${result.approvedCount}件の「収集事例」タグを除去し、本台帳に保管しました。`,
      });
    } catch (error) {
      console.error('[entities/approve] Local persistence failed:', error);
      return json(
        { success: false, error: error instanceof ApprovalStoreError ? error.message : 'Approval unavailable' },
        error instanceof ApprovalStoreError ? error.status : 503,
      );
    }
  }

  // Production state is a D1 overlay; packaged JSON/R2 research records are immutable.
  if (all && ids.length === 0) {
    return json({ success: false, error: 'Production approval requires explicit entity IDs' }, 400);
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
      all: false,
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
