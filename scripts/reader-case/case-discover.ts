/**
 * 新しい事例の候補を見つけて data/candidates/queue.jsonl に足す。人が付き添わない。
 *
 *   pnpm case:discover --count 10
 *   オプション: --agent codex|claude（既定 codex）  --model <型>  --codex-effort low|medium|high
 *              --concurrency N（同時に流すAIの本数。既定3）  --rounds N（足りない時に探し直す回数の上限。既定4）  --run-id <名前>
 *
 * 流れ: AI（web 検索ができる）に探し方の向きを変えて同時に探させる → 重複を落とす（社名・公式サイトのドメイン。
 * 既存の事例・予約の一覧・queue と照らす）→ 数字の出典を実際に取得して引用が本文にあるか確かめる → 優先度を付けて queue に足す。
 * 各段の時間は data/pipeline/case-run.jsonl に残す。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCaller, mapPool, type Agent, type Caller } from './agent-call';
import { fetchOne } from './fetch-sources';
import { buildDedupIndex, extractJson, priorityOf, readQueue, timed, toCandidate, updateCandidates, type Candidate, type CandidateSource, type RawCandidate } from './candidates-lib';
import { sourcePolicy } from './source-policy';
import { cachePath, MIN_TEXT, quoteInText } from './verify-lib';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

/** 探し方の向き。同時に流す本数ぶん、順に割り当てて偏りを避ける */
export const ANGLES: { id: string; text: string }[] = [
  { id: 'indie', text: 'Indie Hackers・Starter Story・Hacker News など、個人や少人数の創業者が自分で収益や利用者数を公開している事例。' },
  { id: 'jp', text: '日本の起業メディア・経済紙・個人開発者のブログや note に出ている、日本の事業の事例（個人事業から中堅まで）。' },
  { id: 'open', text: '決算や収益を自分のサイトで公開している事業（収益公開ページ、年次報告、株主向けの資料）。上場・非上場を問わない。' },
  { id: 'real', text: 'ソフト以外の実業（店・物販・製造・運送・不動産・飲食・教育・医療周辺）で、創業者が数字を語っている事例。' },
  { id: 'world', text: '米国・日本以外（欧州・アジア・中東・アフリカ・中南米）の起業メディアや創業者の取材に出ている事例。' },
  { id: 'story', text: '創業者へのインタビュー・ポッドキャスト書き起こし・長文のふり返り記事で、最初の客の取り方と転機が詳しく語られている事例。' },
];

export interface DiscoverOptions {
  root: string;
  count: number;
  runId: string;
  concurrency: number;
  rounds: number;
  log?: (t: string) => void;
}
export type SourceChecker = (url: string, quote: string) => Promise<'ok' | 'unreachable' | 'missing'>;
export interface DiscoverDeps {
  caller: Caller;
  check?: SourceChecker;
  now?: () => number;
}
export interface DiscoverSummary {
  runId: string;
  requested: number;
  added: Candidate[];
  rejected: { name: string; reason: string }[];
  rounds: number;
  seconds: number;
}

/** 数字の出典を実際に取得し、引用が本文にあるかを見る。取得した本文は出典の保存（data/source-cache）にも残す（調査の段が再利用する） */
export const defaultCheck: SourceChecker = async (url, quote) => {
  const rec = await fetchOne(url);
  try { writeFileSync(cachePath(url), JSON.stringify(rec)); } catch { /* 保存できなくても判定は続ける */ }
  if (rec.text.length < MIN_TEXT) return 'unreachable';
  return quoteInText(quote, rec.text) ? 'ok' : 'missing';
};

function systemPrompt(root: string): string {
  return readFileSync(join(root, 'scripts/reader-case/discover-prompt.md'), 'utf8');
}

function userPrompt(angle: { id: string; text: string }, ask: number, avoid: readonly string[]): string {
  return `## 今回の探し方の向き\n${angle.text}\n\n## 返す件数\n${ask} 件まで。確かめられた物だけ。足りなければ少なくてよい。\n\n## すでにある事例・候補（挙げない）\n${avoid.length ? avoid.join('、') : '（なし）'}\n\n指定の形の JSON だけを返す。`;
}

export async function runDiscover(opt: DiscoverOptions, deps: DiscoverDeps): Promise<DiscoverSummary> {
  const log = opt.log ?? ((t: string) => console.log(`[case:discover] ${t}`));
  const now = deps.now ?? Date.now;
  const check = deps.check ?? defaultCheck;
  const t0 = now();
  const added: Candidate[] = [];
  const rejected: { name: string; reason: string }[] = [];
  const idx = buildDedupIndex(opt.root);
  log(`照合先: 社名 ${idx.size.names} 件・ドメイン ${idx.size.domains} 件`);
  const system = systemPrompt(opt.root);
  const recentNames = readQueue(opt.root).slice(-120).map((c) => c.name);
  const avoid = [...recentNames];
  let rounds = 0;

  while (added.length < opt.count && rounds < opt.rounds) {
    rounds++;
    const need = opt.count - added.length;
    const calls = Math.min(opt.concurrency, Math.max(1, need));
    const ask = Math.min(12, Math.ceil((need * 2) / calls) + 1);
    const angles = Array.from({ length: calls }, (_, i) => ANGLES[(rounds * 2 + i) % ANGLES.length]!);
    log(`第${rounds}回: あと${need}件。AI ${calls}本で各${ask}件まで探す（${angles.map((a) => a.id).join('・')}）`);

    const raws = await timed(opt.root, opt.runId, `discover:ai:r${rounds}`, calls, async () => {
      const out = await mapPool(angles, opt.concurrency, async (a) => {
        try {
          const r = await deps.caller({ system, user: userPrompt(a, ask, avoid.slice(-300)), label: `discover:${a.id}` });
          const j = extractJson(r.text) as { candidates?: RawCandidate[] } | undefined;
          return Array.isArray(j?.candidates) ? j!.candidates! : [];
        } catch (e) { log(`探す向き ${a.id} が失敗: ${String(e).slice(0, 160)}`); return [] as RawCandidate[]; }
      });
      const flat = out.flat();
      return { value: flat, detail: { proposed: flat.length } };
    }, now);

    // 形の検査と重複の落とし（社名・ドメイン）
    const fresh: Candidate[] = [];
    for (const raw of raws) {
      const t = toCandidate(raw, opt.runId);
      if (!t.ok) { rejected.push({ name: String((raw as { name?: unknown }).name ?? '?'), reason: t.reason }); continue; }
      const c = t.candidate;
      const dup = idx.check(c.name, c.url);
      if (dup) { rejected.push({ name: c.name, reason: `重複: ${dup}` }); continue; }
      idx.add(c.name, c.url, '今回の候補'); // 同じ回の中の重複も落とす
      avoid.push(c.name);
      fresh.push(c);
    }

    // 数字の出典を取得して引用を確かめる
    const verified = await timed(opt.root, opt.runId, `discover:verify:r${rounds}`, fresh.length, async () => {
      const keep: Candidate[] = [];
      await mapPool(fresh, 8, async (c) => {
        const srcs: CandidateSource[] = [];
        for (const s of c.sources) {
          let res: 'ok' | 'unreachable' | 'missing' = 'unreachable';
          try { res = await check(s.url, s.quote); } catch { /* 取得の失敗は unreachable */ }
          if (res === 'missing') continue; // 出典に引用が無い = 作られた可能性。出典ごと外す
          let rightsOk = false;
          try { rightsOk = !!sourcePolicy(s.url, c.url); } catch { /* 判定できない出典は不可として扱う */ }
          srcs.push({ ...s, check: res, rightsOk });
        }
        if (!srcs.some((s) => s.check === 'ok')) { rejected.push({ name: c.name, reason: srcs.length ? '数字の出典を取得できず、引用を確かめられない' : '引用が出典の本文に無い' }); return; }
        const scores = { ...c.scores, certainty: srcs.some((s) => s.rightsOk) ? c.scores.certainty : Math.min(c.scores.certainty, 4) };
        keep.push({ ...c, sources: srcs, scores, priority: priorityOf(scores) });
      });
      return { value: keep, failed: fresh.length - keep.length, detail: { checked: fresh.length, kept: keep.length } };
    }, now);

    verified.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
    const take = verified.slice(0, need);
    for (const c of verified.slice(need)) rejected.push({ name: c.name, reason: '件数の上限（優先度が低い順に見送り）' });
    added.push(...take);
    if (take.length) updateCandidates(opt.root, (rows) => { rows.push(...take); });
    log(`第${rounds}回の結果: 提案${raws.length} → 新規で出典確認済み${verified.length} → 足した${take.length}（累計${added.length}/${opt.count}）`);
  }

  const seconds = Math.round((now() - t0) / 100) / 10;
  const summary: DiscoverSummary = { runId: opt.runId, requested: opt.count, added, rejected, rounds, seconds };
  const f = join(opt.root, 'data/pipeline/case-run', opt.runId);
  try { mkdirSync(f, { recursive: true }); writeFileSync(join(f, 'discover-summary.json'), JSON.stringify(summary, null, 1)); } catch { /* 記録できなくても止めない */ }
  return summary;
}

function parseArgs(argv: string[]): { count: number; agent: Agent | 'auto'; model?: string; codexEffort?: string; concurrency: number; rounds: number; runId: string } {
  const val = (k: string): string | undefined => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const count = Number(val('--count'));
  if (!Number.isInteger(count) || count < 1) throw new Error('--count N（1以上の整数）が要る');
  const agent = (val('--agent') ?? 'codex') as Agent | 'auto';
  if (!['codex', 'claude', 'auto'].includes(agent)) throw new Error('--agent は codex か claude');
  const concurrency = Number(val('--concurrency') ?? 3);
  const rounds = Number(val('--rounds') ?? 4);
  return { count, agent, model: val('--model'), codexEffort: val('--codex-effort'), concurrency: Math.max(1, concurrency), rounds: Math.max(1, rounds), runId: val('--run-id') ?? `discover-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}` };
}

async function main(): Promise<void> {
  const a = parseArgs(process.argv.slice(2));
  const { pickAgent } = await import('./agent-call');
  const agent = a.agent === 'auto' ? pickAgent('auto') : a.agent;
  const caller = makeCaller(agent, { model: a.model, codexEffort: a.codexEffort, web: true });
  const s = await runDiscover({ root: ROOT, count: a.count, runId: a.runId, concurrency: a.concurrency, rounds: a.rounds }, { caller });
  console.log(`\n足した候補 ${s.added.length}/${s.requested} 件（${s.seconds}秒、${s.rounds}回で探した）`);
  for (const c of s.added) console.log(`- [${c.priority}] ${c.name} ${c.url}\n    ${c.reason}\n    出典: ${c.sources.map((x) => x.url).join(' ')}`);
  if (s.rejected.length) console.log(`\n見送り ${s.rejected.length} 件: ${s.rejected.slice(0, 20).map((r) => `${r.name}（${r.reason}）`).join(' / ')}`);
  console.log(JSON.stringify({ runId: s.runId, requested: s.requested, added: s.added.map((c) => c.id), seconds: s.seconds }));
  if (!s.added.length) process.exitCode = 3; // 1件も足せなかった（呼び側が気づけるように）。一部だけ足りない時は0で終える
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main();
