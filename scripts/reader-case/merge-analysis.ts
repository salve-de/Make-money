/**
 * Codex の推論（data/analyze/out/batch-NNN.json）を機械で確かめ、通ったものだけ data/reader-analysis.json に書く。
 * 落とす条件は analysis-lib.ts の checkItem を参照。既存の reader-analysis.json は、今回出力のある事例だけ置き換える。
 * 使い方: node --import tsx scripts/reader-case/merge-analysis.ts [--ids <file>]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import { argValue, loadEntities, loadRawItems, loadReaders, loadSourceTexts, readIdsFile } from './load-readers';
import { ANALYSIS_FILE, ANALYZE_DIR, AUDIT_FRESH_FILE, RAW_HASHES_FILE, analysisHash, auditEvidence, checkCase, type AnalysisFile, type Dropped } from './analysis-lib';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';
import { loadPublicationAuditDocuments, loadPublicationInput, readPublicationAudits } from './publication-inputs';
import { applyPublicationAudit } from './publication-audit';
import { PUBLICATION_AUDITS_FILE, evaluatePublication, publicationHash, type PublicationAudits } from './publication-evaluation';

async function main() {
  const idsFile = argValue('--ids');
  // 照合で外れた事実・数字は、公開時（select-finished）と同じく無いものとして推論を確かめる。
  // 外れた売上の数字が残ったままだと「売上の事実があるのに推計した」と誤って売上の推定を落とし、必須の欄が空になる。
  const verdicts = existsSync(VERDICTS_FILE) ? (JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')) as VerdictsFile) : {};
  const readers = new Map([...loadReaders(idsFile ? readIdsFile(idsFile) : undefined)].map(([id, r]) => [id, applyVerdicts(r, verdicts[id])?.reader ?? r]));
  const sourceTexts = loadSourceTexts();
  const entities = loadEntities([...readers.keys()]);
  const outDir = `${ANALYZE_DIR}/out`;
  const raws = loadRawItems(outDir);
  const result: AnalysisFile = existsSync(ANALYSIS_FILE) ? (JSON.parse(readFileSync(ANALYSIS_FILE, 'utf8')) as AnalysisFile) : {};
  const byItem: Record<string, number> = {};
  const byReason: Record<string, number> = {};
  const dropped: Dropped[] = [];
  let cases = 0;
  let items = 0;
  const rawHashes: Record<string, string> = existsSync(RAW_HASHES_FILE) ? (JSON.parse(readFileSync(RAW_HASHES_FILE, 'utf8')) as Record<string, string>) : {};
  for (const [entityId, items0] of raws) {
    const reader = readers.get(entityId);
    if (!reader) continue;
    const r = checkCase(entityId, items0, reader, { strictNumbers: true });
    dropped.push(...r.dropped);
    for (const d of r.dropped) byReason[d.reason] = (byReason[d.reason] ?? 0) + 1;
    if (r.kept.length) {
      result[entityId] = r.kept;
      rawHashes[entityId] = analysisHash(r.kept, verdicts[entityId], auditEvidence(reader, sourceTexts.get(entityId)));
      cases++;
      for (const k of r.kept) { byItem[k.item] = (byItem[k.item] ?? 0) + 1; items++; }
    } else delete result[entityId];
  }
  // 審査受領書: 「いま公開しようとしている入力全体」の指紋に対する監査だけを有効とする。
  // 旧形式（推論だけの指紋）の監査は引き継がない。文章・根拠・出典・権利・画像が変われば指紋が変わり、受領書は無効になる。
  const documents = loadPublicationAuditDocuments();
  const receipts: PublicationAudits = readPublicationAudits(documents);
  // 一部の事例だけを統合した時（--ids）は、対象外の事例の受領書をそのまま残す
  const fresh = new Set<string>();
  let stale = 0;
  let audited = 0;
  for (const [id, reader] of readers) {
    const entity = entities.get(id);
    if (!entity) continue;
    let current = await loadPublicationInput(entity, { ...reader, analysis: result[id] ?? [] }, verdicts[id]);
    for (const doc of documents.filter((d) => d.input.cases.some((c) => c.entityId === id))) {
      const { inputFile, outputFile, input: inputDoc, output: outputDoc } = doc;
      const matching = inputDoc.cases.find((c) => c.entityId === id);
      // 同じ入力への新しい不合格・壊れた出力は、古い合格を打ち消す（巻き戻しで合格に戻らない）
      if (matching?.publicationHash === publicationHash(current) || matching?.publicationHash === receipts[id]?.inputHash) delete receipts[id];
      const approved = applyPublicationAudit(current, inputDoc, outputDoc, inputFile, outputFile);
      if (!approved) continue;
      result[id] = approved.analysis;
      receipts[id] = approved.receipt;
      current = { ...current, reader: { ...current.reader, analysis: approved.analysis } };
      audited++;
    }
    const evaluation = evaluatePublication(current, receipts[id]);
    if (!evaluation.reasons.includes('現在の入力に対する監査が無い')) fresh.add(id);
    else { delete receipts[id]; stale++; }
  }
  for (const id of Object.keys(receipts)) if (!readers.has(id)) fresh.add(id);
  mkdirSync(ANALYZE_DIR, { recursive: true });
  writeFileSync(PUBLICATION_AUDITS_FILE, JSON.stringify(receipts, null, 1) + '\n');
  writeFileSync(RAW_HASHES_FILE, JSON.stringify(rawHashes, null, 1) + '\n');
  writeFileSync(AUDIT_FRESH_FILE, JSON.stringify([...fresh].sort(), null, 1) + '\n');
  writeFileSync(ANALYSIS_FILE, JSON.stringify(result, null, 1) + '\n');
  writeFileSync(`${ANALYZE_DIR}/dropped.json`, JSON.stringify(dropped, null, 1));
  console.log(JSON.stringify({ casesWithOutput: raws.size, casesKept: cases, itemsKept: items, itemsDropped: dropped.length, byItem, dropByReason: byReason, audited, auditFresh: fresh.size, auditStale: stale }, null, 1));
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
