import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { approveLocalEntities, ApprovalStoreError } from '@/lib/storage/local-entity-approvals';

/** This route edits local development fixtures; packaged production files are not a database. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const hostname = req.nextUrl.hostname;
  if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(hostname) ||
      (origin !== null && origin !== req.nextUrl.origin)) {
    return NextResponse.json({ success: false, error: 'Local approval editor is unavailable on this host' }, { status: 403 });
  }
  let ids: string[];
  let all: boolean;
  let entityId: string | null;
  try {
    const body = await readJsonBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
    entityId = 'entityId' in body && typeof body.entityId === 'string' ? body.entityId : null;
    all = 'all' in body && body.all === true;
    const inputIds: unknown = 'entityIds' in body ? body.entityIds : entityId ? [entityId] : [];
    if (!Array.isArray(inputIds) || inputIds.length > 1000 || !inputIds.every((id: unknown) =>
      typeof id === 'string' && id.trim().length > 0 && id.length <= 256)) throw new Error('Invalid entity IDs');
    ids = [...new Set((inputIds as string[]).map((id) => id.trim().toLowerCase()))];
    if (!ids.length && !all) throw new Error('No entity IDs');
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid approval request' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 });
  }
  try {
    const result = await approveLocalEntities(path.join(process.cwd(), 'data'), ids, all);
    return NextResponse.json({ success: true, ...result, entityId, all,
      message: `承認完了。${result.approvedCount}件の「収集事例」タグを除去し、本台帳に保管しました。` });
  } catch (error) {
    console.error('[entities/approve] Persistence failed:', error);
    return NextResponse.json({ success: false, error: error instanceof ApprovalStoreError ? error.message : 'Approval unavailable' },
      { status: error instanceof ApprovalStoreError ? error.status : 503 });
  }
}
