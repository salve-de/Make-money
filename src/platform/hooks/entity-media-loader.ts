import {
  MEDIA_API_MAX_ENTITIES,
  isMediaEntityId,
  mediaQueryString,
  parsePublicMediaResponse,
  type PublicMediaAsset,
} from '@/shared/media-display';

/**
 * Batched, cached client for GET /api/media. Every entity id is asked for at most once per page load:
 * ids requested in the same tick go out together (up to MEDIA_API_MAX_ENTITIES per request), and the answer,
 * including "no images", is kept. A failed request is remembered as "no images" for a short while and then
 * forgotten so that a later look can try again. Anything unexpected in a response yields no images.
 */
export interface EntityMediaLoader {
  load(entityId: string): Promise<PublicMediaAsset[]>;
}

export interface EntityMediaLoaderOptions {
  fetcher?: (url: string) => Promise<Response>;
  /** Runs the flush after the current tick; replaceable for tests. */
  schedule?: (run: () => void) => void;
  /** Runs `forget` later; replaceable for tests. */
  later?: (run: () => void, ms: number) => void;
  retryAfterMs?: number;
}

const defaultFetcher = (url: string) => fetch(url, { credentials: 'same-origin' });
const defaultSchedule = (run: () => void) => {
  setTimeout(run, 0);
};
const defaultLater = (run: () => void, ms: number) => {
  setTimeout(run, ms);
};

export const ENTITY_MEDIA_RETRY_MS = 30_000;

export function createEntityMediaLoader(options: EntityMediaLoaderOptions = {}): EntityMediaLoader {
  const fetcher = options.fetcher ?? defaultFetcher;
  const schedule = options.schedule ?? defaultSchedule;
  const later = options.later ?? defaultLater;
  const retryAfterMs = options.retryAfterMs ?? ENTITY_MEDIA_RETRY_MS;
  const known = new Map<string, Promise<PublicMediaAsset[]>>();
  let queue: { id: string; resolve: (assets: PublicMediaAsset[]) => void }[] = [];
  let flushScheduled = false;

  async function requestChunk(chunk: { id: string; resolve: (assets: PublicMediaAsset[]) => void }[]): Promise<void> {
    let found: Record<string, PublicMediaAsset[]> = {};
    let failed = false;
    try {
      const response = await fetcher(`/api/media?${mediaQueryString(chunk.map((item) => item.id))}`);
      if (response.ok) found = parsePublicMediaResponse(await response.json());
      else failed = true;
    } catch {
      failed = true;
    }
    for (const { id, resolve } of chunk) {
      resolve(found[id] ?? []);
      if (failed) later(() => known.delete(id), retryAfterMs);
    }
  }

  function flush(): void {
    flushScheduled = false;
    const batch = queue;
    queue = [];
    for (let start = 0; start < batch.length; start += MEDIA_API_MAX_ENTITIES) {
      void requestChunk(batch.slice(start, start + MEDIA_API_MAX_ENTITIES));
    }
  }

  return {
    load(entityId) {
      if (!isMediaEntityId(entityId)) return Promise.resolve([]);
      const cached = known.get(entityId);
      if (cached) return cached;
      const promise = new Promise<PublicMediaAsset[]>((resolve) => {
        queue.push({ id: entityId, resolve });
      });
      known.set(entityId, promise);
      if (!flushScheduled) {
        flushScheduled = true;
        schedule(flush);
      }
      return promise;
    },
  };
}
