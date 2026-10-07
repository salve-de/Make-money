/**
 * 差分監査: 前の監査の後に中身が変わった項目（未監査）だけを、事例ごとに1束ずつ別のAIへ渡し、同時に最大4本まで流す。
 * 1. 公開の関門と同じ入力（照合後の事実＋画面に出す推論）を組み、項目ごとの監査記録と合わない項目を集める。
 *    事例の身元が変わった事例だけは、全項目を監査に出す（全体監査）。
 * 2. 事例ごとに data/audit/in-<tag><NNN>.json を書く（1束1事例）。
 * 3. 別のAI（既定 codex。自分では監査しない）に束ごと並行で渡し、結果を data/runner/inbox/audit/ に置いて、実行役の受理検査（runner accept）に通す。
 * 書き込み先はローカルのファイルだけ。推論の正本と監査記録への取り込みは merge-analysis.ts（run-diff-audit.sh が続けて流す）。
 * 使い方: node --import tsx scripts/reader-case/diff-audit.ts [--ids <一覧>] [--parallel 4] [--agent codex|claude] [--tag 数字] [--build-only]
 * 言い回しだけの直し（直した文に、監査済みの文にも事実にも無い数字・年月日・固有名が無い推論）は、ここに来る前に機械の照合で通り、束に入らない（paraphrase-check.ts）。
 * 出力（最後の1行）: {"tag","bundles":[…],"cases":n,"items":n,"accepted":[…],"failed":[…],"paraphrased":{id:[鍵]},"seconds":n}
 * 終了コード: 0=未監査なし・全部受理 / 75=別のAIを使えない・失敗した束がある（指示書を出したので、結果を置いて run-diff-audit.sh を再実行）/ 1=失敗
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { argValue, loadEntities, loadReaders, readIdsFile } from './load-readers';
import type { AnalysisFile } from './analysis-lib';
import { readReflectState, withReflectedAnalysis } from './case-reflect';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';
import { loadPublicationInput, readPublicationAudits } from './publication-inputs';
import { preparePublicationReader, publicationItemHashes, unauditedItems } from './publication-evaluation';
import { auditCaseEntry } from './publication-audit';

const AUDIT_PROMPT = 'scripts/reader-case/audit-prompt.md';
const DIFF_NOTE = `
## 今回は差分監査
- 入力の analysis にあるのは、前の監査の後に変わった推論だけ。他の推論は監査済みなので、出さなくてよい。
- changedClaims に挙がった事実・数字は、前の監査の後に中身が変わったもの。facts / metrics / sources.text と食い違う・名誉を傷つける・違法な手口を勧める問題があれば analysisId="__case__"、severity="BLOCK" にする。
- 問題が無ければ items は空配列。`;
// codex の出力の形。省略できない作りなので、直しの無い欄は null を返させて、受理の前に消す
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['cases'],
  properties: { cases: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['entityId', 'items'], properties: {
    entityId: { type: 'string' },
    items: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['analysisId', 'kind', 'severity', 'why', 'fix', 'fixFormula'], properties: {
      analysisId: { type: 'string' }, kind: { type: 'string' }, severity: { type: 'string', enum: ['BLOCK', 'FIX', 'LOW'] }, why: { type: 'string' },
      fix: { type: ['string', 'null'] }, fixFormula: { type: ['string', 'null'] },
    } } },
  } } } },
};

const say = (s: string) => console.error(`[${new Date().toTimeString().slice(0, 5)}] ${s}`);

/** 別のAIに1束を監査させ、結果の JSON を返す。読める物が何も無い場所で、ツールなしで動かす */
function callAuditor(agent: string, system: string, bundle: string): Promise<unknown> {
  const empty = mkdtempSync(join(tmpdir(), 'diff-audit-'));
  const user = `${system}\n\n## 監査する束（JSON）\n${bundle}\n\nツールやコマンドは使わず、指定の形の JSON だけを返す。`;
  return new Promise((resolve, reject) => {
    const finish = (error: Error | null, value?: unknown) => { rmSync(empty, { recursive: true, force: true }); if (error) reject(error); else resolve(value); };
    if (agent === 'claude') {
      const p = spawn('claude', ['-p', '--output-format', 'json', '--json-schema', JSON.stringify(SCHEMA), '--tools', '', '--strict-mcp-config', '--no-session-persistence'], { cwd: empty });
      let out = ''; let err = '';
      p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { err += d; });
      p.on('error', (e) => finish(e));
      p.on('close', (code) => {
        try {
          const j = JSON.parse(out || '{}') as { is_error?: boolean; result?: string; structured_output?: unknown };
          if (code !== 0 || j.is_error) throw new Error(`claude が失敗: ${(j.result ?? err).slice(0, 300)}`);
          finish(null, j.structured_output ?? JSON.parse(String(j.result ?? '').replace(/^```(?:json)?\s*|\s*```$/g, '')));
        } catch (e) { finish(e as Error); }
      });
      p.stdin.end(user);
      return;
    }
    const schemaFile = join(empty, 'schema.json'); const outFile = join(empty, 'out.json');
    writeFileSync(schemaFile, JSON.stringify(SCHEMA));
    const p = spawn('codex', ['exec', '--skip-git-repo-check', '--ephemeral', '-s', 'read-only', '--output-schema', schemaFile, '-o', outFile, '-C', empty, '-'], { cwd: empty });
    let err = '';
    p.stdout.on('data', () => {}); p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => finish(e));
    p.on('close', (code) => {
      try {
        if (code !== 0 || !existsSync(outFile)) throw new Error(`codex が失敗: ${err.slice(-300)}`);
        finish(null, JSON.parse(readFileSync(outFile, 'utf8')));
      } catch (e) { finish(e as Error); }
    });
    p.stdin.end(user);
  });
}

/** null の直し欄を消す（「式を消す」の空文字と区別するため、null は「直しなし」） */
function clean(result: unknown): unknown {
  const r = result as { cases?: { items?: Record<string, unknown>[] }[] };
  for (const c of r?.cases ?? []) for (const it of c.items ?? []) for (const k of ['fix', 'fixFormula']) if (it[k] === null) delete it[k];
  return r;
}

async function pool<T>(items: T[], size: number, run: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => { for (let x = queue.shift(); x !== undefined; x = queue.shift()) await run(x); }));
}

async function main() {
  const started = Date.now();
  const idsFile = argValue('--ids');
  const ids = idsFile ? readIdsFile(idsFile) : Object.keys((JSON.parse(readFileSync('data/catalog-release.json', 'utf8')) as { details: Record<string, string> }).details);
  const parallel = Number(argValue('--parallel') ?? 4);
  const agent = argValue('--agent') ?? process.env.DIFF_AUDIT_AGENT ?? 'codex';
  // 束の名前は 999999＋手元の時刻（他の監査の束と同じ形）。記録はこの名前の並びで「新しい監査」を決めるので、必ず今までの束より後に並ぶ
  // 前回が別のAI待ち（終了コード75）で止まった時は、その束を使い続ける（置かれた結果を受理するため）。全部受理したら捨てる
  const pendingFile = `data/pipeline/diff-audit-${idsFile ? basename(idsFile).replace(/[^\w.-]/g, '_') : 'all'}.tag`;
  const pending = existsSync(pendingFile) ? readFileSync(pendingFile, 'utf8').trim() : '';
  const now = new Date(); const two = (n: number) => String(n).padStart(2, '0');
  const tag = argValue('--tag') ?? (pending || `999999${two(now.getFullYear() % 100)}${two(now.getMonth() + 1)}${two(now.getDate())}${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`);
  if (!/^999999\d+$/.test(tag) || !Number.isSafeInteger(parallel) || parallel < 1 || !['codex', 'claude'].includes(agent)) throw new Error('引数が不正');
  const newest = existsSync('data/audit') ? readdirSync('data/audit').filter((f) => /^in-\d+\.json$/.test(f)).sort().at(-1) : undefined;
  const resumed = !!pending && tag === pending && existsSync('data/audit') && readdirSync('data/audit').some((f) => f.startsWith(`in-${tag}`));
  if (!resumed && newest && `in-${tag}001.json` <= newest) throw new Error(`束の名前 in-${tag}001 が既存の ${newest} より前に並ぶ（監査記録が新しい監査と見なさない）。--tag を大きくする`);
  const verdicts = JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')) as VerdictsFile;
  const analysis = withReflectedAnalysis(existsSync('data/reader-analysis.json') ? JSON.parse(readFileSync('data/reader-analysis.json', 'utf8')) as AnalysisFile : {}, readReflectState());
  const audits = readPublicationAudits();
  const entities = loadEntities(ids);
  const bundles: { name: string; id: string; items: string[] }[] = [];
  // 言い回しだけの直し（数字・年月日・固有名が増えていない）は、機械の照合で監査済みのまま。別のAIには回さない
  const paraphrased: Record<string, string[]> = {};
  mkdirSync('data/audit', { recursive: true });
  if (resumed) {
    for (const f of readdirSync('data/audit').filter((x) => x.startsWith(`in-${tag}`) && x.endsWith('.json')).sort()) {
      const c = (JSON.parse(readFileSync(`data/audit/${f}`, 'utf8')) as { cases: { entityId: string; review: string[] }[] }).cases[0];
      bundles.push({ name: f.replace(/\.json$/, ''), id: c.entityId, items: c.review });
    }
    say(`前回の束 ${tag} を使い続ける（${bundles.length} 束）`);
  }
  for (const [id, reader] of resumed ? [] : loadReaders(ids)) {
    const entity = entities.get(id);
    if (!entity) continue;
    const prepared = preparePublicationReader(reader, verdicts[id], analysis[id]);
    const input = await loadPublicationInput(entity, prepared.reader, verdicts[id]);
    const left = unauditedItems(input, audits[id]);
    if (left.paraphrased.length) { paraphrased[id] = left.paraphrased; say(`${id}: 言い回しだけの直し ${left.paraphrased.length} 項目は照合で通した（監査に回さない）`); }
    const scope = left.caseLevel ? 'full' : 'diff';
    const review = left.caseLevel ? Object.keys(publicationItemHashes(input)) : left.keys;
    if (!review.length) continue;
    const name = `in-${tag}${String(bundles.length + 1).padStart(3, '0')}`;
    // 同じ名前の古い入力を上書きしない（古い結果と新しい入力が組にならないように）
    writeFileSync(`data/audit/${name}.json`, JSON.stringify({ cases: [auditCaseEntry(input, scope, review)] }, null, 1), { flag: 'wx' });
    bundles.push({ name, id, items: review });
    say(`${id}: ${scope === 'full' ? '全体監査（身元が変わった・記録が無い）' : '差分監査'} ${review.length} 項目 → data/audit/${name}.json`);
  }
  const summary = { tag, bundles: bundles.map((b) => b.name), cases: bundles.length, items: bundles.reduce((n, b) => n + b.items.length, 0), accepted: [] as string[], failed: [] as string[], paraphrased, seconds: 0 };
  if (!bundles.length || process.argv.includes('--build-only')) {
    summary.seconds = Math.round((Date.now() - started) / 1000);
    console.log(JSON.stringify(summary));
    return;
  }
  const system = `${readFileSync(AUDIT_PROMPT, 'utf8')}\n${DIFF_NOTE}`;
  mkdirSync('data/runner/inbox/audit', { recursive: true });
  mkdirSync('data/pipeline', { recursive: true });
  writeFileSync(pendingFile, `${tag}\n`);
  await pool(bundles, parallel, async (b) => {
    const t = Date.now();
    const out = b.name.replace(/^in-/, 'out-');
    // 受理済み・結果が置かれている束は、もう一度AIに回さない
    if (existsSync(`data/audit/${out}.json`) || existsSync(`data/runner/inbox/audit/${out}.json`)) return;
    try {
      const result = clean(await callAuditor(agent, system, readFileSync(`data/audit/${b.name}.json`, 'utf8')));
      writeFileSync(`data/runner/inbox/audit/${b.name.replace(/^in-/, 'out-')}.json`, JSON.stringify(result));
      say(`${b.id}: 監査の結果を受け取った（${Math.round((Date.now() - t) / 1000)}秒）`);
    } catch (error) {
      summary.failed.push(b.name);
      say(`${b.id}: 監査に失敗（${error instanceof Error ? error.message.slice(0, 200) : String(error)}）`);
    }
  });
  // 受理検査（実行役の検査をそのまま使う。形・件数・入力に無い id は拒否）
  const accept = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/reader-case/runner/cli.ts', 'accept', 'audit', '--prefix', tag], { encoding: 'utf8' });
  for (const line of (accept.stdout ?? '').split('\n')) {
    const m = /^受理 \S+ (\S+)/.exec(line);
    if (m) summary.accepted.push(m[1]);
  }
  for (const b of bundles) if (!summary.accepted.includes(b.name) && existsSync(`data/audit/${b.name.replace(/^in-/, 'out-')}.json`)) summary.accepted.push(b.name);
  summary.failed = summary.failed.filter((n) => !summary.accepted.includes(n));
  for (const b of bundles) if (!summary.accepted.includes(b.name) && !summary.failed.includes(b.name)) summary.failed.push(b.name);
  summary.seconds = Math.round((Date.now() - started) / 1000);
  console.log(JSON.stringify(summary));
  if (!summary.failed.length) rmSync(pendingFile, { force: true });
  if (summary.failed.length) {
    say(`受理されなかった束: ${summary.failed.join(', ')}。指示書を出す（別のAIに実行させて結果を置き、同じ命令を再実行）`);
    spawnSync(process.execPath, ['--import', 'tsx', 'scripts/reader-case/runner/cli.ts', 'step', 'audit', '--prefix', tag], { stdio: 'inherit' });
    process.exitCode = 75;
  }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
