'use client';

import { useEffect, useState } from 'react';
import type { PublicMediaAsset } from '@/shared/media-display';
import { createEntityMediaLoader } from './entity-media-loader';

const loader = createEntityMediaLoader();

/**
 * Displayable images (already vetted by the server: allowed, not a person, with attribution) for the given
 * entity ids, keyed by id. Entities without images are absent. Images that arrive later are added; an id is
 * requested once per page load however many components ask for it.
 */
export function useEntityMedia(entityIds: readonly string[]): Record<string, PublicMediaAsset[]> {
  const [media, setMedia] = useState<Record<string, PublicMediaAsset[]>>({});
  // Entity ids never contain a space, so the joined string is a stable dependency for the list.
  const key = entityIds.join(' ');

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    for (const id of key.split(' ')) {
      void loader.load(id).then((assets) => {
        if (cancelled || assets.length === 0) return;
        setMedia((current) => (current[id] === assets ? current : { ...current, [id]: assets }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [key]);

  return media;
}
