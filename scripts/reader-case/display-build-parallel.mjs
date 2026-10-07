#!/usr/bin/env node
/**
 * display:build を事例ごとに別の処理で流し、同時に動く数に上限を付ける（メモリを守る）。
 * 使い方: pnpm display:build:parallel [--parallel 4] -- <display:build に渡す引数…>
 *   例: pnpm display:build:parallel -- --reader-only --review-agent codex --codex-effort low --reader-votes 1
 * 対象は data/catalog-finished-ids.txt の全件。同時の数は既定4、上限も4（それより大きい値は4に下げる）。
 * 事例ごとの出力は data/pipeline/display-build-parallel/<事例ID>.log。最後に同時に動いた最大数と全体の秒を出す。
 * 書き込みを伴う直し（--repair-only など）は、data/ の同じファイルを複数の処理が書くため、ここでは流さない。
 */
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const MAX_PARALLEL = 4;
const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');

/** 引数を、上限つきの同時数と display:build に渡す物に分ける。 */
export function parseArgs(argv) {
  const sep = argv.indexOf('--');
  const own = sep === -1 ? argv : argv.slice(0, sep);
  const pass = sep === -1 ? [] : argv.slice(sep + 1);
  const i = own.indexOf('--parallel');
  const want = i === -1 ? MAX_PARALLEL : Number(own[i + 1]);
  if (!Number.isInteger(want) || want < 1) throw new Error(`--parallel は1以上の整数: ${own[i + 1]}`);
  if (pass.includes('--id')) throw new Error('--id はここでは使わない（対象は仕上げ済みの全件）');
  if (!pass.includes('--reader-only')) throw new Error('流せるのは --reader-only（読者役だけ・書き込みなし）だけ。直しは1つの処理で流す');
  return { parallel: Math.min(want, MAX_PARALLEL), pass };
}

/** 仕事を、同時に limit 個までで流す。同時に動いた最大数を返す。 */
export async function runLimited(items, limit, work) {
  let running = 0, peak = 0, next = 0;
  const results = new Array(items.length);
  async function lane() {
    while (next < items.length) {
      const k = next++;
      running++; peak = Math.max(peak, running);
      try { results[k] = await work(items[k]); } finally { running--; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return { peak, results };
}

async function main() {
  const { parallel, pass } = parseArgs(process.argv.slice(2));
  const ids = readFileSync(join(ROOT, 'data/catalog-finished-ids.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const logDir = join(ROOT, 'data/pipeline/display-build-parallel');
  mkdirSync(logDir, { recursive: true });
  const start = Date.now();
  const { peak, results } = await runLimited(ids, parallel, (id) => new Promise((done) => {
    const t = Date.now();
    const log = createWriteStream(join(logDir, `${id}.log`));
    const child = spawn('node', ['--import', 'tsx', 'scripts/reader-case/build-display.ts', ...pass, '--id', id], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(log); child.stderr.pipe(log);
    child.on('close', (code) => { const s = Math.round((Date.now() - t) / 1000); console.log(`[display:build:parallel] ${id} 終了=${code} ${s}秒`); done(code ?? 1); });
  }));
  console.log(`[display:build:parallel] ${ids.length}件 同時の最大${peak}（上限${parallel}） 全体${Math.round((Date.now() - start) / 1000)}秒`);
  return results.some((c) => c !== 0) ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  main().then((code) => process.exit(code), (e) => { console.error(`[display:build:parallel] ${e.message}`); process.exit(1); });
}
