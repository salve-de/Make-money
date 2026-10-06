import { z } from 'zod';
import { applyAudit, type StoredAnalysis } from './analysis-lib';
import { contentHash, publicationHash, type PublicationAudit, type PublicationInput } from './publication-evaluation';

const findingsSchema = z.array(z.object({
  analysisId: z.string().min(1), kind: z.string().min(1), severity: z.enum(['BLOCK', 'FIX', 'LOW']),
  why: z.string().optional(), fix: z.string().optional(), fixFormula: z.string().optional(),
}));

/** An output is authority only for the input actually sent to the auditor. No legacy hash migration. */
export function applyPublicationAudit(input: PublicationInput, inputDocument: unknown, outputDocument: unknown, inputFile: string, outputFile: string):
  { analysis: StoredAnalysis[]; receipt: PublicationAudit } | null {
  const inputs = (inputDocument as { cases?: { entityId: string; snapshot?: PublicationInput; publicationHash?: string }[] })?.cases;
  const outputs = (outputDocument as { cases?: { entityId: string; items?: unknown }[] })?.cases;
  if (!Array.isArray(inputs) || !Array.isArray(outputs)) return null;
  const id = input.identity.id;
  const matching = inputs.filter((c) => c.entityId === id);
  const reviews = outputs.filter((c) => c.entityId === id);
  if (matching.length !== 1 || reviews.length !== 1) return null;
  const original = matching[0];
  if (!original.snapshot || original.publicationHash !== publicationHash(original.snapshot) || original.publicationHash !== publicationHash(input)) return null;
  const findings = findingsSchema.safeParse(reviews[0].items);
  if (!findings.success) return null;
  const itemIds = new Set(input.reader.analysis.map((a) => a.id));
  if (findings.data.some((f) => f.analysisId === '__case__' ? f.severity !== 'LOW' : !itemIds.has(f.analysisId))) return null;
  const applied = applyAudit(id, input.reader.analysis, findings.data.filter((f) => f.analysisId !== '__case__'), input.reader);
  const approved = { ...input, reader: { ...input.reader, analysis: applied.kept } };
  return { analysis: applied.kept, receipt: { version: 1, inputHash: original.publicationHash,
    approvedHash: publicationHash(approved), inputFile, outputFile,
    inputFileHash: contentHash(inputDocument), outputFileHash: contentHash(outputDocument) } };
}
