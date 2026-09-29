import {
  R2ConfigurationError,
  R2ObjectConflictError,
  assertR2BucketAvailable,
  isR2Configured,
  putR2ObjectCreateOnly,
  readR2Object,
} from '../storage/r2';
import type { MediaObjectStore } from './upload';

/**
 * Cloudflare R2 behind the media upload: the existing create-only PUT (which reads the object back and
 * compares SHA-256 itself) and plain reads. Credentials come from the environment, normally through
 * scripts/with-r2-keychain-secrets.mjs. If they are missing, `assertReady` fails: there is no local fallback.
 */
export function createR2MediaStore(): MediaObjectStore {
  return {
    async assertReady(buckets) {
      for (const bucket of buckets) {
        if (!isR2Configured(bucket)) {
          throw new R2ConfigurationError(
            'R2 credentials are not configured. Run through: node scripts/with-r2-keychain-secrets.mjs node --import tsx scripts/media/upload-media-assets.ts ...',
          );
        }
      }
      for (const bucket of buckets) await assertR2BucketAvailable(bucket);
    },
    async putCreateOnly({ bucket, key, body, contentType }) {
      try {
        const result = await putR2ObjectCreateOnly({ bucket, key, body, contentType });
        return result.status === 'CREATED' ? 'created' : 'identical';
      } catch (error) {
        if (error instanceof R2ObjectConflictError) return 'conflict';
        throw error;
      }
    },
    async read(bucket, key) {
      const object = await readR2Object(bucket, key);
      return object ? object.body : null;
    },
  };
}
