/**
 * Codex の推論（data/analyze/out/batch-NNN.json）を機械で確かめ、通ったものだけ data/reader-analysis.json に書く。
 * 落とす条件は analysis-lib.ts の checkItem を参照。既存の reader-analysis.json は、今回出力のある事例だけ置き換える。
 * 使い方: node --import tsx scripts/reader-case/merge-analysis.ts [--ids <file>]
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { ANALYSIS_FILE, ANALYZE_DIR, applyAudit, checkCase, type AnalysisFile, type AuditFinding, type Dropped } from './analysis-lib';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';

function main() {
  const idsFile = argValue('--ids');
  // 照合で外れた事実・数字は、公開時（select-finished）と同じく無いものとして推論を確かめる。
  // 外れた売上の数字が残ったままだと「売上の事実があるのに推計した」と誤って売上の推定を落とし、必須の欄が空になる。
  const verdicts = existsSync(VERDICTS_FILE) ? (JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')) as VerdictsFile) : {};
  const readers = new Map([...loadReaders(idsFile ? readIdsFile(idsFile) : undefined)].map(([id, r]) => [id, applyVerdicts(r, verdicts[id])?.reader ?? r]));
  const outDir = `${ANALYZE_DIR}/out`;
  const raws = new Map<string, unknown>();
  for (const f of existsSync(outDir) ? readdirSync(outDir).sort() : []) {
    if (!/^batch-[\w-]+\.json$/.test(f)) continue;
    const j = JSON.parse(readFileSync(`${outDir}/${f}`, 'utf8')) as { analysis?: { entityId: string; items?: unknown }[] };
    for (const c of j.analysis ?? []) raws.set(c.entityId, c.items);
  }
  // 足りない項目だけを後から埋めた結果（add-*.json）は、既存の item の後ろに足す（同じ item は先勝ちで既存を残す）
  for (const f of existsSync(outDir) ? readdirSync(outDir).sort() : []) {
    if (!/^add-[\w-]+\.json$/.test(f)) continue;
    const j = JSON.parse(readFileSync(`${outDir}/${f}`, 'utf8')) as { analysis?: { entityId: string; items?: unknown }[] };
    for (const c of j.analysis ?? []) {
      const prev = raws.get(c.entityId);
      if (Array.isArray(prev) && Array.isArray(c.items)) raws.set(c.entityId, [...prev, ...c.items]);
    }
  }
  const result: AnalysisFile = existsSync(ANALYSIS_FILE) ? (JSON.parse(readFileSync(ANALYSIS_FILE, 'utf8')) as AnalysisFile) : {};
  const byItem: Record<string, number> = {};
  const byReason: Record<string, number> = {};
  const dropped: Dropped[] = [];
  let cases = 0;
  let items = 0;
  for (const [entityId, items0] of raws) {
    const reader = readers.get(entityId);
    if (!reader) continue;
    const r = checkCase(entityId, items0, reader);
    dropped.push(...r.dropped);
    for (const d of r.dropped) byReason[d.reason] = (byReason[d.reason] ?? 0) + 1;
    if (r.kept.length) {
      result[entityId] = r.kept;
      cases++;
      for (const k of r.kept) { byItem[k.item] = (byItem[k.item] ?? 0) + 1; items++; }
    } else delete result[entityId];
  }
  // 公開前の監査の指摘を反映する（data/audit/out-*.json）。BLOCK は外し、FIX は直した文に置き換える
  const audit = { cases: 0, fixed: 0, removed: [] as { entityId: string; id: string; kind: string; why?: string }[] };
  const auditDir = 'data/audit';
  for (const f of existsSync(auditDir) ? readdirSync(auditDir).filter((x) => /^out-\d+\.json$/.test(x)).sort() : []) {
    const j = JSON.parse(readFileSync(`${auditDir}/${f}`, 'utf8')) as { cases?: { entityId: string; items?: AuditFinding[] }[] };
    for (const c of j.cases ?? []) {
      const reader = readers.get(c.entityId);
      if (!reader || !result[c.entityId]) continue;
      const r = applyAudit(c.entityId, result[c.entityId], c.items, reader);
      result[c.entityId] = r.kept;
      audit.cases++; audit.fixed += r.fixed;
      audit.removed.push(...r.removed.map((x) => ({ entityId: c.entityId, ...x })));
    }
  }
  writeFileSync(`${auditDir}-applied.json`, JSON.stringify(audit, null, 1));
  writeFileSync(ANALYSIS_FILE, JSON.stringify(result, null, 1) + '\n');
  writeFileSync(`${ANALYZE_DIR}/dropped.json`, JSON.stringify(dropped, null, 1));
  console.log(JSON.stringify({ casesWithOutput: raws.size, casesKept: cases, itemsKept: items, itemsDropped: dropped.length, byItem, dropByReason: byReason, audited: audit.cases, auditFixed: audit.fixed, auditRemoved: audit.removed.length }, null, 1));
}

main();
