export const VIEW_HISTORY_STORAGE_KEY = 'mm_viewed_entity_history_v1';

/** Browser JSON is untrusted; salvage valid IDs without allowing malformed roots into state. */
export function decodeViewHistory(raw: string | null): string[] {
  try {
    const value: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))].slice(0, 30);
  } catch {
    return [];
  }
}

export function prependViewedEntity(ids: string[], entityId: string): string[] {
  return entityId.trim() ? [entityId, ...ids.filter(id => id !== entityId)].slice(0, 30) : ids;
}
