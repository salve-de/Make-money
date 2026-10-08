/**
 * 事例ごとに「いま画面に出る文」を手元で描いて JSON に書く（case:run の judge 段が読む）。
 *
 *   tsx scripts/reader-case/screen-lines.tsx --ids a,b,c --out <dir>
 *
 * データからではなく、公開データ（.catalog-release）を本番と同じ読み込みで開き、本番と同じ部品を描いた画面の文字を取る
 * （描く部品は scripts/architecture/screen-render-lib.tsx。screen-text.tsx と同じ）。
 * 出力 <dir>/<id>.json: { id, ok, name, tags, detail（詳細の本文）, list（一覧の行）, discover（探す画面の行）, error? }
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { extractScreenText, loadEntity, parts, renderToStaticMarkup } from '../architecture/screen-render-lib';

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const ROOT = process.cwd();
const ids = (opt('--ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const out = opt('--out');
if (!ids.length || !out) { console.error('使い方: tsx scripts/reader-case/screen-lines.tsx --ids a,b --out <dir>'); process.exit(2); }
mkdirSync(resolve(ROOT, out), { recursive: true });

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'data/catalog-release.json'), 'utf8')) as { details: Record<string, string> };
const origError = console.error; console.error = () => undefined; // 描画中の React の警告は捨てる
let bad = 0;
for (const id of ids) {
  const file = resolve(ROOT, out, `${id}.json`);
  try {
    const hash = manifest.details[id];
    if (!hash) throw new Error('公開データ（data/catalog-release.json の details）に無い');
    const entity = loadEntity(id, hash, ROOT);
    if (!entity) throw new Error('公開データを読み込めない');
    const pick: Record<string, string[]> = { detail: [], list: [], discover: [] };
    for (const [name, , make] of parts(entity)) {
      const key = name === 'ReaderLedger' ? 'detail' : name === 'ListRow' ? 'list' : name === 'ListRow(探す)' ? 'discover' : null;
      if (!key) continue;
      const el = make();
      if (el) pick[key].push(...extractScreenText(renderToStaticMarkup(el)).lines);
    }
    writeFileSync(file, JSON.stringify({ id, ok: true, name: entity.name, tags: entity.tags ?? [], ...pick }, null, 1));
  } catch (e) {
    bad += 1;
    writeFileSync(file, JSON.stringify({ id, ok: false, error: (e as Error).message }, null, 1));
  }
}
console.error = origError;
console.log(`[screen-lines] ${ids.length - bad}/${ids.length} 件を描いた`);
process.exit(bad ? 1 : 0);
