import {
  MEDIA_KEY_PREFIX,
  PublicMediaManifestSchema,
  parsePublicManifestKey,
  type PublicMediaManifest,
} from '../../shared/media-public-manifest';
import { isMediaEntityId, isSafeMediaUrl, type PublicMediaAsset } from '../../shared/media-display';

/**
 * Production source of displayable media: the public manifests in foundation-public (written by
 * scripts/media/upload-media-assets.ts). The newest `media/<entityId>/public-manifest.<stamp>.json` of an entity
 * is the current view; if that file cannot be read or is invalid, the entity shows nothing (an older view could
 * still list an image that was withdrawn). Images are loaded by the browser straight from the public domain.
 */

export interface PublicMediaObjectSource {
  /** Every key under `prefix` (all pages). Must throw rather than return a partial list. */
  list(prefix: string): Promise<string[]>;
  /** The object's bytes, or null when it does not exist. */
  read(key: string): Promise<Uint8Array | null>;
}

export interface PublicMediaReader {
  read(entityIds: readonly string[]): Promise<Record<string, PublicMediaAsset[]>>;
}

const MAX_PUBLIC_MANIFEST_BYTES = 256 * 1024;
const MAX_CACHED_MANIFESTS = 500;
export const PUBLIC_MEDIA_DIRECTORY_TTL_MS = 60_000;

export function createPublicMediaReader(options: {
  source: PublicMediaObjectSource;
  /** `https://assets.example.com` (no trailing slash): the origin that serves foundation-public. */
  publicDomain: string;
  now?: () => number;
  directoryTtlMs?: number;
}): PublicMediaReader {
  const now = options.now ?? Date.now;
  const ttl = options.directoryTtlMs ?? PUBLIC_MEDIA_DIRECTORY_TTL_MS;
  let directory: { at: number; latest: Map<string, string> } | null = null;
  // A manifest key never changes its content (create-only), so a parsed manifest can be kept.
  const manifests = new Map<string, PublicMediaManifest | null>();

  async function newestManifestKeys(): Promise<Map<string, string>> {
    if (directory && now() - directory.at < ttl) return directory.latest;
    const newest = new Map<string, { stamp: string; key: string }>();
    for (const key of await options.source.list(MEDIA_KEY_PREFIX)) {
      const parsed = parsePublicManifestKey(key);
      if (!parsed) continue;
      const current = newest.get(parsed.entityId);
      if (!current || parsed.stamp > current.stamp) newest.set(parsed.entityId, { stamp: parsed.stamp, key });
    }
    directory = { at: now(), latest: new Map([...newest].map(([entityId, item]) => [entityId, item.key])) };
    return directory.latest;
  }

  async function loadManifest(entityId: string, key: string): Promise<PublicMediaManifest | null> {
    if (manifests.has(key)) return manifests.get(key) ?? null;
    let manifest: PublicMediaManifest | null = null;
    const bytes = await options.source.read(key);
    if (bytes && bytes.byteLength <= MAX_PUBLIC_MANIFEST_BYTES) {
      try {
        const parsed = PublicMediaManifestSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
        if (parsed.success && parsed.data.entityId === entityId) manifest = parsed.data;
      } catch {
        manifest = null;
      }
    }
    if (manifests.size >= MAX_CACHED_MANIFESTS) manifests.clear();
    manifests.set(key, manifest);
    return manifest;
  }

  return {
    async read(entityIds) {
      const entities: Record<string, PublicMediaAsset[]> = {};
      const latest = await newestManifestKeys();
      for (const entityId of new Set(entityIds)) {
        const key = isMediaEntityId(entityId) ? latest.get(entityId) : undefined;
        if (!key) continue;
        const manifest = await loadManifest(entityId, key);
        if (!manifest) continue;
        const shown = manifest.assets
          .map((asset): PublicMediaAsset => ({
            assetId: asset.assetId,
            kind: asset.kind,
            url: `${options.publicDomain}/${asset.key}`,
            contentType: asset.contentType,
            width: asset.width,
            height: asset.height,
            attribution: asset.attribution,
            sourcePageUrl: asset.sourcePageUrl,
            retrievedAt: asset.retrievedAt,
          }))
          .filter((asset) => isSafeMediaUrl(asset.url));
        if (shown.length > 0) entities[entityId] = shown;
      }
      return entities;
    },
  };
}
