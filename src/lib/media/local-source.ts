import {
  MAX_STAGED_ASSET_BYTES,
  readEffectiveManifest,
  readStagedAsset,
  type MediaStoreOptions,
} from '../../shared/media-asset-store';
import { isMediaDisplayable, type EffectiveMediaAsset } from '../../shared/media-decisions';
import { isMediaEntityId, type PublicMediaAsset } from '../../shared/media-display';

/**
 * Development / e2e source of displayable media: the local staging ledger with decisions.jsonl applied.
 * Every image that is offered has been re-read from disk and matched against its recorded SHA-256, so a
 * listed image always loads and is always the image that was reviewed.
 */

export function localMediaFileUrl(entityId: string, assetId: string): string {
  return `/api/media/file?entity_id=${encodeURIComponent(entityId)}&asset=${encodeURIComponent(assetId)}`;
}

function publicAsset(asset: EffectiveMediaAsset, url: string): PublicMediaAsset {
  return {
    assetId: asset.assetId,
    kind: asset.kind,
    url,
    contentType: asset.contentType,
    width: asset.width,
    height: asset.height,
    attribution: asset.rights.attribution,
    sourcePageUrl: asset.sourcePageUrl,
    retrievedAt: asset.retrievedAt,
  };
}

export type MediaProblemReporter = (entityId: string, message: string) => void;

export const logMediaProblem: MediaProblemReporter = (entityId, message) => console.error(`[media] ${entityId}: ${message}`);

/**
 * Displayable images per entity. An entity whose ledger cannot be read, or an image that no longer matches
 * its record, contributes nothing (fail closed); the reason goes to `report`.
 */
export async function readLocalPublicMedia(
  entityIds: readonly string[],
  options: MediaStoreOptions,
  report: MediaProblemReporter = logMediaProblem,
): Promise<Record<string, PublicMediaAsset[]>> {
  const entities: Record<string, PublicMediaAsset[]> = {};
  for (const entityId of new Set(entityIds)) {
    if (!isMediaEntityId(entityId)) continue;
    try {
      const ledger = await readEffectiveManifest(entityId, options);
      if (!ledger) continue;
      for (const problem of ledger.problems) report(entityId, problem);
      const shown: PublicMediaAsset[] = [];
      for (const asset of ledger.assets) {
        if (!isMediaDisplayable(asset)) continue;
        try {
          await readStagedAsset(entityId, asset, options);
        } catch (error) {
          report(entityId, `${asset.assetId} is allowed but not shown: ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }
        shown.push(publicAsset(asset, localMediaFileUrl(entityId, asset.assetId)));
      }
      if (shown.length > 0) entities[entityId] = shown;
    } catch (error) {
      report(entityId, `ledger unreadable, nothing is shown: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return entities;
}

export interface LocalMediaFile {
  bytes: Buffer;
  contentType: string;
}

/**
 * The bytes of one displayable image, or null when the asset is unknown, not displayable (held, blocked, person)
 * or no longer matches its record. Held and blocked assets are indistinguishable from unknown ones on purpose.
 */
export async function readLocalMediaFile(
  entityId: string,
  assetId: string,
  options: MediaStoreOptions,
  report: MediaProblemReporter = logMediaProblem,
): Promise<LocalMediaFile | null> {
  if (!isMediaEntityId(entityId)) return null;
  try {
    const ledger = await readEffectiveManifest(entityId, options);
    const asset = ledger?.assets.find((candidate) => candidate.assetId === assetId);
    if (!asset || !isMediaDisplayable(asset) || asset.bytes > MAX_STAGED_ASSET_BYTES) return null;
    return { bytes: await readStagedAsset(entityId, asset, options), contentType: asset.contentType };
  } catch (error) {
    report(entityId, `${assetId} was not served: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
