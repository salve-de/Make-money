/** Local-only evidence reads. No network, API, R2 or source writes. */
import { isPublishableEntity } from '../../src/lib/company-access/public-entity';
import { sourcePolicy } from './source-policy';
import { normalizeFinancialEntity } from '../../src/shared/financial-integrity';
import { reconcileFinancialEntity } from '../../src/platform/data/financial-reconciliation';
import { readEffectiveManifest, readStagedAsset } from '../../src/shared/media-asset-store';
import { isMediaDisplayable } from '../../src/shared/media-decisions';
import type { FinancialEntity } from '../../src/shared/terminal';
import type { ReaderCase } from '../../src/shared/reader-case';
import { cachePath, readCache, type VerdictsFile } from './verify-lib';
import { quoteKey, type PublicationInput, type PublicationMedia, type PublicationSource } from './publication-evaluation';
import { attestedSnapshot, readAttestations, type EvidenceAttestations } from './publication-evidence';

export { loadPublicationAuditDocuments, readPublicationAudits, type AuditDocument } from './publication-audit-store';

export async function loadPublicationInput(entity: FinancialEntity, reader: ReaderCase, verdicts: VerdictsFile[string] | undefined,
  options: { attestations?: EvidenceAttestations } = {}): Promise<PublicationInput> {
  entity = normalizeFinancialEntity(reconcileFinancialEntity(entity));
  // 手元に本文・台帳が有ればそれを正とする。無い時だけ証明書（data/publication-evidence.json）で判定し、それも無ければ missingEvidence に積む
  const attested = (options.attestations ?? readAttestations())[entity.id];
  const missingEvidence: string[] = [];
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
    } else if (attested) {
      media.displayableIds = [...attested.media.displayableIds];
      media.evidence = 'attested';
    } else missingEvidence.push(`画像台帳:data/media-staging/${entity.id}/manifest.json`);
  } catch (error) { media.problems.push(error instanceof Error ? error.message : String(error)); }
  const claims = [...reader.facts, ...reader.metrics];
  const sources = reader.sources.map((source): PublicationSource => {
    const policy = sourcePolicy(source.url, entity.url);
    const snapshot = readCache(source.url) ?? null;
    if (snapshot) {
      // 抜粋せず全文（指紋は全文を元に作られる）
      return { sourceId: source.id, url: source.url, publisher: source.publisher, snapshot, text: snapshot.text, policy };
    }
    const proof = attested?.sources[source.url];
    if (!proof) {
      missingEvidence.push(`出典本文:${source.id}(${cachePath(source.url)})`);
      return { sourceId: source.id, url: source.url, publisher: source.publisher, snapshot: null, text: '', policy };
    }
    const attestedQuotes = proof.quotes;
    for (const claim of claims.filter((c) => c.sourceId === source.id)) {
      const verdict = verdicts?.[claim.id];
      // 照合済みの引用が証明書に無い（照合の後に引用や主張が変わった）。本文が無いので確かめられない＝証拠不足
      if (verdict && ['SUPPORTED', 'PARTIAL'].includes(verdict.verdict) && verdict.sourceUrl === source.url && ![...attestedQuotes, ...(proof.quotesAbsent ?? [])].includes(quoteKey(claim.id, verdict.quote, proof.textHash)))
        missingEvidence.push(`出典本文の照合記録:${claim.id}(${cachePath(source.url)})`);
    }
    return { sourceId: source.id, url: source.url, publisher: source.publisher, snapshot: attestedSnapshot(proof), text: '', policy, evidence: 'attested', attestedQuotes };
  });
  return {
    identity: { id: entity.id, name: entity.name, url: entity.url, publishability: entity.publishability },
    entityEligible: isPublishableEntity(entity), reader, verdicts, media, sources,
    ...(missingEvidence.length ? { missingEvidence } : {}),
  };
}
