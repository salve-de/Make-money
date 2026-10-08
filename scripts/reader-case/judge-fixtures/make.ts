/**
 * 判定の固定の検査集を作り直す（意図して基準を更新する時だけ流す）。
 *   node --import tsx scripts/reader-case/judge-fixtures/make.ts
 * published-display.json: 公開済みの事例の画面の層の5ファイルを、その事例の分だけ抜いて凍結したもの（データが後から変わっても検査集は変わらない）。
 * baseline.json: 凍結した画面に機械の検査を当てた「行×観点」の数（事例ごと・観点ごと）。試験はこれを超えたら落ちる（誤検出が増えた）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DISPLAY_FILES, serialize, type DisplayFiles } from '../../../src/shared/display-build';
import { entityDisplayOf } from '../judge-stage';
import { countByKind, countKeys, loadTerms, machineChecks } from '../judge-checks';
import { loadMachineRules } from '../judge-lib';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const ids = Object.keys((JSON.parse(readFileSync(join(ROOT, 'data/catalog-release.json'), 'utf8')) as { details: Record<string, string> }).details);
const files = Object.fromEntries(DISPLAY_FILES.map((f) => [f, (JSON.parse(readFileSync(join(ROOT, 'data', `${f}.json`), 'utf8')) as Array<{ entityId: string }>).filter((l) => ids.includes(l.entityId))])) as unknown as DisplayFiles;
writeFileSync(join(HERE, 'published-display.json'), serialize(files));
const rules = loadMachineRules(ROOT); const terms = loadTerms(ROOT);
const baseline: Record<string, { flags: number; byKind: Record<string, number> }> = {};
for (const id of ids) {
  const flags = machineChecks(files, { entityId: id, terms, rules }, entityDisplayOf(files, id));
  baseline[id] = { flags: countKeys(flags), byKind: countByKind(flags) };
}
writeFileSync(join(HERE, 'baseline.json'), serialize(baseline));
console.log(`凍結 ${ids.length} 件、機械の指摘 合計 ${Object.values(baseline).reduce((a, b) => a + b.flags, 0)}`);
