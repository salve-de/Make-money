/**
 * 使い方: node --import tsx scripts/reader-case/runner/cli.ts <step|status|accept|plan|release> <analyze|audit|verify> [--prefix X] [--force] [--dry-run] [--max-attempts N] [--json]
 *   step    届いた結果を受理 → 未処理の指示書を書く → 要約。終了コード 0=全部受理済み / 75=サブエージェント待ち / 76=保留のみ残る
 *   status  書き込みなしで状態だけ表示（終了コードは step と同じ）
 *   accept  inbox の結果を検査して受理/拒否するだけ
 *   plan    未処理の束の指示書だけ書く
 *   release 保留を解除（試行回数を 0 に戻す）
 */
import { resolve } from 'node:path';
import { STAGES, acceptInbox, inspect, releaseHold, step, writeInstructions, type BundleInfo, type RunnerOptions } from './runner';
import type { StageName } from './validate';

const [cmd, stageArg, ...rest] = process.argv.slice(2);
const flag = (n: string): boolean => rest.includes(n);
const val = (n: string): string | undefined => {
  const i = rest.indexOf(n);
  return i >= 0 ? rest[i + 1] : undefined;
};

if (!cmd || !stageArg || !(stageArg in STAGES)) {
  console.error('使い方: cli.ts <step|status|accept|plan|release> <analyze|audit|verify> [--prefix X] [--force] [--dry-run] [--max-attempts N] [--json]');
  process.exit(2);
}
const o: RunnerOptions = {
  root: resolve(process.env.RUNNER_ROOT ?? process.cwd()),
  stage: stageArg as StageName,
  prefix: val('--prefix'),
  force: flag('--force'),
  dryRun: flag('--dry-run'),
  maxAttempts: val('--max-attempts') ? Number(val('--max-attempts')) : undefined,
};
const label = STAGES[o.stage].label;
const rel = (p: string): string => p.replace(`${o.root}/`, '');
const line = (b: BundleInfo): string => `  - ${b.name}（${b.status}、試行 ${b.attempts} 回）→ 指示書 ${rel(b.instructionPath)} / 結果の書き先 ${rel(b.inboxPath)}`;

function report(s: { done: number; waiting: BundleInfo[]; held: BundleInfo[]; accepted?: string[]; rejected?: { name: string; reasons: { code: string; message: string }[]; held: boolean }[]; exitCode: number }): void {
  if (flag('--json')) {
    console.log(JSON.stringify(s, null, 1));
    return;
  }
  for (const n of s.accepted ?? []) console.log(`受理 ${label} ${n}`);
  for (const r of s.rejected ?? []) {
    console.log(`拒否 ${label} ${r.name}${r.held ? '（試行上限。保留にした）' : '（再試行）'}`);
    for (const x of r.reasons) console.log(`    [${x.code}] ${x.message}`);
  }
  console.log(`${label}: 受理済み ${s.done} 束／待ち ${s.waiting.length} 束／保留 ${s.held.length} 束`);
  if (s.waiting.length) {
    console.log(`サブエージェント待ち。オーケストレーターが各指示書を Agent ツールで実行し、結果を書き先に置いたあと、同じ命令をもう一度実行する:`);
    for (const b of s.waiting) console.log(line(b));
  }
  if (s.held.length) {
    console.log('保留（試行上限。人の判断が要る。理由は data/runner/state/ の該当ファイル。解除は release）:');
    for (const b of s.held) console.log(`  - ${b.name}: ${b.lastRejections.map((x) => `[${x.code}] ${x.message}`).slice(0, 3).join(' / ')}`);
  }
}

if (cmd === 'step') {
  const s = step(o);
  report(s);
  process.exit(s.exitCode);
} else if (cmd === 'status') {
  const all = inspect(o);
  const waiting = all.filter((b) => b.status === 'WAITING' || b.status === 'READY_TO_ACCEPT');
  const held = all.filter((b) => b.status === 'HOLD');
  const exitCode = waiting.length ? 75 : held.length ? 76 : 0;
  report({ done: all.filter((b) => b.status === 'DONE').length, waiting, held, exitCode });
  process.exit(exitCode);
} else if (cmd === 'accept') {
  const a = acceptInbox(o);
  report({ done: 0, waiting: [], held: [], accepted: a.accepted, rejected: a.rejected, exitCode: 0 });
} else if (cmd === 'plan') {
  const w = writeInstructions(o);
  report({ done: 0, waiting: w, held: [], exitCode: w.length ? 75 : 0 });
} else if (cmd === 'release') {
  console.log(`保留を ${releaseHold(o)} 束解除`);
} else {
  console.error(`不明な命令: ${cmd}`);
  process.exit(2);
}
