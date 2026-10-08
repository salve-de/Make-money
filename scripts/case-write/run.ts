/**
 * 集めた記録から、画面の正本 data/case-pages/<事例ID>.md を自動で書く1本の流れ。
 *
 *   pnpm case:write --ids a,b                    （data/case-pages/<id>.md に書く。そのあと pnpm case-pages:build）
 *   pnpm case:write --ids a --out-dir docs/owner/trial --blind   （試し: 正本を上書きせず、見本からその事例の答えを隠す）
 *   オプション: --agent claude|codex|auto  --model <型>  --max-repairs N（既定2）  --concurrency N（既定2）
 *              --cache-dir <別の作業場所>（出典の本文の写しを探す場所。何度でも）  --no-fetch（写しが無い出典を取りに行かない）
 *
 * 段（1件ごと）:
 *   1. 書く: 事例まるごとを1回で（write-prompt.md ＋ 見本 Candy Japan ＋ オーナーとのやりとり ＋ 集めた事実と出典の本文）
 *   2. 読む: 別の呼び出しが、前提ゼロの読む人として見本と並べて読み、見劣りする所だけ直す（事実は足さない。read-prompt.md）
 *   3. 照らす: プログラムが、全章・です／ます・円概算・推定語・使えない出典・出典に無い数字と年・円の換算違いを見る（verify.ts）
 *      合わなければ、書く担当へ違反の一覧を返して直させ、もう一度照らす（上限 --max-repairs 回。超えたらその件は書き出さない）
 * 書き出した後の case-pages:build / check と公開は呼び出し側（case-run の display 段、または人）が行う。
 * 各件の時間・呼び出し回数・費用は <out-dir>/_case-write.jsonl（既定の出力先なら data/pipeline/case-write.jsonl）に残す。
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeCaller, mapPool, pickAgent, type Agent, type Caller } from '../reader-case/agent-call';
import { fetchOne } from '../reader-case/fetch-sources';
import { ownerContext } from '../reader-case/owner-context';
import { buildInput, renderInput, type CaseInput, type Fetcher } from './input';
import { verifyDraft, type WriteViolation } from './verify';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
export const EXAMPLE_FILE = 'docs/owner/MY_CANDY_JAPAN_2026-10-08.md';

export interface WriteOptions {
  root: string;
  /** 見本から隠す事例名（試し用） */
  hideNames?: string[];
  maxRepairs?: number;
  rights?: Record<string, { decision?: string }>;
  log?: (t: string) => void;
}
export interface WriteResult { id: string; ok: boolean; md: string; calls: number; seconds: number; costUsd: number; rounds: Array<{ step: string; violations: number }>; violations: WriteViolation[] }

/** AI の返事から markdown だけを取り出す（囲みや前置きが付いても、最初の「# 」の行から） */
export function extractMarkdown(text: string): string {
  const fenced = text.match(/```(?:markdown|md)?\s*\n([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const i = body.search(/^#\s/m);
  return `${(i >= 0 ? body.slice(i) : body).trim()}\n`;
}

function systemPrompt(root: string, file: string, hideNames: string[]): string {
  const base = readFileSync(join(HERE, file), 'utf8');
  const example = existsSync(join(root, EXAMPLE_FILE)) ? readFileSync(join(root, EXAMPLE_FILE), 'utf8') : '';
  return `${base}\n\n## 見本（オーナー承認済み。この形と同じくらい良い文にする）\n\n${example}${ownerContext(root, { hideNames })}`;
}

export const formatViolations = (v: WriteViolation[]) => v.map((x) => `- [${x.where}] ${x.detail}`).join('\n');

export async function writeCase(input: CaseInput, caller: Caller, opt: WriteOptions): Promise<WriteResult> {
  const hide = opt.hideNames ?? [];
  const writer = systemPrompt(opt.root, 'write-prompt.md', hide);
  const reader = systemPrompt(opt.root, 'read-prompt.md', hide);
  const material = renderInput(input);
  const started = Date.now();
  let calls = 0; let cost = 0;
  const ask = async (system: string, user: string, label: string) => {
    calls++;
    const r = await caller({ system, user, label: `${input.id} ${label}` });
    cost += r.costUsd ?? 0;
    return extractMarkdown(r.text);
  };
  const rounds: WriteResult['rounds'] = [];
  let md = await ask(writer, `${material}\n\n---\nこの事例の画面の文を、指示の形で事例まるごと書く。`, '書く');
  rounds.push({ step: '書く', violations: verifyDraft(md, input, opt.rights).length });
  md = await ask(reader, `## 読み直す事例の文\n\n${md}`, '読む');
  let v = verifyDraft(md, input, opt.rights);
  rounds.push({ step: '読む', violations: v.length });
  for (let i = 0; i < (opt.maxRepairs ?? 2) && v.length > 0; i++) {
    opt.log?.(`${input.id}: 照合で ${v.length} 件合わない。書く担当へ返す（${i + 1}回目）`);
    md = await ask(writer, `${material}\n\n---\n## 前に書いた事例の文\n\n${md}\n\n## プログラムの照合で合わなかった所（ここだけを直し、他の文は変えない。直せない数字は文ごと外すか「（推測）」の印を付ける）\n${formatViolations(v)}\n\n直した後の全体を、指示の形で返す。`, `直す${i + 1}`);
    v = verifyDraft(md, input, opt.rights);
    rounds.push({ step: `直す${i + 1}`, violations: v.length });
  }
  return { id: input.id, ok: v.length === 0, md, calls, seconds: Math.round((Date.now() - started) / 1000), costUsd: Number(cost.toFixed(3)), rounds, violations: v };
}

const arg = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const args = (name: string) => process.argv.flatMap((a, i) => (a === name ? [process.argv[i + 1]!] : []));

async function main() {
  const ids = (arg('--ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!ids.length) { console.error('使い方: pnpm case:write --ids a,b [--out-dir dir] [--blind]'); process.exit(2); }
  const outDir = resolve(ROOT, arg('--out-dir') ?? 'data/case-pages');
  const defaultOut = outDir === resolve(ROOT, 'data/case-pages');
  const blind = process.argv.includes('--blind');
  const agent = pickAgent((arg('--agent') as Agent | 'auto' | undefined) ?? 'auto', console.log);
  const caller = makeCaller(agent, { model: arg('--model') });
  const fetcher: Fetcher | undefined = process.argv.includes('--no-fetch') ? undefined : fetchOne;
  const rightsFile = join(ROOT, 'data/catalog-source-rights.json');
  const rights = existsSync(rightsFile) ? JSON.parse(readFileSync(rightsFile, 'utf8')) as Record<string, { decision?: string }> : {};
  const logFile = defaultOut ? join(ROOT, 'data/pipeline/case-write.jsonl') : join(outDir, '_case-write.jsonl');
  mkdirSync(outDir, { recursive: true }); mkdirSync(dirname(logFile), { recursive: true });
  const concurrency = Number(arg('--concurrency') ?? 2);
  const maxRepairs = Number(arg('--max-repairs') ?? 2);
  let failed = 0;
  await mapPool(ids, concurrency, async (id) => {
    try {
      const input = await buildInput(ROOT, id, { cacheDirs: args('--cache-dir'), fetcher });
      const r = await writeCase(input, caller, { root: ROOT, hideNames: blind ? [input.name] : [], maxRepairs, rights, log: (t) => console.log(`[case:write] ${t}`) });
      // 照合に通らなかった文は正本の場所に置かない（case-pages:build が拾わないように、別の場所へ）
      const rejectDir = defaultOut ? join(ROOT, 'data/pipeline/case-write-rejected') : outDir;
      mkdirSync(rejectDir, { recursive: true });
      const file = r.ok ? join(outDir, `${id}.md`) : join(rejectDir, `${id}.rejected.md`);
      writeFileSync(file, r.ok ? r.md : `${r.md}\n<!-- 照合に通らなかった所:\n${formatViolations(r.violations)}\n-->\n`);
      appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), agent, ...r, md: undefined, violations: r.violations.slice(0, 20) })}\n`);
      console.log(`[case:write] ${id}: ${r.ok ? '合格' : `不合格（${r.violations.length}件）`} ${r.seconds}秒 呼び出し${r.calls}回 $${r.costUsd} → ${file}`);
      if (!r.ok) failed++;
    } catch (e) {
      failed++;
      console.error(`[case:write] ${id}: 失敗 ${(e as Error).message.slice(0, 300)}`);
    }
  });
  if (failed) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) void main();
