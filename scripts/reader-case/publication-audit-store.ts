/** Local audit receipts only; independent of reader loading and publication input construction. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { contentHash, PUBLICATION_AUDITS_FILE, type LegacyPublicationAudit, type PublicationAudit, type PublicationAudits } from './publication-evaluation';
import { applyAuditDocument, migrateLegacyAudit, type AppliedAudit } from './publication-audit';

export interface AuditDocument {
  inputFile: string; outputFile: string; input: { cases: { entityId: string; publicationHash?: string; itemHashes?: Record<string, string> }[] }; output: unknown;
}
/** Read each modern audit pair once. Legacy analysis-only audits are not promoted. */
export function loadPublicationAuditDocuments(): AuditDocument[] {
  if (!existsSync('data/audit')) return [];
  const documents: AuditDocument[] = [];
  for (const file of readdirSync('data/audit').filter((f) => /^in-\d+\.json$/.test(f)).sort()) {
    const inputFile = `data/audit/${file}`;
    const outputFile = inputFile.replace('/in-', '/out-');
    const input = JSON.parse(readFileSync(inputFile, 'utf8')) as AuditDocument['input'];
    if (!Array.isArray(input?.cases) || !input.cases.some((c) => c.publicationHash || c.itemHashes)) continue;
    if (!existsSync(outputFile)) continue; // 監査待ち（結果がまだ無い）は、合格にも不合格にも数えない
    let output: unknown = null;
    try { output = JSON.parse(readFileSync(outputFile, 'utf8')); } catch { /* A malformed newer review revokes any older approval for that input. */ }
    documents.push({ inputFile, outputFile, input, output });
  }
  return documents;
}

const sameFiles = (doc: AuditDocument | undefined, ref: { outputFile: string; inputFileHash: string; outputFileHash: string }) =>
  !!doc && doc.outputFile === ref.outputFile && contentHash(doc.input) === ref.inputFileHash && contentHash(doc.output) === ref.outputFileHash;

/**
 * 保存済みの記録を読む（畳み込みなし）。監査ファイルの指紋が合わない監査で通した項目は捨てる。旧形式（version 1）はここで項目ごとの形へ移す。
 * threshold: 事例ごとに「ここまでの監査は記録に反映済み」の位置。指紋が合わずに捨てた監査もここに含める（書き換えられた監査を後で畳み込み直さない）。
 */
export function readStoredAudits(documents: AuditDocument[]): { receipts: PublicationAudits; threshold: Record<string, string> } {
  const receipts: PublicationAudits = {};
  const threshold: Record<string, string> = {};
  if (!existsSync(PUBLICATION_AUDITS_FILE)) return { receipts, threshold };
  const entries = JSON.parse(readFileSync(PUBLICATION_AUDITS_FILE, 'utf8')) as Record<string, PublicationAudit | LegacyPublicationAudit>;
  const byFile = new Map(documents.map((doc) => [doc.inputFile, doc]));
  const raise = (id: string, file: string | undefined) => { if (file && (!threshold[id] || file > threshold[id])) threshold[id] = file; };
  for (const [id, receipt] of Object.entries(entries)) {
    if (receipt?.version === 1) {
      raise(id, receipt.inputFile);
      const doc = byFile.get(receipt.inputFile);
      if (!sameFiles(doc, receipt)) continue;
      const migrated = migrateLegacyAudit(id, receipt, doc!);
      if (migrated) receipts[id] = migrated;
      continue;
    }
    if (receipt?.version !== 2 || typeof receipt.caseHash !== 'string' || !receipt.items || !Array.isArray(receipt.audits)) continue;
    raise(id, receipt.lastAudit);
    for (const ref of receipt.audits) raise(id, ref.inputFile);
    const valid = new Set(receipt.audits.filter((ref) => sameFiles(byFile.get(ref.inputFile), ref)).map((ref) => ref.inputFile));
    const items = Object.fromEntries(Object.entries(receipt.items).filter(([, v]) => typeof v?.hash === 'string' && valid.has(v.by)));
    if (Object.keys(items).length) receipts[id] = { ...receipt, items, audits: receipt.audits.filter((ref) => valid.has(ref.inputFile)) };
  }
  return { receipts, threshold };
}

/**
 * 記録に未反映の新しい監査（threshold より後の入力ファイル）を、古い順に畳み込む。onApplied は取り込み（merge-analysis）が推論の直しを書くために使う。
 * 合格の項目が1つも残らない記録は返さない。
 */
export function foldNewerAudits(stored: ReturnType<typeof readStoredAudits>, documents: AuditDocument[],
  onApplied?: (id: string, doc: AuditDocument, applied: AppliedAudit) => void): PublicationAudits {
  const receipts: PublicationAudits = { ...stored.receipts };
  for (const doc of documents) {
    for (const id of new Set(doc.input.cases.map((c) => c.entityId))) {
      if (stored.threshold[id] && doc.inputFile <= stored.threshold[id]) continue;
      const applied = applyAuditDocument(receipts[id], id, doc);
      if (!applied) continue;
      receipts[id] = applied.receipt;
      onApplied?.(id, doc, applied);
    }
  }
  for (const [id, receipt] of Object.entries(receipts)) if (!Object.keys(receipt.items).length) delete receipts[id];
  return receipts;
}

/** 今効いている記録（保存済み＋未反映の新しい監査）。新しい不合格・壊れた結果は、取り込みの前でも古い合格を打ち消す */
export function readPublicationAudits(documents = loadPublicationAuditDocuments()): PublicationAudits {
  return foldNewerAudits(readStoredAudits(documents), documents);
}
