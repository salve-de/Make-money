/**
 * 集めた記録から、画面の正本 data/case-pages/<事例ID>.md を自動で書く1本の流れ。
 *
 *   pnpm case:write --ids a,b                    （data/case-pages/<id>.md に書く。そのあと pnpm case-pages:build）
 *   pnpm case:write --ids a --out-dir docs/owner/trial --blind   （試し: 正本を上書きせず、見本からその事例の答えを隠す）
 *   オプション: --agent claude|codex|auto  --model <型>  --max-repairs N（既定2）  --concurrency N（既定2）
 *              --cache-dir <別の作業場所>（出典の本文の写しを探す場所。何度でも）  --no-fetch（写しが無い出典を取りに行かない）
 *              正本以外へ書く時（試し）は、取ってきた出典の本文を data/source-cache.trial に残す（本番の写し data/source-cache は証拠の照合が読むので増やさない）
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
export interface WriteResult { id: string; ok: boolean; md: string; /** 調べた側のメモ（画面に出さない） */ notes: string; calls: number; seconds: number; costUsd: number; rounds: Array<{ step: string; violations: number }>; violations: WriteViolation[] }

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

export const NOTES_HEAD = '調べた側のメモ';
/** 「## 調べた側のメモ」の章（画面に出さない）を本文から切り離す。メモは docs/owner/research-notes/<id>.md 側に残す */
export function splitNotes(md: string): { page: string; notes: string } {
  const m = md.match(new RegExp(`^##\\s+${NOTES_HEAD}\\s*$`, 'm'));
  if (!m || m.index === undefined) return { page: md, notes: '' };
  const rest = md.slice(m.index + m[0].length);
  const next = rest.search(/^##\s/m);
  const notes = (next >= 0 ? rest.slice(0, next) : rest).trim();
  const page = `${md.slice(0, m.index).trimEnd()}\n${next >= 0 ? `\n${rest.slice(next)}` : ''}`;
  return { page: page.endsWith('\n') ? page : `${page}\n`, notes: /^なし。?$/.test(notes) ? '' : notes };
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
  const notesParts: string[] = [];
  const keepNotes = (text: string) => { const x = splitNotes(text); if (x.notes) notesParts.push(x.notes); return x.page; };
  let md = keepNotes(await ask(writer, `${material}\n\n---\nこの事例の画面の文を、指示の形で事例まるごと書く。`, '書く'));
  rounds.push({ step: '書く', violations: verifyDraft(md, input, opt.rights).length });
  md = keepNotes(await ask(reader, `## 読み直す事例の文\n\n${md}`, '読む'));
  let v = verifyDraft(md, input, opt.rights);
  rounds.push({ step: '読む', violations: v.length });
  for (let i = 0; i < (opt.maxRepairs ?? 2) && v.length > 0; i++) {
    opt.log?.(`${input.id}: 照合で ${v.length} 件合わない。書く担当へ返す（${i + 1}回目）`);
    md = keepNotes(await ask(writer, `${material}\n\n---\n## 前に書いた事例の文\n\n${md}\n\n## プログラムの照合で合わなかった所（ここだけを直し、他の文は変えない。直せない数字は文ごと外すか「（推測）」の印を付ける）\n${formatViolations(v)}\n\n直した後の全体を、指示の形で返す。`, `直す${i + 1}`));
    v = verifyDraft(md, input, opt.rights);
    rounds.push({ step: `直す${i + 1}`, violations: v.length });
  }
  return { id: input.id, ok: v.length === 0, md, notes: [...new Set(notesParts)].join('\n\n'), calls, seconds: Math.round((Date.now() - started) / 1000), costUsd: Number(cost.toFixed(3)), rounds, violations: v };
}

/**
 * 試し（--blind）で見本から隠す語: 事例名と、正本がある時はその一覧の1行・概要の各段落の書き出し（名前なしで引用された答えも隠す）。
 * 正本は隠す語を作るためだけに読み、書く担当には渡さない。
 */
export function blindKeys(root: string, id: string, name: string): string[] {
  const file = join(root, 'data/case-pages', `${id}.md`);
  if (!existsSync(file)) return [name];
  const md = readFileSync(file, 'utf8');
  const chapter = (head: string) => (md.split(new RegExp(`^##\\s+(?:\\d+[.．]\\s*)?${head}\\s*$`, 'm'))[1] ?? '').split(/^##\s/m)[0];
  const lead = chapter('一覧の1行').trim();
  const heads = [lead, ...chapter('概要').split(/\n\s*\n/)].map((t) => t.trim().slice(0, 10)).filter((t) => t.length >= 6);
  // 1行の金額（「2.2億円」「2,018万円」）。見本 Candy Japan にも出る額は隠さない（見本まで消さない）
  const example = existsSync(join(root, EXAMPLE_FILE)) ? readFileSync(join(root, EXAMPLE_FILE), 'utf8') : '';
  // 見本の紙で名前つきで載っている1行（正本と版が違うことがある）も、書き出しと金額を隠す
  const sheet = join(root, 'docs/owner/LEAD_LINE_SHEET.md');
  const sheetLines = existsSync(sheet) ? readFileSync(sheet, 'utf8').split('\n').filter((l) => l.includes(name)).map((l) => l.replace(/^\s*(?:\d+\.|-)\s*/, '').replace(/（[^）]*）\s*$/, '')) : [];
  const amounts = [lead, ...sheetLines].flatMap((t) => t.match(/[\d.,]+[万億]円/g) ?? []).filter((a) => !example.includes(a));
  const sheetHeads = sheetLines.map((t) => t.trim().slice(0, 10)).filter((t) => t.length >= 6 && !t.includes(name));
  return [...new Set([name, ...heads, ...sheetHeads, ...amounts])];
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
      const input = await buildInput(ROOT, id, { cacheDirs: args('--cache-dir'), fetcher, writeCacheDir: defaultOut ? undefined : 'data/source-cache.trial' });
      const r = await writeCase(input, caller, { root: ROOT, hideNames: blind ? blindKeys(ROOT, id, input.name) : [], maxRepairs, rights, log: (t) => console.log(`[case:write] ${t}`) });
      // 照合に通らなかった文は正本の場所に置かない（case-pages:build が拾わないように、別の場所へ）
      const rejectDir = defaultOut ? join(ROOT, 'data/pipeline/case-write-rejected') : outDir;
      mkdirSync(rejectDir, { recursive: true });
      const file = r.ok ? join(outDir, `${id}.md`) : join(rejectDir, `${id}.rejected.md`);
      writeFileSync(file, r.ok ? r.md : `${r.md}\n<!-- 照合に通らなかった所:\n${formatViolations(r.violations)}\n-->\n`);
      // 調べた側のメモは画面の正本に入れず、別の記録に残す（既定: docs/owner/research-notes/<id>.md、試し: <out-dir>/research-notes/<id>.md）
      const notesDir = defaultOut ? join(ROOT, 'docs/owner/research-notes') : join(outDir, 'research-notes');
      mkdirSync(notesDir, { recursive: true });
      writeFileSync(join(notesDir, `${id}.md`), `# ${input.name}：調べた側のメモ（画面に出さない）\n\n${r.notes || 'なし'}\n\n## 照合の記録\n${r.rounds.map((x) => `- ${x.step}：合わない所 ${x.violations}件`).join('\n')}\n`);
      appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), agent, ...r, md: undefined, notes: undefined, violations: r.violations.slice(0, 20) })}\n`);
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
