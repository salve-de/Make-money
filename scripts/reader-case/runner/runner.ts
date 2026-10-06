/**
 * Claude サブエージェント実行層の契約（外部 LLM 呼び出しの置き換え）。
 *   束ファイル(JSON) を読む → 指示書(Markdown)を生成 → サブエージェントが inbox に結果 JSON を書く
 *   → 機械検査して受理（out へ確定）／拒否（理由を残して再試行）／試行上限で保留（HOLD）。
 * サブエージェントの起動そのものはオーケストレーター（Claude Code の Agent ツール）が行う。ここは起動しない。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateRaw, type Rejection, type StageName } from './validate';

export const DEFAULT_MAX_ATTEMPTS = 3;

interface StageDef {
  name: StageName;
  label: string;
  bundleDir: string;
  /** 束ファイル名の判定（out の名前もここから決まる） */
  bundleFile: RegExp;
  outDir: string;
  outName: (bundleName: string) => string;
  /** 前方一致で束を絞る時の対象になる名前（拡張子なし、入力名から接頭辞を除いたものではなく全体） */
  filterKey: (bundleName: string) => string;
  promptFile: string;
  resultShape: string;
}

export const STAGES: Record<StageName, StageDef> = {
  analyze: {
    name: 'analyze',
    label: '分析',
    bundleDir: 'data/analyze/batches',
    bundleFile: /^batch-.*\.json$/,
    outDir: 'data/analyze/out',
    outName: (n) => n,
    filterKey: (n) => n.replace(/\.json$/, ''),
    promptFile: 'scripts/reader-case/analyze-prompt.md',
    resultShape: '{"analysis":[{"entityId":"…","items":[{"item":"…","text":"…","basis":["f1","m2"],"formula":"…","confidence":"HIGH|MEDIUM|LOW"}]}]}',
  },
  audit: {
    name: 'audit',
    label: '監査',
    bundleDir: 'data/audit',
    bundleFile: /^in-.*\.json$/,
    outDir: 'data/audit',
    outName: (n) => n.replace(/^in-/, 'out-'),
    filterKey: (n) => n.replace(/^in-/, '').replace(/\.json$/, ''),
    promptFile: 'scripts/reader-case/audit-prompt.md',
    resultShape: '{"cases":[{"entityId":"…","items":[{"analysisId":"a-…","kind":"…","severity":"BLOCK|FIX|LOW","why":"…","fix":"…","fixFormula":"…"}]}]}',
  },
  verify: {
    name: 'verify',
    label: '照合',
    bundleDir: 'data/verify/batches',
    bundleFile: /^batch-.*\.json$/,
    outDir: 'data/verify/out',
    outName: (n) => n,
    filterKey: (n) => n.replace(/\.json$/, ''),
    promptFile: 'scripts/reader-case/verify-prompt.md',
    resultShape: '{"verdicts":[{"entityId":"…","claimId":"…","verdict":"SUPPORTED|PARTIAL|NOT_SUPPORTED","quote":"…","fix":{…}}]}',
  },
};

export type BundleStatus = 'DONE' | 'READY_TO_ACCEPT' | 'WAITING' | 'HOLD';

export interface BundleState {
  attempts: number;
  rejections: Rejection[];
  hold?: boolean;
}

export interface BundleInfo {
  stage: StageName;
  name: string;
  bundlePath: string;
  outPath: string;
  inboxPath: string;
  instructionPath: string;
  status: BundleStatus;
  attempts: number;
  lastRejections: Rejection[];
}

export interface RunnerOptions {
  root: string;
  stage: StageName;
  /** 束の名前の前方一致（run-pipeline の ANALYZE_PREFIX / AUDIT_ONLY 相当。末尾の * は無視） */
  prefix?: string;
  /** true なら既存の out を .bak に退避してから、全束をやり直す（保留も解除） */
  force?: boolean;
  maxAttempts?: number;
  /** true なら何も書かない（一覧と判定だけ） */
  dryRun?: boolean;
}

const runnerDir = (root: string, kind: string, stage: StageName): string => join(root, 'data/runner', kind, stage);

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadState(root: string, stage: StageName, name: string): BundleState {
  const p = join(runnerDir(root, 'state', stage), `${name}.json`);
  if (!existsSync(p)) return { attempts: 0, rejections: [] };
  try {
    return readJson(p) as BundleState;
  } catch {
    return { attempts: 0, rejections: [] };
  }
}

function saveState(root: string, stage: StageName, name: string, s: BundleState): void {
  const dir = runnerDir(root, 'state', stage);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.json`), JSON.stringify(s, null, 1));
}

export function listBundles(o: RunnerOptions): string[] {
  const def = STAGES[o.stage];
  const dir = join(o.root, def.bundleDir);
  if (!existsSync(dir)) return [];
  const pre = (o.prefix ?? '').replace(/\*+$/, '');
  return readdirSync(dir)
    .filter((f) => def.bundleFile.test(f) && def.filterKey(f).startsWith(pre))
    .sort();
}

/** 出力が「今の束に対して」受理基準を満たすか。エラー文だけの出力や件数不足を完了扱いにしない */
function outIsValid(o: RunnerOptions, bundle: unknown, outPath: string): boolean {
  if (!existsSync(outPath)) return false;
  return validateRaw(o.stage, bundle, readFileSync(outPath, 'utf8')).ok;
}

export function instructionText(o: RunnerOptions, name: string, state: BundleState): string {
  const def = STAGES[o.stage];
  const prompt = readFileSync(join(o.root, def.promptFile), 'utf8');
  const bundleRel = `${def.bundleDir}/${name}`;
  const inboxRel = `data/runner/inbox/${o.stage}/${def.outName(name)}`;
  const retry = state.rejections.length
    ? `\n## 前回の提出は機械検査で拒否された（${state.attempts} 回目まで）\n次の点をすべて直して、結果全体を出し直す。\n${state.rejections.map((r) => `- [${r.code}] ${r.message}`).join('\n')}\n`
    : '';
  return `# ${def.label}の依頼: ${name}

あなたは Claude サブエージェントとして、下の「指示本体」に従い 1 つの束を処理する。

## 実行方式（指示本体の「ファイルを開かない」「最終メッセージは JSON だけ」の部分はこの節で置き換える）
- 入力の束ファイル: \`${bundleRel}\`（リポジトリ ${o.root} 内。これを Read で全文読む）。
- 結果は JSON だけを、次のファイルに Write で書く: \`${inboxRel}\`。
- 結果の形: \`${def.resultShape}\`
- 入力の全事例（全 claim）に 1 件ずつ返す。抜け・重複・入力に無い id は機械検査で拒否される。
- web 検索・コマンド実行・他のファイルの変更はしない。書いてよいのは上の 1 ファイルだけ。
- 書き終えたら最終メッセージは「完了」の一語だけ。
${retry}
## 指示本体
${prompt}
`;
}

/** 束ごとの状態を判定する（書き込みなし） */
export function inspect(o: RunnerOptions): BundleInfo[] {
  const def = STAGES[o.stage];
  const maxAttempts = o.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  return listBundles(o).map((file) => {
    const outPath = join(o.root, def.outDir, def.outName(file));
    const inboxPath = join(runnerDir(o.root, 'inbox', o.stage), def.outName(file));
    const instructionPath = join(runnerDir(o.root, 'instructions', o.stage), file.replace(/\.json$/, '.md'));
    const bundlePath = join(o.root, def.bundleDir, file);
    const state = loadState(o.root, o.stage, file);
    let status: BundleStatus;
    if (outIsValid(o, readJson(bundlePath), outPath)) status = 'DONE';
    else if (existsSync(inboxPath)) status = 'READY_TO_ACCEPT';
    else if (state.hold || state.attempts >= maxAttempts) status = 'HOLD';
    else status = 'WAITING';
    return { stage: o.stage, name: file.replace(/\.json$/, ''), bundlePath, outPath, inboxPath, instructionPath, status, attempts: state.attempts, lastRejections: state.rejections };
  });
}

export interface AcceptResult {
  accepted: string[];
  rejected: { name: string; reasons: Rejection[]; held: boolean }[];
}

/** inbox に届いた結果を検査し、通ったものだけ out へ確定する。通らなければ理由を残し、試行上限で保留にする */
export function acceptInbox(o: RunnerOptions): AcceptResult {
  const def = STAGES[o.stage];
  const maxAttempts = o.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const res: AcceptResult = { accepted: [], rejected: [] };
  for (const info of inspect(o)) {
    if (info.status !== 'READY_TO_ACCEPT') continue;
    const file = `${info.name}.json`;
    const raw = readFileSync(info.inboxPath, 'utf8');
    const v = validateRaw(o.stage, readJson(info.bundlePath), raw);
    if (o.dryRun) {
      if (v.ok) res.accepted.push(info.name);
      else res.rejected.push({ name: info.name, reasons: v.reasons, held: false });
      continue;
    }
    if (v.ok) {
      mkdirSync(join(o.root, def.outDir), { recursive: true });
      const tmp = `${info.outPath}.tmp`;
      writeFileSync(tmp, JSON.stringify(v.value));
      renameSync(tmp, info.outPath);
      rmSync(info.inboxPath, { force: true });
      saveState(o.root, o.stage, file, { attempts: info.attempts, rejections: [] });
      res.accepted.push(info.name);
    } else {
      const attempts = info.attempts + 1;
      const held = attempts >= maxAttempts;
      // 拒否した提出は消さずに .rejected として残す（人が原因を見られる）。同じ場所に次の提出が書けるよう inbox からは外す
      renameSync(info.inboxPath, `${info.inboxPath}.rejected`);
      saveState(o.root, o.stage, file, { attempts, rejections: v.reasons, ...(held ? { hold: true } : {}) });
      res.rejected.push({ name: info.name, reasons: v.reasons, held });
    }
  }
  return res;
}

/** まだ結果が無い（待ち・再試行）の束の指示書を書き出す。保留（HOLD）は書かない */
export function writeInstructions(o: RunnerOptions): BundleInfo[] {
  const waiting = inspect(o).filter((b) => b.status === 'WAITING');
  if (o.dryRun) return waiting;
  for (const b of waiting) {
    mkdirSync(runnerDir(o.root, 'instructions', o.stage), { recursive: true });
    mkdirSync(runnerDir(o.root, 'inbox', o.stage), { recursive: true });
    writeFileSync(b.instructionPath, instructionText(o, `${b.name}.json`, loadState(o.root, o.stage, `${b.name}.json`)));
  }
  return waiting;
}

/** 保留を解除して試行回数を 0 に戻す（人の判断後に使う） */
export function releaseHold(o: RunnerOptions): number {
  let n = 0;
  for (const b of inspect(o)) {
    if (b.status !== 'HOLD') continue;
    saveState(o.root, o.stage, `${b.name}.json`, { attempts: 0, rejections: [] });
    n++;
  }
  return n;
}

export interface StepSummary {
  done: number;
  waiting: BundleInfo[];
  held: BundleInfo[];
  accepted: string[];
  rejected: AcceptResult['rejected'];
  /** 0=全部受理済み, 75=サブエージェント待ち, 76=保留のみ残る */
  exitCode: 0 | 75 | 76;
}

/** run-*.sh の 1 手: 届いた結果を受理 → 未処理の指示書を出す → 状態を要約 */
export function step(o: RunnerOptions): StepSummary {
  if (o.force && !o.dryRun) {
    for (const b of inspect(o)) {
      if (b.status === 'DONE') renameSync(b.outPath, `${b.outPath}.bak-${Date.now()}`);
      saveState(o.root, o.stage, `${b.name}.json`, { attempts: 0, rejections: [] });
    }
  }
  const acc = acceptInbox(o);
  writeInstructions(o);
  const all = inspect(o);
  const waiting = all.filter((b) => b.status === 'WAITING' || b.status === 'READY_TO_ACCEPT');
  const held = all.filter((b) => b.status === 'HOLD');
  const exitCode = waiting.length ? 75 : held.length ? 76 : 0;
  return { done: all.filter((b) => b.status === 'DONE').length, waiting, held, accepted: acc.accepted, rejected: acc.rejected, exitCode };
}
