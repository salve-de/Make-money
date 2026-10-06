/** Local-only evidence reads. No network, API, R2 or source writes. */
import { isPublishableEntity } from '../../src/lib/company-access/public-entity';
import { sourcePolicy } from './source-policy';
import { normalizeFinancialEntity } from '../../src/shared/financial-integrity';
import { reconcileFinancialEntity } from '../../src/platform/data/financial-reconciliation';
import { readEffectiveManifest, readStagedAsset } from '../../src/shared/media-asset-store';
import { isMediaDisplayable } from '../../src/shared/media-decisions';
import type { FinancialEntity } from '../../src/shared/terminal';
import type { ReaderCase } from '../../src/shared/reader-case';
import { readCache, metricLine, type VerdictsFile } from './verify-lib';
import { excerpt } from './build-verify-batches';
import type { PublicationInput, PublicationMedia } from './publication-evaluation';

export { loadPublicationAuditDocuments, readPublicationAudits, type AuditDocument } from './publication-audit-store';

export async function loadPublicationInput(entity: FinancialEntity, reader: ReaderCase, verdicts: VerdictsFile[string] | undefined): Promise<PublicationInput> {
  entity = normalizeFinancialEntity(reconcileFinancialEntity(entity));
  const media: PublicationMedia = { assets: [], displayableIds: [], problems: [] };
  try {
    const ledger = await readEffectiveManifest(entity.id);
    if (ledger) {
      media.assets = ledger.assets;
      media.problems.push(...ledger.problems);
      for (const asset of ledger.assets) {
        if (!isMediaDisplayable(asset) || asset.kind === 'og_image') continue;
        await readStagedAsset(entity.id, asset);
        media.displayableIds.push(asset.assetId);
      }
    }
  } catch (error) { media.problems.push(error instanceof Error ? error.message : String(error)); }
  return {
    identity: { id: entity.id, name: entity.name, url: entity.url, publishability: entity.publishability },
    entityEligible: isPublishableEntity(entity), reader, verdicts, media,
    sources: reader.sources.map((source) => {
      const snapshot = readCache(source.url) ?? null;
      const claims = [...reader.facts.filter((f) => f.sourceId === source.id).map((f) => f.text), ...reader.metrics.filter((m) => m.sourceId === source.id).map(metricLine)];
      return { sourceId: source.id, url: source.url, publisher: source.publisher, snapshot,
        text: snapshot ? excerpt(snapshot.text, claims, 8000) : '', policy: sourcePolicy(source.url, entity.url) };
    }),
  };
}
