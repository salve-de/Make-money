/**
 * 仕上げ済みの事例を data/catalog-finished-ids.txt に書く。条件: 照合済みの事実があり、必須項目が事実か推論で全部埋まり、
 * 公開前の監査（data/audit/out-*.json）を通っている（BLOCK は merge-analysis で外した後に数える）。規約で表示を禁じる出典を引いていない。
 * 使い方: node --import tsx scripts/reader-case/select-finished.ts --ids <候補の一覧>
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { citesRestrictedSource, missingRequired, reflectAnalysis, type AnalysisFile } from './analysis-lib';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';

const verdicts = JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')) as VerdictsFile;
const analysis = JSON.parse(readFileSync('data/reader-analysis.json', 'utf8')) as AnalysisFile;
const audited = new Set<string>();
for (const f of existsSync('data/audit') ? readdirSync('data/audit').filter((x) => /^out-\d+\.json$/.test(x)) : []) {
  for (const c of (JSON.parse(readFileSync(`data/audit/${f}`, 'utf8')) as { cases: { entityId: string }[] }).cases) audited.add(c.entityId);
}
const finished: string[] = [];
const notYet: Record<string, string[]> = {};
for (const [id, reader] of loadReaders(readIdsFile(argValue('--ids') ?? ''))) {
  const applied = applyVerdicts(reader, verdicts[id]);
  if (!applied) { notYet[id] = ['未照合']; continue; }
  const r = reflectAnalysis(applied.reader, analysis[id]);
  // 公開データ作り（prepare-catalog-release.ts の HOLD_THIN）と同じく、照合済みの事実2件以下で数字が無い事例は出さない
  const thin = r.facts.length <= 2 && r.metrics.length === 0;
  const why = [...missingRequired(r).map((m) => `空欄:${m}`), ...(thin ? ['データが少ない（事実2件以下で数字なし）'] : []), ...(audited.has(id) ? [] : ['未監査']), ...(citesRestrictedSource(r) ? ['出典:規約で表示不可(eBiz)'] : [])];
  if (why.length) notYet[id] = why; else finished.push(id);
}
writeFileSync('data/catalog-finished-ids.txt', `# 仕上げ済み（全項目の推論と公開前の監査が済んだ）事例。scripts/reader-case/select-finished.ts が書く\n${finished.sort().join('\n')}\n`);
console.log(JSON.stringify({ finished: finished.length, notYet: Object.keys(notYet).length, reasons: notYet }, null, 1));
