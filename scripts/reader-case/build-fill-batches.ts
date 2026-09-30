/**
 * 必須項目が空いたままの事例だけを集め、空いた項目だけを Codex に埋めさせる入力（data/analyze/batches/add-NNN.json）を作る。
 * 事例の中身（事実・出典本文）は分析に使ったバッチ（batch-*.json）から取り、onlyItems に空いた項目を載せる。
 * 実行: ANALYZE_PREFIX=add- ANALYZE_NOTE='各事例の onlyItems に挙げた項目だけを返す' bash scripts/reader-case/run-analyze.sh
 * 結果は merge-analysis.ts が既存の推論の後ろに足す。
 * 使い方: node --import tsx scripts/reader-case/build-fill-batches.ts --ids <候補の一覧> [--start N]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { ANALYSIS_FILE, ANALYZE_DIR, missingRequired, reflectAnalysis, type AnalysisFile } from './analysis-lib';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';

const verdicts = JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')) as VerdictsFile;
const analysis = JSON.parse(readFileSync(ANALYSIS_FILE, 'utf8')) as AnalysisFile;
const batchDir = `${ANALYZE_DIR}/batches`;
const inputs = new Map<string, Record<string, unknown>>();
for (const f of readdirSync(batchDir).filter((x) => /^batch-[\w-]+\.json$/.test(x)).sort()) {
  for (const c of (JSON.parse(readFileSync(`${batchDir}/${f}`, 'utf8')) as { cases: { entityId: string }[] }).cases) inputs.set(c.entityId, c);
}
const cases: Record<string, unknown>[] = [];
for (const [id, reader] of loadReaders(readIdsFile(argValue('--ids') ?? ''))) {
  const applied = applyVerdicts(reader, verdicts[id]);
  const input = inputs.get(id);
  if (!applied || !input || !analysis[id]) continue;
  const missing = missingRequired(reflectAnalysis(applied.reader, analysis[id]));
  if (missing.length) cases.push({ ...input, onlyItems: missing });
}
const start = Number(argValue('--start') ?? 1);
const PER = 10;
for (let i = 0; i < cases.length; i += PER) {
  const n = String(start + i / PER).padStart(3, '0');
  writeFileSync(`${batchDir}/add-${n}.json`, JSON.stringify({ batch: `add-${n}`, cases: cases.slice(i, i + PER) }));
}
console.log(JSON.stringify({ cases: cases.length, items: cases.reduce((s, c) => s + (c.onlyItems as string[]).length, 0) }));
