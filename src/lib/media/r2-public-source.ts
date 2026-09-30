import { getFoundationBucketAsync, listR2Objects, readR2Object } from '../storage/r2';
import type { PublicMediaObjectSource } from './public-reader';

/** foundation-public through the existing R2 helpers (Worker binding first, S3 credentials otherwise). Read only. */

const LIST_PAGE_SIZE = 1000;
/** 20 pages = 20,000 objects. Past that the listing is refused rather than silently truncated. */
const MAX_LIST_PAGES = 20;

export function createR2PublicObjectSource(): PublicMediaObjectSource {
  return {
    async list(prefix) {
      const bucket = await getFoundationBucketAsync('public');
      const keys: string[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
        const result = await listR2Objects({ bucket, prefix, cursor, limit: LIST_PAGE_SIZE });
        keys.push(...result.objects.map((object) => object.key));
        if (!result.truncated || !result.cursor) return keys;
        cursor = result.cursor;
      }
      throw new Error(`foundation-public holds more than ${MAX_LIST_PAGES * LIST_PAGE_SIZE} objects under ${prefix}; refusing a partial listing`);
    },
    async read(key) {
      const object = await readR2Object(await getFoundationBucketAsync('public'), key);
      return object ? object.body : null;
    },
  };
}
