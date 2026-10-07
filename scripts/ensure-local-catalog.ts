import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { stringifyDeterministic } from '../src/lib/foundation/dossier-projection';

/**
 * 手元の開発サーバ（pnpm dev）の前に、手元の公開版（.catalog-release/）が今のコードの版と合っているか確かめ、
 * 無い・古い時だけ作り直す（pnpm catalog:prepare --artifacts-only。出典の証拠は要らず、数十秒）。
 * 手元の画面は、.catalog-release/current.json（手元の目印）が指す版を読む。本番と同じ「目印を読む」道。
 * CATALOG_RELEASE_DIR を自分で指定している時は、その置き場を信じて何もしない。
 */
function main() {
  if (process.env.CATALOG_RELEASE_DIR?.trim()) return;
  const bundled = JSON.parse(readFileSync('data/catalog-release.json', 'utf8')) as unknown;
  const bundledHash = createHash('sha256').update(stringifyDeterministic(bundled)).digest('hex');
  try {
    const pointer = JSON.parse(readFileSync('.catalog-release/current.json', 'utf8')) as { manifestHash?: string };
    if (pointer.manifestHash === bundledHash) return;
  } catch { /* 無ければ作る */ }
  console.log('[dev] 手元の公開版（.catalog-release）が今の版と合っていないので、作り直します');
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/prepare-catalog-release.ts', '--artifacts-only'], { stdio: 'inherit' });
  if (result.status !== 0) console.warn('[dev] 手元の公開版を作れませんでした。画面は R2 または同梱の版から読みます');
}
main();
