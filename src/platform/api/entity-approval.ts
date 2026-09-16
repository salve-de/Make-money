import { auth } from '@/lib/firebase/client';
import {
  ENTITY_APPROVAL_ID_PATTERN,
  MAX_APPROVAL_IDS_PER_REQUEST,
} from '@/shared/entity-approval-contract';

export type ApprovalTokenProvider = () => Promise<string | null>;

async function currentFirebaseToken(): Promise<string | null> {
  const user = auth?.currentUser;
  return user ? user.getIdToken() : null;
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function approveChunk(
  entityIds: readonly string[],
  fetcher: typeof fetch,
  token: string | null,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetcher('/api/entities/approve', {
      method: 'POST',
      headers,
      body: JSON.stringify({ entityIds }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Approval failed: HTTP ${response.status}`);
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !('success' in payload) || payload.success !== true ||
        !('entityIds' in payload) || !Array.isArray(payload.entityIds)) {
      throw new Error('Invalid approval acknowledgement');
    }
    const acknowledgedIds: unknown[] = payload.entityIds;
    if (!acknowledgedIds.every((id) => typeof id === 'string') ||
        !entityIds.every((id) => acknowledgedIds.includes(id))) {
      throw new Error('Approval was not acknowledged for every requested entity');
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Persist approvals in bounded Worker invocations. Earlier chunks are idempotent,
 * so a later failure can be retried without losing or duplicating approvals.
 */
export async function approveEntities(
  ids: readonly string[],
  fetcher: typeof fetch = fetch,
  tokenProvider: ApprovalTokenProvider = currentFirebaseToken,
): Promise<void> {
  const entityIds = [...new Set(ids.map((id) => id.trim().toLowerCase()))];
  if (entityIds.length === 0) return;
  if (entityIds.some((id) => !ENTITY_APPROVAL_ID_PATTERN.test(id))) throw new Error('Invalid entity ID');

  const token = await tokenProvider();
  for (const chunk of chunks(entityIds, MAX_APPROVAL_IDS_PER_REQUEST)) {
    await approveChunk(chunk, fetcher, token);
  }
}
