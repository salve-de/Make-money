/**
 * Codex の推論（data/analyze/out/batch-NNN.json）を機械で確かめ、通ったものだけ data/reader-analysis.json に書く。
 * 落とす条件は analysis-lib.ts の checkItem を参照。既存の reader-analysis.json は、今回通った項目だけを項目単位で重ねる（通らなかった項目・出なかった項目の既存は残す）。
 * 使い方: node --import tsx scripts/reader-case/merge-analysis.ts [--ids <file>]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import { argValue, loadEntities, loadRawItems, loadReaders, reevaluatedIds, loadSourceTexts, readIdsFile } from './load-readers';
import { ANALYSIS_FILE, ANALYZE_DIR, AUDIT_FRESH_FILE, RAW_HASHES_FILE, analysisHash, auditEvidence, checkCase, type AnalysisFile, type Dropped } from './analysis-lib';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';
import { EVIDENCE_PENDING_FILE, EVIDENCE_REVIEWED_FILE, type EvidenceDigestFile } from './evidence-digest';
import { mergeAnalysisItems } from './merge-items';
import { appendRecord, resolveStuck } from './ledger';
import { loadPublicationAuditDocuments, loadPublicationInput, readPublicationAudits } from './publication-inputs';
import { readReflectState, withReflectedAnalysis } from './case-reflect';
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
  const batchDir = `${ANALYZE_DIR}/batches`;
  const raws = loadRawItems(outDir, batchDir);
  const reevaluated = reevaluatedIds(outDir, batchDir);
  const readJson = <T,>(f: string, fallback: T): T => (existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as T) : fallback);
  const pending = readJson<EvidenceDigestFile>(EVIDENCE_PENDING_FILE, {});
  const reviewed = readJson<EvidenceDigestFile>(EVIDENCE_REVIEWED_FILE, {});
  const result: AnalysisFile = existsSync(ANALYSIS_FILE) ? (JSON.parse(readFileSync(ANALYSIS_FILE, 'utf8')) as AnalysisFile) : {};
  const byItem: Record<string, number> = {};
  const byReason: Record<string, number> = {};
  const dropped: Dropped[] = [];
  let cases = 0;
  let items = 0;
  let retainedAfterReject = 0;
  /** 保留が残っていれば、成功で閉じる */
  const resolveRejected = (id: string) => resolveStuck(id, 'MERGE', undefined, 'merge-analysis');
  const rawHashes: Record<string, string> = existsSync(RAW_HASHES_FILE) ? (JSON.parse(readFileSync(RAW_HASHES_FILE, 'utf8')) as Record<string, string>) : {};
  for (const [entityId, items0] of raws) {
    const reader = readers.get(entityId);
    if (!reader) continue;
    const r = checkCase(entityId, items0, reader, { strictNumbers: true });
    dropped.push(...r.dropped);
    for (const d of r.dropped) byReason[d.reason] = (byReason[d.reason] ?? 0) + 1;
    // 事例の組み立てが変わって根拠の事実IDが消えた既存の項目は、残さない（残すと監査の入力づくりで basis-missing-id になって止まる）
    const liveIds = new Set([...reader.facts.map((f) => f.id), ...reader.metrics.map((m) => m.id)]);
    const existing = (result[entityId] ?? []).filter((p) => p.basis.every((b) => liveIds.has(b)));
    const merged = mergeAnalysisItems(existing, r.kept);
    if (!r.kept.length && existing.length !== (result[entityId] ?? []).length) {
      if (existing.length) result[entityId] = existing; else delete result[entityId];
    }
    if (r.kept.length) {
      result[entityId] = merged.items;
      rawHashes[entityId] = analysisHash(merged.items, verdicts[entityId], auditEvidence(reader, sourceTexts.get(entityId)));
      cases++;
      for (const k of r.kept) { byItem[k.item] = (byItem[k.item] ?? 0) + 1; items++; }
      // 再評価の結果が通ってはじめて「評価済み」にする（束を作っただけ・拒否・保留では進めない）
      if (reevaluated.has(entityId) && pending[entityId]) { reviewed[entityId] = pending[entityId]!; delete pending[entityId]; }
      resolveRejected(entityId);
    } else if (merged.allRejected) {
      // 出力が全部落ちても既存の推論は消さない。理由は台帳に残す
      retainedAfterReject++;
      appendRecord({ caseId: entityId, stage: 'MERGE', status: 'HOLD', reasonCode: 'ANALYSIS_REJECTED', reasonText: `今回の出力 ${r.dropped.length} 項目が機械検査で全て落ちた。既存の ${merged.items.length} 項目は残した`, nextAction: '分析をやり直す', actor: 'merge-analysis', finishedAt: new Date().toISOString() });
    }
  }
  // 審査受領書: 「いま公開しようとしている入力全体」の指紋に対する監査だけを有効とする。
  // 旧形式（推論だけの指紋）の監査は引き継がない。文章・根拠・出典・権利・画像が変われば指紋が変わり、受領書は無効になる。
  const documents = loadPublicationAuditDocuments();
  const receipts: PublicationAudits = readPublicationAudits(documents);
  // 一部の事例だけを統合した時（--ids）は、対象外の事例の受領書をそのまま残す
  const fresh = new Set<string>();
  let stale = 0;
  let audited = 0;
  // 取り込み事例は反映段の推論（build-audit-input と同じもの）で入力を組む。審査で直した推論は reader-analysis.json に書き、case-reflect が受領書と突き合わせて採用する
  const reflected = withReflectedAnalysis(result, readReflectState(), 'audit');
  for (const [id, reader] of readers) {
    const entity = entities.get(id);
    if (!entity) continue;
    // base=この事例の今の入力（まだ審査の直しを当てていない）。current=前の審査の直しを当てた入力。
    // 同じ入力を取り直して監査し直した新しい束は base に対する審査、前の審査の直しを入力にした束は current に対する審査。どちらも受け付ける
    const base = await loadPublicationInput(entity, { ...reader, analysis: reflected[id] ?? [] }, verdicts[id]);
    let current = base;
    for (const doc of documents.filter((d) => d.input.cases.some((c) => c.entityId === id))) {
      const { inputFile, outputFile, input: inputDoc, output: outputDoc } = doc;
      const matching = inputDoc.cases.find((c) => c.entityId === id);
      // 同じ入力への新しい不合格・壊れた出力は、古い合格を打ち消す（巻き戻しで合格に戻らない）
      if (matching?.publicationHash === publicationHash(current) || matching?.publicationHash === publicationHash(base) || matching?.publicationHash === receipts[id]?.inputHash) delete receipts[id];
      const target = matching?.publicationHash === publicationHash(base) ? base : current;
      const approved = applyPublicationAudit(target, inputDoc, outputDoc, inputFile, outputFile);
      if (!approved) continue;
      result[id] = approved.analysis;
      receipts[id] = approved.receipt;
      current = { ...target, reader: { ...target.reader, analysis: approved.analysis } };
      audited++;
    }
    const evaluation = evaluatePublication(current, receipts[id]);
    if (!evaluation.reasons.includes('現在の入力に対する監査が無い')) fresh.add(id);
    else { delete receipts[id]; stale++; }
  }
  for (const id of Object.keys(receipts)) if (!readers.has(id)) fresh.add(id);
  // 一部の事例だけを統合した時（--ids）は、対象外の事例の「監査済み」の記録もそのまま残す
  if (existsSync(AUDIT_FRESH_FILE)) for (const id of JSON.parse(readFileSync(AUDIT_FRESH_FILE, 'utf8')) as string[]) if (!readers.has(id)) fresh.add(id);
  mkdirSync(ANALYZE_DIR, { recursive: true });
  writeFileSync(PUBLICATION_AUDITS_FILE, JSON.stringify(receipts, null, 1) + '\n');
  writeFileSync(RAW_HASHES_FILE, JSON.stringify(rawHashes, null, 1) + '\n');
  writeFileSync(AUDIT_FRESH_FILE, JSON.stringify([...fresh].sort(), null, 1) + '\n');
  writeFileSync(EVIDENCE_PENDING_FILE, JSON.stringify(pending, null, 1) + '\n');
  writeFileSync(EVIDENCE_REVIEWED_FILE, JSON.stringify(reviewed, null, 1) + '\n');
  writeFileSync(ANALYSIS_FILE, JSON.stringify(result, null, 1) + '\n');
  writeFileSync(`${ANALYZE_DIR}/dropped.json`, JSON.stringify(dropped, null, 1));
  console.log(JSON.stringify({ casesWithOutput: raws.size, casesKept: cases, itemsKept: items, itemsDropped: dropped.length, retainedAfterReject, byItem, dropByReason: byReason, audited, auditFresh: fresh.size, auditStale: stale }, null, 1));
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
