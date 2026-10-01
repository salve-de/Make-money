/**
 * 公開前の抜き取り監査の入力を作る。指定した事例の、照合後の facts/metrics と analysis を並べて data/audit/in-NNN.json に書く。
 * 使い方: node --import tsx scripts/reader-case/build-audit-input.ts --ids <file> [--per 10] [--tag 999999YYMMDDHHMM]
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { RAW_HASHES_FILE, reflectAnalysis, type AnalysisFile } from './analysis-lib';
import { VERDICTS_FILE, metricLine, type VerdictsFile } from './verify-lib';

const ids = readIdsFile(argValue('--ids') ?? '');
const per = Number(argValue('--per') ?? 10);
const start = Number(argValue('--start') ?? 1);
// --tag を付けると in-<tag>NNN.json の名前にする（数字の桁あふれを避け、後の回ほど名前順で後ろに来るようにする）
const tag = argValue('--tag');
const verdicts = JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')) as VerdictsFile;
const analysis = JSON.parse(readFileSync('data/reader-analysis.json', 'utf8')) as AnalysisFile;
// 分析役が読んだ出典の本文（data/analyze/batches）も渡す。事実に無くても本文にあれば捏造ではない
const sourceTexts = new Map<string, unknown>();
for (const f of readdirSync('data/analyze/batches')) {
  for (const c of (JSON.parse(readFileSync(`data/analyze/batches/${f}`, 'utf8')) as { cases: { entityId: string; sources: unknown }[] }).cases) sourceTexts.set(c.entityId, c.sources);
}
const cases: unknown[] = [];
for (const [id, reader] of loadReaders(ids)) {
  const applied = applyVerdicts(reader, verdicts[id]);
  if (!applied) continue;
  const r = reflectAnalysis(applied.reader, analysis[id]);
  cases.push({
    entityId: id,
    facts: r.facts.map((f) => ({ id: f.id, kind: f.kind, text: f.text, attribution: f.attribution })),
    metrics: r.metrics.map((m) => ({ id: m.id, line: metricLine(m) })),
    sources: sourceTexts.get(id) ?? [],
    analysis: r.analysis.map((a) => ({ id: a.id, item: a.item, text: a.text, formula: a.formula, basis: a.basis, confidence: a.confidence })),
  });
}
mkdirSync('data/audit', { recursive: true });
for (let i = 0; i * per < cases.length; i++) {
  writeFileSync(`data/audit/in-${tag ? `${tag}${String(i + 1).padStart(3, '0')}` : String(i + start).padStart(3, '0')}.json`, JSON.stringify({ cases: cases.slice(i * per, (i + 1) * per) }, null, 1));
}
// この回で監査する推論の指紋を残す。merge-analysis.ts は今の指紋と同じ時だけこの回の監査を反映し、監査済みに数える
if (tag) {
  const raw = JSON.parse(readFileSync(RAW_HASHES_FILE, 'utf8')) as Record<string, string>;
  writeFileSync(`data/audit/hash-${tag}.json`, JSON.stringify(Object.fromEntries(cases.map((c) => [(c as { entityId: string }).entityId, raw[(c as { entityId: string }).entityId]])), null, 1));
}
console.log(JSON.stringify({ cases: cases.length, files: Math.ceil(cases.length / per) }));
