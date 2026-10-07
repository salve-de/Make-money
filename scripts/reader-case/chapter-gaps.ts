/**
 * 仕上げ済みなのに章が無い事例の一覧（定期実行が次に章を作る対象）。
 *   pnpm case-chapters:todo           件数と、章なし・古い章の事例ID
 *   pnpm case-chapters:todo --json    同じ内容を JSON で
 * 章を作る手順は docs/CASE_CHAPTER_PROCESS.md。
 */
import { readFileSync } from 'node:fs';
import { chapterGaps, type GapEntry } from '../../src/shared/chapter-gaps';

const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const finished = readFileSync('data/catalog-finished-ids.txt', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const gaps = chapterGaps(finished, read<GapEntry[]>('data/case-chapters.json'), read<GapEntry[]>('data/list-lines.json'));

if (process.argv.includes('--json')) console.log(JSON.stringify(gaps, null, 1));
else {
  console.log(`仕上げ済み ${finished.length} 件: 章が出る ${gaps.ready.length} / 章なし ${gaps.missing.length} / 古くて出ない ${gaps.stale.length}`);
  for (const id of gaps.stale) console.log(`古い: ${id}（一覧の文が変わった。章を作り直す）`);
  for (const id of gaps.missing) console.log(`章なし: ${id}`);
}
