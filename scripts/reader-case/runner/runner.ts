/**
 * Claude サブエージェント実行層の契約（外部 LLM 呼び出しの置き換え）。
 *   束ファイル(JSON) を読む → 指示書(Markdown)を生成 → サブエージェントが inbox に結果 JSON を書く
 *   → 機械検査して受理（out へ確定）／拒否（理由を残して再試行）／試行上限で保留（HOLD）。
 * サブエージェントの起動そのものはオーケストレーター（Claude Code の Agent ツール）が行う。ここは起動しない。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEDGER_DIR, appendRecord, readCaseRecords, type ReasonCode, type Stage } from '../ledger';
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
    resultShape: '{"analysis":[{"entityId":"…","items":[{"item":"…","text":"…","basis":["f1","m2"],"formula":"…","presentation":"FACT_SUMMARY|ESTIMATE"}]}]}（書ける項目が無い事例は items を空配列にする。ESTIMATE のときだけ formula 必須）',
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

/** 束の完了と試行を結びつける指紋。入力（束の中身）と規則版（指示書・結果の形）が両方同じ時だけ同じ結果とみなす */
export interface Fingerprint {
  inputHash: string;
  ruleVersion: string;
}

export interface BundleState {
  attempts: number;
  rejections: Rejection[];
  hold?: boolean;
  /** この状態（試行回数・保留）を記録した時の指紋。今の指紋と違えば、入力か規則が変わったので試行も保留も白紙に戻す */
  fp?: Fingerprint;
  /** 最後に受理した時の指紋。今の指紋と一致する時だけ完了（DONE）とみなす。出力ファイルの有無・形では判定しない */
  done?: Fingerprint & { at: string };
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
  /** 束の名前（拡張子なし）をこの一覧に完全一致するものだけに絞る（事例ごとの束を並列に流す時、接頭辞の取り違えを避ける） */
  only?: readonly string[];
  /** true なら既存の out を .bak に退避してから、全束をやり直す（保留も解除） */
  force?: boolean;
  maxAttempts?: number;
  /** true なら何も書かない（一覧と判定だけ） */
  dryRun?: boolean;
}

const sha = (s: string): string => createHash('sha256').update(s).digest('hex').slice(0, 16);

/**
 * 規則版 = 段階の指示書（プロンプトの全文）と、結果の形の定義のハッシュ。
 * 指示書を変えたら版が変わり、旧い指示で作られた結果は再処理になる（出力が残っていても完了扱いにしない）。
 * 結果の受理検査（validate.ts）は DONE 判定のたびに out へ当て直すので、版には入れない。
 */
export function ruleVersionOf(o: Pick<RunnerOptions, 'root' | 'stage'>): string {
  const def = STAGES[o.stage];
  const p = join(o.root, def.promptFile);
  return sha(JSON.stringify([o.stage, existsSync(p) ? readFileSync(p, 'utf8') : null, def.resultShape]));
}

export function fingerprintOf(o: Pick<RunnerOptions, 'root' | 'stage'>, bundleRaw: string): Fingerprint {
  return { inputHash: sha(bundleRaw), ruleVersion: ruleVersionOf(o) };
}

const sameFp = (a: Fingerprint | undefined, b: Fingerprint): boolean => !!a && a.inputHash === b.inputHash && a.ruleVersion === b.ruleVersion;

const LEDGER_STAGE: Record<StageName, Stage> = { analyze: 'ANALYZE', audit: 'AUDIT', verify: 'VERIFY' };
const HOLD_REASON: Record<StageName, ReasonCode> = { analyze: 'ANALYSIS_REJECTED', audit: 'AUDIT_REJECTED', verify: 'VERIFY_UNRESOLVED' };

/** 束の中の事例 id と、事例ごとの入力指紋（その事例の入力 JSON のハッシュ）。台帳の inputHash に使う */
function bundleCases(bundle: unknown): { id: string; hash: string }[] {
  const cs = (bundle as { cases?: unknown })?.cases;
  if (!Array.isArray(cs)) return [];
  return cs.flatMap((c) => (typeof c?.entityId === 'string' ? [{ id: c.entityId as string, hash: sha(JSON.stringify(c)) }] : []));
}

/** 台帳への記録。台帳に書けなくても実行は止めない。事例ごとの最新が同じ指紋の DONE / SKIPPED なら足さない（記録を増やし続けない） */
function ledgerNote(o: RunnerOptions, bundle: unknown, rule: string, status: 'DONE' | 'SKIPPED_SAME_INPUT' | 'HOLD', reason?: { code: ReasonCode; text: string }): void {
  if (o.dryRun) return;
  const dir = join(o.root, LEDGER_DIR);
  const stage = LEDGER_STAGE[o.stage];
  for (const c of bundleCases(bundle)) {
    try {
      const last = readCaseRecords(c.id, dir).filter((r) => r.stage === stage).at(-1);
      if (status !== 'HOLD' && last && (last.status === 'DONE' || last.status === 'SKIPPED_SAME_INPUT') && last.inputHash === c.hash && last.ruleVersion === rule) continue;
      appendRecord({ caseId: c.id, stage, status, inputHash: c.hash, ruleVersion: rule, actor: 'runner', finishedAt: new Date().toISOString(), ...(reason ? { reasonCode: reason.code, reasonText: reason.text, nextAction: '原因を直して release で保留を解除' } : {}) }, dir);
    } catch { /* 台帳に書けなくても実行は止めない */ }
  }
}

const runnerDir = (root: string, kind: string, stage: StageName): string => join(root, 'data/runner', kind, stage);

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadState(root: string, stage: StageName, name: string, fp?: Fingerprint): BundleState {
  const p = join(runnerDir(root, 'state', stage), `${name}.json`);
  if (!existsSync(p)) return { attempts: 0, rejections: [] };
  try {
    const st = readJson(p) as BundleState;
    // 試行回数・保留は、それを記録した時の指紋と今の指紋が同じ間だけ有効。入力か規則が変わったら白紙に戻す（done は別に今の指紋と照合する）
    if (fp && st.fp && !sameFp(st.fp, fp)) return { attempts: 0, rejections: [], ...(st.done ? { done: st.done } : {}) };
    return st;
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
    .filter((f) => def.bundleFile.test(f) && def.filterKey(f).startsWith(pre) && (!o.only || o.only.includes(f.replace(/\.json$/, ''))))
    .sort();
}

/** 出力が「今の束に対して」受理基準を満たすか。エラー文だけの出力や件数不足を完了扱いにしない */
function outIsValid(o: RunnerOptions, bundle: unknown, outPath: string): boolean {
  if (!existsSync(outPath)) return false;
  return validateRaw(o.stage, bundle, readFileSync(outPath, 'utf8')).ok;
}

/** 完了（DONE）= 今の入力指紋＋規則版で受理済み、かつ出力が今の受理検査を満たす。出力ファイルがあるだけでは完了にしない */
function isDone(o: RunnerOptions, bundle: unknown, outPath: string, state: BundleState, fp: Fingerprint): boolean {
  return sameFp(state.done, fp) && outIsValid(o, bundle, outPath);
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
    const raw = readFileSync(bundlePath, 'utf8');
    const fp = fingerprintOf(o, raw);
    const state = loadState(o.root, o.stage, file, fp);
    let status: BundleStatus;
    if (isDone(o, JSON.parse(raw), outPath, state, fp)) status = 'DONE';
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
    const bundleRaw = readFileSync(info.bundlePath, 'utf8');
    const bundle = JSON.parse(bundleRaw);
    const fp = fingerprintOf(o, bundleRaw);
    const v = validateRaw(o.stage, bundle, raw);
    if (o.dryRun) {
      if (v.ok) res.accepted.push(info.name);
      else res.rejected.push({ name: info.name, reasons: v.reasons, held: false });
      continue;
    }
    if (v.ok) {
      mkdirSync(join(o.root, def.outDir), { recursive: true });
      const tmp = `${info.outPath}.tmp`;
      writeFileSync(tmp, JSON.stringify(v.value));
      // 旧い指紋で作られた出力は、上書きせず退避する（人が差を見られる）
      if (existsSync(info.outPath)) renameSync(info.outPath, `${info.outPath}.bak-${Date.now()}`);
      renameSync(tmp, info.outPath);
      rmSync(info.inboxPath, { force: true });
      saveState(o.root, o.stage, file, { attempts: info.attempts, rejections: [], fp, done: { ...fp, at: new Date().toISOString() } });
      ledgerNote(o, bundle, fp.ruleVersion, 'DONE');
      res.accepted.push(info.name);
    } else {
      const attempts = info.attempts + 1;
      const held = attempts >= maxAttempts;
      // 拒否した提出は消さずに .rejected として残す（人が原因を見られる）。同じ場所に次の提出が書けるよう inbox からは外す
      renameSync(info.inboxPath, `${info.inboxPath}.rejected`);
      saveState(o.root, o.stage, file, { attempts, rejections: v.reasons, fp, ...(held ? { hold: true } : {}) });
      if (held) ledgerNote(o, bundle, fp.ruleVersion, 'HOLD', { code: HOLD_REASON[o.stage], text: `機械検査で ${attempts} 回拒否: ${v.reasons.slice(0, 3).map((x) => `[${x.code}] ${x.message}`).join(' / ')}` });
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
    const fp = fingerprintOf(o, readFileSync(b.bundlePath, 'utf8'));
    writeFileSync(b.instructionPath, instructionText(o, `${b.name}.json`, loadState(o.root, o.stage, `${b.name}.json`, fp)));
  }
  return waiting;
}

/** 保留を解除して試行回数を 0 に戻す（人の判断後に使う） */
export function releaseHold(o: RunnerOptions): number {
  let n = 0;
  for (const b of inspect(o)) {
    if (b.status !== 'HOLD') continue;
    saveState(o.root, o.stage, `${b.name}.json`, { attempts: 0, rejections: [], fp: fingerprintOf(o, readFileSync(b.bundlePath, 'utf8')) });
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
      saveState(o.root, o.stage, `${b.name}.json`, { attempts: 0, rejections: [], fp: fingerprintOf(o, readFileSync(b.bundlePath, 'utf8')) });
    }
  }
  const acc = acceptInbox(o);
  writeInstructions(o);
  const all = inspect(o);
  // 入力も規則も変わらず、すでに受理済みの束は再処理しない。台帳には「同じ入力のため飛ばした」を残す（事例ごとに最新が同じなら足さない）
  for (const b of all.filter((x) => x.status === 'DONE')) {
    const raw = readFileSync(b.bundlePath, 'utf8');
    ledgerNote(o, JSON.parse(raw), fingerprintOf(o, raw).ruleVersion, 'SKIPPED_SAME_INPUT');
  }
  const waiting = all.filter((b) => b.status === 'WAITING' || b.status === 'READY_TO_ACCEPT');
  const held = all.filter((b) => b.status === 'HOLD');
  const exitCode = waiting.length ? 75 : held.length ? 76 : 0;
  return { done: all.filter((b) => b.status === 'DONE').length, waiting, held, accepted: acc.accepted, rejected: acc.rejected, exitCode };
}
