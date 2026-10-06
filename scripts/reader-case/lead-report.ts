/**
 * 分析結果のリード（HEADLINE）が基準（src/shared/lead-standard.ts）に合っているかを数えて表示する。止めはしない。
 * 使い方: node --import tsx scripts/reader-case/lead-report.ts --ids <file>
 */
import { existsSync, readFileSync } from 'node:fs';
import { checkLead } from '../../src/shared/lead-standard';
import { ANALYSIS_FILE, type AnalysisFile } from './analysis-lib';
import { argValue, loadReaders, readIdsFile } from './load-readers';

const idsFile = argValue('--ids');
const ids = idsFile ? readIdsFile(idsFile) : undefined;
const analysis = existsSync(ANALYSIS_FILE) ? (JSON.parse(readFileSync(ANALYSIS_FILE, 'utf8')) as AnalysisFile) : {};
const readers = loadReaders(ids);
const byProblem: Record<string, number> = {};
let total = 0;
let bad = 0;
for (const [id, reader] of readers) {
  const h = (analysis[id] ?? []).find((a) => a.item === 'HEADLINE');
  if (!h) continue;
  total++;
  const v = checkLead(h, reader);
  if (!v.ok) { bad++; for (const p of v.problems) byProblem[p] = (byProblem[p] ?? 0) + 1; }
}
console.log(JSON.stringify({ leads: total, offStandard: bad, byProblem }));
