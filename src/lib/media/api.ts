import { PUBLIC_MEDIA_RESPONSE_SCHEMA, type PublicMediaResponse } from '../../shared/media-display';
import { logMediaProblem, readLocalMediaFile, readLocalPublicMedia, type LocalMediaFile, type MediaProblemReporter } from './local-source';
import type { PublicMediaReader } from './public-reader';
import type { MediaSourceConfig } from './source';

/** Response building for GET /api/media and GET /api/media/file, kept out of the route files so it can be tested. */

export interface MediaApiResult {
  status: number;
  cacheControl: string;
  body: PublicMediaResponse | { error: string };
}

export interface MediaApiDeps {
  publicReader: (publicDomain: string) => PublicMediaReader;
  report?: MediaProblemReporter;
}

const NO_STORE = 'no-store';
/** A withdrawn image should disappear quickly: keep browser caching short. */
const SHORT = 'private, max-age=60';

function response(source: PublicMediaResponse['source'], available: boolean, entities: PublicMediaResponse['entities'], reason?: string): PublicMediaResponse {
  return { schema: PUBLIC_MEDIA_RESPONSE_SCHEMA, source, available, ...(reason ? { reason } : {}), entities };
}

/** The displayable images of the given (already validated) entity ids, from whichever source is configured. */
export async function buildMediaResponse(entityIds: readonly string[], source: MediaSourceConfig, deps: MediaApiDeps): Promise<MediaApiResult> {
  try {
    if (source.kind === 'off') {
      return { status: 200, cacheControl: SHORT, body: response('off', false, {}, 'media display is switched off') };
    }
    if (source.kind === 'local_staging') {
      const entities = await readLocalPublicMedia(entityIds, { root: source.root }, deps.report);
      return { status: 200, cacheControl: NO_STORE, body: response('local_staging', true, entities) };
    }
    if (!source.publicDomain) {
      return { status: 200, cacheControl: SHORT, body: response('foundation_public', false, {}, 'CLOUDFLARE_R2_PUBLIC_DOMAIN is not set to an https origin, so nothing is shown') };
    }
    const entities = await deps.publicReader(source.publicDomain).read(entityIds);
    return { status: 200, cacheControl: SHORT, body: response('foundation_public', true, entities) };
  } catch (error) {
    (deps.report ?? logMediaProblem)('*', `media source failed: ${error instanceof Error ? error.message : String(error)}`);
    return { status: 503, cacheControl: NO_STORE, body: { error: 'Media temporarily unavailable' } };
  }
}

/** The bytes of one displayable staged image; null (a 404) for anything else, and always null outside the local source. */
export async function serveMediaFile(entityId: string, assetId: string, source: MediaSourceConfig, report?: MediaProblemReporter): Promise<LocalMediaFile | null> {
  if (source.kind !== 'local_staging') return null;
  return readLocalMediaFile(entityId, assetId, { root: source.root }, report);
}
