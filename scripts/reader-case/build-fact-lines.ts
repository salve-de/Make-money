/**
 * 画面の層の「事実の記録の文」を読む人向けに言い直す段（data/fact-lines.json）と、札の補いを作る。
 * 集める層（事実・出典・数値の注記・計算の前提）には触らない。画面は data/fact-lines.json を優先して出し、無い・元の文が変わった時は元の文のまま出す。
 *
 *   pnpm fact-lines:build --id <entityId>   1件だけ
 *   pnpm fact-lines:build --ids a,b,c       複数件（case:run の fact-lines 段が使う）
 *   pnpm fact-lines:build --all             仕上げ済み（data/catalog-finished-ids.txt）の全件
 *   pnpm fact-lines:build --list            AIを呼ばず、対象の欄を事例ごとに数えて出す
 *   pnpm fact-lines:build --dry-run         作って検査するが、書かない
 *        --only-missing                      data/fact-lines.json に1行も無い事例だけ
 *        --concurrency N（既定4）  --attempts N（既定3）  --no-review（別のAIの確認を省く）
 *        --agent claude|codex  --model <名前>（作る側。既定: claude なら sonnet）  --review-agent / --review-model
 *
 * 流れ（1件ごと）: 画面に記録の文をそのまま出している欄を洗い出す（fact-lines-lib.ts の collectTargets）→ AIが言い直す
 *   → 機械の照合（元に無い数字・年・名前、円を書いていないか、字数、式の骨格、自然さ・意味・禁止語の辞書）→ 別のAIが元の文と突き合わせる
 *   → 通った行だけ保存。通らない行は理由を返して直させる（上限 --attempts）。それでも通らない行は保存せず、画面は元の文を出す。
 * 規則: .claude/skills/natural-japanese/SKILL.md と docs/CASE_TEXT_STANDARD.md。円は書かせず、画面でコードが付ける（src/shared/display-text.ts の screenText）。
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeHit, findNoise, findUnnatural, loadNaturalRules } from '../architecture/natural-japanese.mjs';
import { describeUnclear, findUnclear, loadClarityRules } from '../architecture/reader-clarity.mjs';
import { textFingerprint } from '../../src/shared/text-fingerprint';
import type { ReaderCase } from '../../src/shared/reader-case';
import { makeCaller, pickAgent, type Agent, type Caller } from './agent-call';
import { loadReaders, argValue } from './load-readers';
import { preparePublicationReader } from './publication-evaluation';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';
import { withReflectedAnalysis, readReflectState } from './case-reflect';
import type { AnalysisFile } from './analysis-lib';
import { checkLabels, checkLine, collectTargets, entryFor, replaceEntity, type FactLineEntry, type FactTarget } from './fact-lines-lib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(ROOT);
const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const has = (flag: string) => process.argv.includes(flag);
const OUT = join(ROOT, 'data/fact-lines.json');
const FAILURES = join(ROOT, 'data/pipeline/fact-lines-failures.jsonl');
const ATTEMPTS = Number(argValue('--attempts') ?? 3);
const CONCURRENCY = Number(argValue('--concurrency') ?? 4);
const DRY = has('--dry-run');
const REVIEW = !has('--no-review');
const say = (t: string) => console.log(`[fact-lines] ${t}`);

const OPERATOR_TAGS = new Set(['収集事例', '新着', '未精査候補', '収益確認済']);
const ABSENCE = /(未確認|書かれていない|公開されていない|記載(が)?(ない|なし)|確認できない|わからない|分からない|不明|非公開(?![版のなでに]))/;
const HEDGE = /(と語る|と話す|と説明している|と書く|と述べる|と記す)/;
const language = read<Array<{ pattern: string; suggest: string }>>(join(ROOT, 'data/reader-language.json')).map((r) => ({ re: new RegExp(r.pattern), suggest: r.suggest }));
const naturalRules = loadNaturalRules(join(ROOT, 'data/natural-japanese.json'));
const clarityRules = loadClarityRules(join(ROOT, 'data/reader-clarity.json'));
const SKILL = readFileSync(join(ROOT, '.claude/skills/natural-japanese/SKILL.md'), 'utf8').replace(/^---[\s\S]*?---\n/, '');
const GEN_PROMPT = `${readFileSync(join(ROOT, 'scripts/reader-case/fact-lines-prompt.md'), 'utf8')}\n${SKILL}`;
const REVIEW_PROMPT = readFileSync(join(ROOT, 'scripts/reader-case/fact-lines-review-prompt.md'), 'utf8');

/** 文の機械の検査（辞書・意味・禁止語）。数字と名前の照合・字数・式の骨格は checkLine が見る */
function languageProblems(text: string, target: FactTarget): string[] {
  const out: string[] = [];
  if (ABSENCE.test(text)) out.push('「分からない・未確認」と言うだけの文は載せない');
  if (HEDGE.test(text)) out.push('「〜と語る／述べる／記す」型の言い回し（出どころは「公式発表では」のように言い切りに直す）');
  if (/(?<![\d,.])0円/.test(text)) out.push('「0円」は書かない');
  for (const rule of language) { const hit = text.match(rule.re); if (hit) out.push(`読む人に分かりにくい語「${hit[0]}」→ ${rule.suggest}`); }
  for (const hit of findUnnatural(text, naturalRules)) out.push(describeHit(hit));
  out.push(...findNoise(text, { price: target.where.includes('料金') }));
  for (const hit of findUnclear(text, clarityRules)) out.push(describeUnclear(hit));
  return out;
}

// ---------- 材料 ----------
const finished = readFileSync(join(ROOT, 'data/catalog-finished-ids.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
function liveReaders(ids: string[]): Map<string, ReaderCase> {
  const verdicts = read<VerdictsFile>(join(ROOT, VERDICTS_FILE));
  const analysisPath = join(ROOT, 'data/reader-analysis.json');
  const analysis: AnalysisFile = withReflectedAnalysis(existsSync(analysisPath) ? read<AnalysisFile>(analysisPath) : {}, readReflectState());
  return new Map([...loadReaders(ids)].map(([id, reader]) => [id, preparePublicationReader(reader, verdicts[id], analysis[id]).reader as ReaderCase]));
}
interface IndexEntry { id?: string; name?: string; tagline?: string; tags?: string[] }
const index = read<IndexEntry[]>(join(ROOT, 'data/entities-index.json'));
const vocabulary = (() => {
  const count = new Map<string, number>();
  for (const e of index) for (const t of e.tags ?? []) if (!OPERATOR_TAGS.has(t)) count.set(t, (count.get(t) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([t]) => t);
})();

/** すでに画面に出ている同じ事例の文（呼び名をそろえる材料） */
function context(entityId: string): Record<string, unknown> {
  const pick = <T extends { entityId: string }>(file: string): T[] => (existsSync(join(ROOT, file)) ? read<T[]>(join(ROOT, file)).filter((x) => x.entityId === entityId) : []);
  return {
    list: pick<{ entityId: string; text: string }>('data/list-lines.json').map((x) => x.text),
    summary: pick<{ entityId: string; text: string }>('data/summary-lines.json').map((x) => x.text),
    success: pick<{ entityId: string; points: Array<{ head: string; body: string }> }>('data/success-points.json').flatMap((x) => x.points.map((p) => `${p.head}: ${p.body}`)),
    answers: pick<{ entityId: string; answer: string; hidden?: boolean }>('data/detail-lines.json').filter((x) => !x.hidden).map((x) => x.answer),
  };
}

const parseJson = (text: string): unknown => JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''));

interface GenOut { lines?: Array<{ key?: string; text?: string }>; labels?: string[] }
interface ReviewOut { verdicts?: Array<{ key?: string; ok?: boolean; problem?: string; fix?: string }>; labelsOk?: boolean; labelsProblem?: string }

async function buildOne(id: string, reader: ReaderCase, gen: Caller, review: Caller | null, log: (t: string) => void): Promise<{ entries: FactLineEntry[]; failed: Array<{ key: string; problems: string[] }>; calls: number }> {
  const entry = index.find((e) => e.id === id);
  const targets = collectTargets(reader);
  const haystack = [...reader.facts.map((f) => f.text), ...reader.metrics.map((m) => `${m.label ?? ''} ${m.basis ?? ''}`), ...reader.analysis.map((a) => `${a.text} ${a.formula ?? ''}`), entry?.name ?? '', entry?.tagline ?? ''].join('\n');
  const existingLabels = [...new Set((entry?.tags ?? []).map((t) => t.trim()).filter((t) => t && !OPERATOR_TAGS.has(t)))].slice(0, 3);
  const labelsNeeded = existingLabels.length < 2;
  const accepted = new Map<string, string>();
  let pending = [...targets];
  let labels: string[] = [];
  let labelsDone = !labelsNeeded;
  const problemsByKey = new Map<string, string[]>();
  const previous = new Map<string, string>();
  let labelProblems: string[] = [];
  let calls = 0;
  const ctx = context(id);

  for (let attempt = 1; attempt <= ATTEMPTS && (pending.length > 0 || !labelsDone); attempt += 1) {
    const user = JSON.stringify({
      case: { name: entry?.name, tagline: entry?.tagline },
      context: ctx,
      labelsNeeded: !labelsDone, existingLabels, vocabulary,
      targets: pending.map((t) => ({ key: t.key, where: t.where, original: t.original, max: t.max, ...(previous.has(t.key) ? { previous: previous.get(t.key), problems: problemsByKey.get(t.key) } : {}) })),
      ...(labelProblems.length > 0 ? { labelProblems, previousLabels: labels } : {}),
    }, null, 1);
    calls += 1;
    let out: GenOut;
    try { out = parseJson((await gen({ system: GEN_PROMPT, user, label: `fact-lines ${id} #${attempt}` })).text) as GenOut; } catch (e) { log(`${id}: 作る側の呼び出しが失敗 ${(e as Error).message.slice(0, 120)}`); continue; }
    const byKey = new Map((out.lines ?? []).filter((l) => l.key && typeof l.text === 'string').map((l) => [l.key!, l.text!.trim()]));
    // 機械の検査
    const candidates: Array<{ target: FactTarget; text: string }> = [];
    const next: FactTarget[] = [];
    for (const t of pending) {
      const text = byKey.get(t.key);
      if (text === undefined) { problemsByKey.set(t.key, ['返っていない']); next.push(t); continue; }
      const problems = checkLine(t, text, haystack, languageProblems);
      if (problems.length > 0) { problemsByKey.set(t.key, problems); previous.set(t.key, text); next.push(t); continue; }
      // 元のままで良い行は、別のAIの確認を省いて採用する（元の文が規則を通る事を、保存して検査側に示す）
      if (text === t.original.trim()) accepted.set(t.key, text); else candidates.push({ target: t, text });
    }
    let labelsOk = labelsDone;
    if (!labelsDone) {
      labels = (out.labels ?? []).map((l) => String(l).trim()).filter(Boolean);
      labelProblems = checkLabels(labels, existingLabels, OPERATOR_TAGS);
      if (existingLabels.length + labels.length < 2) labelProblems.push('合計が2個未満（足りない）');
      if (existingLabels.length + labels.length > 3) labelProblems.push('合計が3個を超える');
      labelsOk = labelProblems.length === 0;
    }
    // 別のAIの確認
    if (review && (candidates.length > 0 || (!labelsDone && labelsOk))) {
      calls += 1;
      try {
        const rv = parseJson((await review({ system: REVIEW_PROMPT, user: JSON.stringify({ case: { name: entry?.name, tagline: entry?.tagline }, candidates: candidates.map((c) => ({ key: c.target.key, where: c.target.where, before: c.target.original, text: c.text })), ...(!labelsDone && labelsOk ? { labels, existingLabels } : {}) }, null, 1), label: `fact-lines review ${id} #${attempt}` })).text) as ReviewOut;
        const verdict = new Map((rv.verdicts ?? []).filter((v) => v.key).map((v) => [v.key!, v]));
        for (const c of candidates) {
          const v = verdict.get(c.target.key);
          if (v && v.ok === false) { problemsByKey.set(c.target.key, [`確認役: ${v.problem ?? ''}${v.fix ? `（直す案: ${v.fix}）` : ''}`]); previous.set(c.target.key, c.text); next.push(c.target); } else accepted.set(c.target.key, c.text);
        }
        if (!labelsDone && labelsOk && rv.labelsOk === false) { labelsOk = false; labelProblems = [`確認役: ${rv.labelsProblem ?? ''}`]; }
      } catch (e) { log(`${id}: 確認役の呼び出しが失敗 ${(e as Error).message.slice(0, 120)}`); for (const c of candidates) { next.push(c.target); previous.set(c.target.key, c.text); problemsByKey.set(c.target.key, ['確認役が呼べなかった']); } labelsOk = false; }
    } else for (const c of candidates) accepted.set(c.target.key, c.text);
    if (!labelsDone && labelsOk) labelsDone = true;
    pending = next;
    log(`${id}: ${attempt}回目 採用${accepted.size}／対象${targets.length}、残り${pending.length}${labelsNeeded ? `、札${labelsDone ? '済' : '未'}` : ''}`);
  }

  const entries: FactLineEntry[] = [];
  for (const t of targets) { const text = accepted.get(t.key); if (text) entries.push(entryFor(id, t, text)); }
  if (labelsNeeded && labelsDone && labels.length > 0) entries.push({ entityId: id, kind: 'labels', targetId: 'labels', hash: textFingerprint((entry?.tagline ?? '').trim()), text: labels.join('、') });
  const failed = pending.map((t) => ({ key: t.key, problems: problemsByKey.get(t.key) ?? [] }));
  if (labelsNeeded && !labelsDone) failed.push({ key: 'labels', problems: labelProblems });
  return { entries, failed, calls };
}

async function main(): Promise<void> {
  const only = argValue('--id');
  const current = existsSync(OUT) ? read<FactLineEntry[]>(OUT) : [];
  const many = argValue('--ids');
  let ids = only ? [only] : many ? many.split(',').map((s) => s.trim()).filter(Boolean) : has('--all') || has('--list') ? finished : [];
  if (has('--only-missing')) ids = ids.filter((id) => !current.some((x) => x.entityId === id));
  if (ids.length === 0) { console.error('対象が無い。--id <entityId> か --all を付ける'); process.exit(2); }
  const readers = liveReaders(ids);
  if (has('--list')) {
    for (const [id, r] of readers) { const t = collectTargets(r); const c = (k: string) => t.filter((x) => x.kind === k).length; say(`${id}: fact ${c('fact')} / basis ${c('basis')} / formula ${c('formula')} / analysis ${c('analysis')}`); }
    return;
  }
  const genAgent: Agent = pickAgent((argValue('--agent') as Agent | undefined) ?? 'auto', say);
  const reviewAgent: Agent | null = REVIEW ? (((argValue('--review-agent') as Agent | undefined) ?? (genAgent === 'claude' ? 'codex' : 'claude'))) : null;
  const gen = makeCaller(genAgent, { model: argValue('--model') ?? (genAgent === 'claude' ? 'sonnet' : undefined), codexEffort: argValue('--codex-effort') });
  const review = reviewAgent ? makeCaller(reviewAgent, { model: argValue('--review-model'), codexEffort: argValue('--codex-effort') ?? 'low' }) : null;
  say(`作る側 ${genAgent}、確認役 ${reviewAgent ?? 'なし'}、${readers.size}件、同時${CONCURRENCY}`);

  let all = current;
  const queue = [...readers];
  let totalAccepted = 0; let totalTargets = 0; let totalFailed = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const item = queue.shift();
      if (!item) return;
      const [id, reader] = item;
      const started = Date.now();
      try {
        const r = await buildOne(id, reader, gen, review, say);
        const targets = collectTargets(reader).length;
        totalTargets += targets; totalAccepted += r.entries.filter((e) => e.kind !== 'labels').length; totalFailed += r.failed.length;
        if (!DRY) { all = replaceEntity(all, id, r.entries); writeFileSync(OUT, `${JSON.stringify(all, null, 1)}\n`); }
        if (r.failed.length > 0) { mkdirSync(dirname(FAILURES), { recursive: true }); appendFileSync(FAILURES, `${JSON.stringify({ at: new Date().toISOString(), entityId: id, failed: r.failed })}\n`); }
        say(`${id}: 保存${r.entries.length}行、通らず${r.failed.length}件、AI呼び出し${r.calls}回、${Math.round((Date.now() - started) / 1000)}秒`);
      } catch (e) { say(`${id}: 失敗 ${(e as Error).message.slice(0, 200)}`); totalFailed += 1; }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));
  say(`完了: 対象${totalTargets}欄のうち採用${totalAccepted}（通らなかった物は元の文を出す）、通らず${totalFailed}`);
}

void main();
