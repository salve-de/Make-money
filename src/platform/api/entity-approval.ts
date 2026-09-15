import { auth } from '@/lib/firebase/client';

export type ApprovalTokenProvider = () => Promise<string | null>;

async function currentFirebaseToken(): Promise<string | null> {
  const user = auth?.currentUser;
  return user ? user.getIdToken() : null;
}

/** One batch request, explicit acknowledgement, and no optimistic success on failure. */
export async function approveEntities(
  ids: readonly string[],
  fetcher: typeof fetch = fetch,
  tokenProvider: ApprovalTokenProvider = currentFirebaseToken,
): Promise<void> {
  const entityIds = [...new Set(ids.map((id) => id.trim().toLowerCase()))];
  if (entityIds.length === 0) return;
  if (entityIds.some((id) => !id)) throw new Error('Empty entity ID');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const token = await tokenProvider();
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
