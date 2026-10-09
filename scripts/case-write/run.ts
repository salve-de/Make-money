/**
 * 集めた記録から、画面の正本 data/case-pages/<事例ID>.md を自動で書く1本の流れ。
 *
 *   pnpm case:write --ids a,b                    （data/case-pages/<id>.md に書く。そのあと pnpm case-pages:build）
 *   pnpm case:write --ids a --out-dir docs/owner/trial --blind   （試し: 正本を上書きせず、見本からその事例の答えを隠す）
 *   オプション: --agent claude|codex|auto  --model <書く段の型>（claude の既定 opus）
 *              --cheap-agent codex|claude（事実を照らす段と照合の直し。既定 codex）  --cheap-model <型>（claude なら既定 haiku）
 *              --read-agent claude|codex（読む段。既定 claude。環境変数 CASE_AGENT_LOCK=codex の間は codex）  --read-model <型>（claude なら既定 haiku）  --codex-effort <深さ>  --read-effort <読む段だけの深さ>
 *              --max-repairs N（既定1）  --concurrency N（既定2）
 *              --cache-dir <別の作業場所>（出典の本文の写しを探す場所。何度でも）  --no-fetch（写しが無い出典を取りに行かない）
 *              正本以外へ書く時（試し）は、取ってきた出典の本文を data/source-cache.trial に残す（本番の写し data/source-cache は証拠の照合が読むので増やさない）
 *
 * 段（1件ごと。claude 側の費用は1件0.4〜0.6ドル（書く段の opus がほぼ全部）。貼る資料は段ごとに変えるが、OWNER_RULES は全段）:
 *   1. 書く（良いAI。既定 claude の opus）: 事例まるごとと一覧の1行の候補6つを出し、同じ呼び出しの中で見本と照らして1行を決める（write-prompt.md ＋ 見本 Candy Japan ＋ STEP_FILES ＋ 集めた事実と出典の本文）
 *   2. 事実を照らす（安いAI。既定 codex）: 文は返さず、出典に無い事実の一覧と、使えない1行の候補の番号だけを返す（fact-prompt.md。見本は付けない）
 *      決めた1行が使えないとされた時だけ、使える候補の先頭に替える
 *   3. 読む（安いAI。既定 claude の haiku）: 前提ゼロの読む人として読み直し、2の一覧の事実を外す。1行には触らない（read-prompt.md ＋ 見本 ＋ READ_FILES）
 *   4. 照らす: プログラムが、全章・です／ます・円概算・推定語・使えない出典・出典に無い数字と年・円の換算違いを見る（verify.ts）
 *      合わなければ、安いAI（既定 codex）へ（1行から稼ぎの数字が抜けた時だけ書く段へ）違反の一覧を返して直させ、もう一度照らす（上限 --max-repairs 回。超えたらその件は書き出さない）
 * 書き出した後の case-pages:build / check と公開は呼び出し側（case-run の display 段、または人）が行う。
 * 各件の時間・呼び出し回数・費用は <out-dir>/_case-write.jsonl（既定の出力先なら data/pipeline/case-write.jsonl）に残す。
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { codexLocked, makeCaller, mapPool, pickAgent, type Agent, type Caller } from '../reader-case/agent-call';
import { dropUnusedCurrencyNotes } from '../case-pages/lib';
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
  /** 事実を照らす・照合の直しに使う安いAI（無ければ caller と同じ） */
  cheap?: Caller;
  /** 読む段のAI（無ければ cheap と同じ）。codex では文が訳文調になったので、既定は claude の haiku */
  readerCaller?: Caller;
  rights?: Record<string, { decision?: string }>;
  log?: (t: string) => void;
}
export interface WriteResult { id: string; ok: boolean; md: string; /** 一覧の1行の候補と選んだ1行 */ leadPick?: { candidates: string; chosen: string }; /** 調べた側のメモ（画面に出さない） */ notes: string; calls: number; seconds: number; costUsd: number; /** 呼び出しごとの費用と量 */ steps: Array<{ step: string; costUsd: number; inputTokens?: number; outputTokens?: number }>; rounds: Array<{ step: string; violations: number }>; violations: WriteViolation[] }

/** AI の返事から markdown だけを取り出す（囲みや前置きが付いても、最初の「# 」の行から） */
export function extractMarkdown(text: string): string {
  const fenced = text.match(/```(?:markdown|md)?\s*\n([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const i = body.search(/^#\s/m);
  return `${(i >= 0 ? body.slice(i) : body).trim()}\n`;
}

/** 書く段と読む段に貼るオーナーの資料（根っこ・1行の見本・概要の見本）。長いやりとりの記録は貼らない */
export const STYLE_FILES = ['.claude/skills/natural-japanese/SKILL.md', 'docs/CASE_TEXT_STANDARD.md'] as const;
export const STEP_FILES = ['docs/owner/READER_EYE.md', 'docs/owner/LEAD_LINE_SHEET.md', 'docs/owner/OVERVIEW_SHEET.md', ...STYLE_FILES] as const;
/** 読む段に貼る資料（1行に触らないので、1行の見本の紙は貼らない） */
// 画面の部品の決定（DECIDED_UI）は文を書く・読む段には要らないので渡さない（2026-10-09 判断）
export const READ_FILES = ['docs/owner/READER_EYE.md', 'docs/owner/OVERVIEW_SHEET.md', ...STYLE_FILES] as const;

function systemPrompt(root: string, file: string, hideNames: string[], files: readonly string[]): string {
  const base = readFileSync(join(HERE, file), 'utf8');
  const example = existsSync(join(root, EXAMPLE_FILE)) ? readFileSync(join(root, EXAMPLE_FILE), 'utf8') : '';
  return `${base}\n\n## 見本（オーナー承認済み。この形と同じくらい良い文にする）\n\n${example}${ownerContext(root, { hideNames, files })}`;
}

export const NOTES_HEAD = '調べた側のメモ';
export const CANDIDATES_HEAD = '一覧の1行の候補';

/** 「## 見出し」の章を本文から切り離す（画面に出さない章: 調べた側のメモ・一覧の1行の候補） */
export function splitSection(md: string, head: string): { page: string; body: string } {
  const m = md.match(new RegExp(`^##\\s+${head}\\s*$`, 'm'));
  if (!m || m.index === undefined) return { page: md, body: '' };
  const rest = md.slice(m.index + m[0].length);
  const next = rest.search(/^##\s/m);
  const body = (next >= 0 ? rest.slice(0, next) : rest).trim();
  const page = `${md.slice(0, m.index).trimEnd()}\n${next >= 0 ? `\n${rest.slice(next)}` : ''}`;
  return { page: page.endsWith('\n') ? page : `${page}\n`, body };
}

/** 「## 調べた側のメモ」の章（画面に出さない）を本文から切り離す。メモは docs/owner/research-notes/<id>.md 側に残す */
export function splitNotes(md: string): { page: string; notes: string } {
  const { page, body } = splitSection(md, NOTES_HEAD);
  return { page, notes: /^なし。?$/.test(body) ? '' : body };
}

/** 一覧の1行の章を差し替える */
export function replaceLead(md: string, lead: string): string {
  return md.replace(/(^##\s+一覧の1行\s*\n)([\s\S]*?)(?=^##\s)/m, `$1${lead.trim()}\n\n`);
}

/** 選ぶ担当の返事から1行だけを取り出す（前置き・引用符・番号を外す） */
export function extractLine(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && !l.startsWith('```'));
  const last = lines.at(-1) ?? '';
  return last.replace(/^(?:[-・*]|\d+[.．)])\s*/, '').replace(/^[「『"]|[」』"]$/g, '').trim();
}

export const formatViolations = (v: WriteViolation[]) => v.map((x) => `- [${x.where}] ${x.detail}`).join('\n');

/** 「数字と出典」の番号を1から詰め直す（外した出典の欠番が画面に残らないように）。本文は番号で出典を指さない */
export function renumberSources(md: string): string {
  const head = md.match(/^##\s+数字と出典\s*$/m);
  if (!head || head.index === undefined) return md;
  const start = head.index + head[0].length;
  const rest = md.slice(start);
  const next = rest.search(/^##\s/m);
  const body = next >= 0 ? rest.slice(0, next) : rest;
  let n = 0;
  return md.slice(0, start) + body.replace(/^\d+\.(\s)/gm, (_m, sp: string) => `${++n}.${sp}`) + (next >= 0 ? rest.slice(next) : '');
}

/** 機械で直せる所: 出典の番号を1から詰め直し、本文で使っていない通貨の断りを外す */
export const tidy = (md: string) => renumberSources(dropUnusedCurrencyNotes(md));

/** 一覧の1行の章の中身 */
export const leadOf = (md: string) => splitSection(md, '一覧の1行').body.split('\n')[0]?.trim() ?? '';

/** 事実を照らす段の返事から、出典に無い事実の一覧と、使えない1行の候補の番号を取り出す */
export function parseFactReport(text: string): { missing: string; inferences: string[]; badCandidates: number[] } {
  const missing = splitSection(text, '出典に無い事実').body;
  const inf = splitSection(text, '出典に無い見立て').body;
  const bad = splitSection(text, '使えない1行の候補').body;
  const inferences = /^なし/.test(inf.trim()) ? [] : inf.split('\n').map((l) => l.match(/「([^」]{4,})」/)?.[1]).filter((x): x is string => Boolean(x));
  return { missing: /^なし。?$/.test(missing.trim()) ? '' : missing.trim(), inferences, badCandidates: /^なし/.test(bad.trim()) ? [] : (bad.match(/\d+/g) ?? []).map(Number) };
}

/**
 * 出典に無い見立てを、消さずに文の最後へ「（推測）」を付ける（「…できる（推測）。」の形）。
 * 一覧の1行・概要・数字と出典の中の見立ては印を付けて置けない（1行と概要に推測は持ち込まない）ので、置けなかった言い回しとして返す
 */
export function markInferences(md: string, quotes: string[]): { md: string; unplaced: string[] } {
  const unplaced: string[] = [];
  let out = md;
  for (const q of quotes) {
    const at = out.indexOf(q);
    if (at < 0) { unplaced.push(q); continue; }
    const before = out.slice(0, at);
    const head = before.lastIndexOf('\n## ');
    const chapter = head >= 0 ? out.slice(head + 4, out.indexOf('\n', head + 4)).trim() : '';
    if (/^(一覧の1行|概要|数字と出典)$/.test(chapter)) { unplaced.push(q); continue; }
    // 数字・金額・年月の文は印を付けない（印は見立てだけ）。数字の真偽は照合（verifyDraft）が見る
    const numEnd = out.indexOf('。', at + q.length);
    if (/[0-9０-９]/.test(out.slice(Math.max(before.lastIndexOf('。') + 1, before.lastIndexOf('\n') + 1), numEnd < 0 ? out.length : numEnd))) continue;
    const end = out.indexOf('。', at + q.length);
    const lineEnd = out.indexOf('\n', at);
    const stop = end >= 0 && (lineEnd < 0 || end < lineEnd) ? end : (lineEnd < 0 ? out.length : lineEnd);
    const sentStart = Math.max(before.lastIndexOf('。') + 1, before.lastIndexOf('\n') + 1);
    if (/[（(](?:推測|推定)[）)]/.test(out.slice(sentStart, stop + 1))) continue;
    out = out.slice(0, stop) + '（推測）' + out.slice(stop);
  }
  return { md: out, unplaced };
}

/** 候補の章（「- 」の行）を配列に */
export const candidateLines = (body: string) => body.split('\n').map((l) => l.trim()).filter((l) => /^(?:[-・*]|\d+[.．)])\s*\S/.test(l)).map((l) => l.replace(/^(?:[-・*]|\d+[.．)])\s*/, ''));

export async function writeCase(input: CaseInput, caller: Caller, opt: WriteOptions): Promise<WriteResult> {
  const hide = opt.hideNames ?? [];
  // 段ごとに貼る資料を変えるが、オーナーの指示の1枚 OWNER_RULES はどの段にも渡す。長い記録 OWNER_DIALOGUE_LOG は渡さない
  const writer = systemPrompt(opt.root, 'write-prompt.md', hide, STEP_FILES);
  // 読む段は1行に触らないので、1行の見本の紙は渡さない
  const reader = systemPrompt(opt.root, 'read-prompt.md', hide, READ_FILES);
  // 照合の差し戻しは数字・円の直しだけなので、1行・概要の見本の紙は付けない（文の書き方の2枚と指示の1枚は付ける）
  const repairer = systemPrompt(opt.root, 'write-prompt.md', hide, STYLE_FILES);
  // 事実を照らす段は文の良し悪しを見ないので、見本とオーナー資料は付けない
  // （オーナーの指示の1枚 OWNER_RULES だけは全段に渡す。ownerContext が files に関わらず付ける）
  const factChecker = readFileSync(join(HERE, 'fact-prompt.md'), 'utf8') + ownerContext(opt.root, { hideNames: hide, files: [] });
  const cheap = opt.cheap ?? caller;
  const material = renderInput(input);
  const started = Date.now();
  let cost = 0;
  const steps: WriteResult['steps'] = [];
  const askRaw = async (who: Caller, system: string, user: string, label: string) => {
    const r = await who({ system, user, label: `${input.id} ${label}` });
    cost += r.costUsd ?? 0;
    steps.push({ step: label, costUsd: Number((r.costUsd ?? 0).toFixed(4)), inputTokens: r.tokens?.input, outputTokens: r.tokens?.output });
    return r.text;
  };
  const ask = async (who: Caller, system: string, user: string, label: string) => extractMarkdown(await askRaw(who, system, user, label));
  const rounds: WriteResult['rounds'] = [];
  const notesParts: string[] = [];
  const keepNotes = (text: string) => { const x = splitNotes(text); if (x.notes) notesParts.push(x.notes); return x.page; };
  // 1. 書く（良いAI）: 本文と一覧の1行の候補6つを出し、同じ呼び出しの中で見本と照らして1行を決める
  const written = keepNotes(await ask(caller, writer, `${material}\n\n---\nこの事例の画面の文を、指示の形で事例まるごと書く。`, '書く'));
  const cut = splitSection(written, CANDIDATES_HEAD);
  let md = cut.page;
  rounds.push({ step: '書く', violations: verifyDraft(md, input, opt.rights).length });
  const candidates = candidateLines(cut.body);
  // 2. 事実を照らす（安いAI）: 文は返させず、出典に無い事実の一覧と、使えない候補の番号だけを返させる
  const report = parseFactReport(await askRaw(cheap, factChecker, `${material}\n\n---\n## 照らす事例の文\n\n${md}\n\n## 一覧の1行の候補\n${candidates.map((c, i) => `${i + 1}. ${c}`).join('\n') || 'なし'}`, '事実を照らす'));
  // 出典に無い見立ては消さず「（推測）」を付ける。印を置けない所（1行・概要）の見立ては事実と同じく外す
  const marked = markInferences(md, report.inferences);
  md = marked.md;
  if (report.inferences.length > marked.unplaced.length) notesParts.push(`- 出典に無い見立てに（推測）を付けた：${report.inferences.filter((q) => !marked.unplaced.includes(q)).join(' / ')}`);
  report.missing = [report.missing, ...marked.unplaced.map((q) => `- 「${q}」：出典に無い見立て（1行・概要には置けない）`)].filter(Boolean).join('\n');
  if (report.missing) notesParts.push(`- 出典で確かめられず外した（事実を照らす段の一覧）：\n${report.missing}`);
  // 1行は書く段が決めた物。照らす段が使えないとした時だけ、使える候補の先頭に替える
  let lead = leadOf(md);
  const bad = new Set(report.badCandidates.map((n) => candidates[n - 1]).filter(Boolean));
  if (bad.has(lead) || (report.missing && report.missing.split('\n').some((l) => { const q = l.match(/「([^」]{4,})」/)?.[1]; return q && lead.includes(q); }))) {
    const next = candidates.find((c) => !bad.has(c) && c !== lead);
    if (next) { notesParts.push(`- 一覧の1行を替えた：「${lead}」は出典に無い事実を含むため、候補「${next}」にした`); lead = next; md = replaceLead(md, lead); }
  }
  // 3. 読む（安いAI）: 前提ゼロの読む人として読み直し、出典に無い事実を外す。1行には触らせない
  md = splitSection(keepNotes(await ask(opt.readerCaller ?? cheap, reader, `## 読み直す事例の文\n\n${md}\n\n## 出典に無い事実（本文から外す）\n${report.missing || 'なし'}`, '読む')), CANDIDATES_HEAD).page;
  md = tidy(replaceLead(md, lead));
  const leadPick = candidates.length ? { candidates: candidates.map((c) => `- ${c}`).join('\n'), chosen: lead } : undefined;
  let v = verifyDraft(md, input, opt.rights);
  rounds.push({ step: '読む', violations: v.length });
  // 4. 照合に合わなければ差し戻す（安いAI、既定1回まで）
  for (let i = 0; i < (opt.maxRepairs ?? 1) && v.length > 0; i++) {
    opt.log?.(`${input.id}: 照合で ${v.length} 件合わない。直しに返す（${i + 1}回目）`);
    // 1行から稼ぎの数字が抜けた時は、1行を決めた書く段へ返す（安い直し役に1行を書かせない）
    const toWriter = v.some((x) => x.rule === 'lead-no-amount' || x.rule === 'timeline-thin');
    md = splitSection(keepNotes(await ask(toWriter ? caller : cheap, toWriter ? writer : repairer, `${material}\n\n---\n## 前に書いた事例の文\n\n${md}\n\n## プログラムの照合で合わなかった所（ここだけを直し、他の文は1文字も変えない。直せない数字は文ごと外すか「（推測）」の印を付ける）\n${formatViolations(v)}\n\n直した後の全体を、指示の形で返す（一覧の1行の候補の章は要らない）。`, `直す${i + 1}`)), CANDIDATES_HEAD).page;
    md = tidy(md);
    v = verifyDraft(md, input, opt.rights);
    rounds.push({ step: `直す${i + 1}`, violations: v.length });
  }
  md = tidy(md);
  return { id: input.id, ok: v.length === 0, md, leadPick, notes: [...new Set(notesParts)].join('\n\n'), calls: steps.length, seconds: Math.round((Date.now() - started) / 1000), costUsd: Number(cost.toFixed(3)), steps, rounds, violations: v };
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
  // 費用: 書く1回だけを良いAI、残りは安いAIにする。claude は1回限りの呼び出しなので指示の写しを残さない
  // 書く段は質を優先して opus（2026-10-09 に sonnet・codex・opus を比べて決めた。費用は契約の使用量）
  const caller = makeCaller(agent, { model: arg('--model') ?? (agent === 'claude' ? 'opus' : undefined), codexEffort: arg('--codex-effort'), noCache: true, plainText: true });
  // 事実を照らす段と照合の直しは、既定で codex（ChatGPT の契約の範囲で動き、claude の費用がかからない）
  const cheapAgent = (arg('--cheap-agent') as Agent | undefined) ?? 'codex';
  const cheap = makeCaller(cheapAgent, { model: arg('--cheap-model') ?? (cheapAgent === 'claude' ? 'haiku' : undefined), codexEffort: arg('--codex-effort'), noCache: true, plainText: true });
  // 読む段は、codex だと文が訳文調になった（2026-10-09 の試し）ので、既定は claude の haiku
  // Codex だけで動かす時（環境変数 CASE_AGENT_LOCK=codex。pnpm case:new）は、読む段も codex
  const readAgent = (arg('--read-agent') as Agent | undefined) ?? (codexLocked() ? 'codex' : 'claude');
  const readerCaller = makeCaller(readAgent, { model: arg('--read-model') ?? (readAgent === 'claude' ? 'haiku' : undefined), codexEffort: arg('--read-effort') ?? arg('--codex-effort'), noCache: true, plainText: true });
  const fetcher: Fetcher | undefined = process.argv.includes('--no-fetch') ? undefined : fetchOne;
  const rightsFile = join(ROOT, 'data/catalog-source-rights.json');
  const rights = existsSync(rightsFile) ? JSON.parse(readFileSync(rightsFile, 'utf8')) as Record<string, { decision?: string }> : {};
  const logFile = defaultOut ? join(ROOT, 'data/pipeline/case-write.jsonl') : join(outDir, '_case-write.jsonl');
  mkdirSync(outDir, { recursive: true }); mkdirSync(dirname(logFile), { recursive: true });
  const concurrency = Number(arg('--concurrency') ?? 2);
  const maxRepairs = Number(arg('--max-repairs') ?? 1);
  let failed = 0;
  await mapPool(ids, concurrency, async (id) => {
    try {
      const input = await buildInput(ROOT, id, { cacheDirs: args('--cache-dir'), fetcher, writeCacheDir: defaultOut ? undefined : 'data/source-cache.trial' });
      const r = await writeCase(input, caller, { root: ROOT, hideNames: blind ? blindKeys(ROOT, id, input.name) : [], maxRepairs, cheap, readerCaller, rights, log: (t) => console.log(`[case:write] ${t}`) });
      // 照合に通らなかった文は正本の場所に置かない（case-pages:build が拾わないように、別の場所へ）
      const rejectDir = defaultOut ? join(ROOT, 'data/pipeline/case-write-rejected') : outDir;
      mkdirSync(rejectDir, { recursive: true });
      const file = r.ok ? join(outDir, `${id}.md`) : join(rejectDir, `${id}.rejected.md`);
      writeFileSync(file, r.ok ? r.md : `${r.md}\n<!-- 照合に通らなかった所:\n${formatViolations(r.violations)}\n-->\n`);
      // 調べた側のメモは画面の正本に入れず、別の記録に残す（既定: docs/owner/research-notes/<id>.md、試し: <out-dir>/research-notes/<id>.md）
      const notesDir = defaultOut ? join(ROOT, 'docs/owner/research-notes') : join(outDir, 'research-notes');
      mkdirSync(notesDir, { recursive: true });
      writeFileSync(join(notesDir, `${id}.md`), `# ${input.name}：調べた側のメモ（画面に出さない）\n\n${r.notes || 'なし'}\n\n## 一覧の1行の候補と選んだ1行\n${r.leadPick ? `${r.leadPick.candidates}\n\n選んだ1行：${r.leadPick.chosen}` : 'なし'}\n\n## 照合の記録\n${r.rounds.map((x) => `- ${x.step}：合わない所 ${x.violations}件`).join('\n')}\n\n## 呼び出しごとの費用\n${r.steps.map((x) => `- ${x.step}：$${x.costUsd}（入力 ${x.inputTokens ?? '?'}・出力 ${x.outputTokens ?? '?'}）`).join('\n')}\n`);
      appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), agent, cheapAgent, readAgent, ...r, md: undefined, notes: undefined, leadPick: r.leadPick?.chosen, violations: r.violations.slice(0, 20) })}\n`);
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
