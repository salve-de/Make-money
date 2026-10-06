/** Local audit receipts only; independent of reader loading and publication input construction. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { contentHash, PUBLICATION_AUDITS_FILE, type PublicationAudits } from './publication-evaluation';

export interface AuditDocument {
  inputFile: string; outputFile: string; input: { cases: { entityId: string; publicationHash?: string }[] }; output: unknown;
}
/** Read each modern audit pair once. Legacy analysis-only audits are not promoted. */
export function loadPublicationAuditDocuments(): AuditDocument[] {
  if (!existsSync('data/audit')) return [];
  const documents: AuditDocument[] = [];
  for (const file of readdirSync('data/audit').filter((f) => /^in-\d+\.json$/.test(f)).sort()) {
    const inputFile = `data/audit/${file}`;
    const outputFile = inputFile.replace('/in-', '/out-');
    const input = JSON.parse(readFileSync(inputFile, 'utf8')) as AuditDocument['input'];
    if (!Array.isArray(input?.cases) || !input.cases.some((c) => c.publicationHash)) continue;
    if (!existsSync(outputFile)) continue;
    let output: unknown = null;
    try { output = JSON.parse(readFileSync(outputFile, 'utf8')); } catch { /* A malformed newer review revokes any older approval for that input. */ }
    documents.push({ inputFile, outputFile, input, output });
  }
  return documents;
}

/** Audit file identity is checked as well as the latest review for the same input. */
export function readPublicationAudits(documents = loadPublicationAuditDocuments()): PublicationAudits {
  if (!existsSync(PUBLICATION_AUDITS_FILE)) return {};
  const entries = JSON.parse(readFileSync(PUBLICATION_AUDITS_FILE, 'utf8')) as PublicationAudits;
  const valid: PublicationAudits = {};
  const byFile = new Map(documents.map((doc) => [doc.inputFile, doc]));
  for (const [id, receipt] of Object.entries(entries)) {
    if (receipt?.version !== 1) continue;
    const doc = byFile.get(receipt.inputFile);
    if (!doc || doc.outputFile !== receipt.outputFile) continue;
    const latest = documents.filter((candidate) => candidate.input.cases.some((c) => c.entityId === id &&
      (c.publicationHash === receipt.inputHash || c.publicationHash === receipt.approvedHash))).at(-1);
    if (latest !== doc) continue;
    const output = doc.output as { cases?: { entityId: string; items: unknown[] }[] } | null;
    if (contentHash(doc.input) === receipt.inputFileHash && contentHash(doc.output) === receipt.outputFileHash &&
        doc.input.cases.some((c) => c.entityId === id && c.publicationHash === receipt.inputHash) &&
        output?.cases?.some((c) => c.entityId === id && Array.isArray(c.items))) valid[id] = receipt;
  }
  return valid;
}
