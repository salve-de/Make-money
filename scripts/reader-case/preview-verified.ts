/** 照合結果を当てた後の姿を事例ごとに表示する（公開版は作らない）。node --import tsx scripts/reader-case/preview-verified.ts --ids <file> */
import { readFileSync } from 'node:fs';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import { validateReader } from '../../src/lib/company-access/reader-case-projection';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';

const idsFile = argValue('--ids');
const readers = loadReaders(idsFile ? readIdsFile(idsFile) : undefined);
const verdicts = JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')) as VerdictsFile;
let published = 0;
const withheld = { unverified: 0, thin: 0, schemaInvalid: 0 };
for (const [id, reader] of readers) {
  const before = reader.facts.length + reader.metrics.length;
  const out = applyVerdicts(reader, verdicts[id]);
  if (!out) { withheld.unverified++; console.log(`${id.slice(0, 44).padEnd(44)} ${before} -> 未照合(非公開)`); continue; }
  const bad = validateReader(out.reader);
  const thin = out.reader.facts.length <= 2 && out.reader.metrics.length === 0;
  if (bad) withheld.schemaInvalid++; else if (thin) withheld.thin++; else published++;
  console.log(`${id.slice(0, 44).padEnd(44)} ${before} -> ${out.kept} (置換${out.replaced}, 落ち${out.dropped.length})${bad ? ' INVALID ' + bad : thin ? ' 薄い(非公開)' : ''}`);
}
console.log(JSON.stringify({ cases: readers.size, published, withheld }));
