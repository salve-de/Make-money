/**
 * 反映段（取り込み → 画面の正本）。事例担当が作り直した事例（import-case-rebuild.ts の出力 data/case-import/）を、
 * 画面が読む正本の重ね書き（data/case-reflect.json）へ合流させる。設計は docs/pipeline/CASE_REFLECT.md。
 *
 * 規則（REFLECT_RULE_VERSION）:
 * - 取り込み台帳の最新が保留、または取り込み出力が台帳の最新と食い違う（古い出力が残っている）→ 保留。旧版も出さない。
 * - 取り込み版の中身の基準（リード・仮置きなし・出典）に落ちる → 保留。旧版も出さない。
 * - 公開の関門（evaluateForRelease: 照合・出典本文・利用条件・画像・受領書・必須項目）に通る → SHOW。通らない → 保留。
 * - 保留でも、取り込みと中身の基準を通った版は reader を持つ（照合・審査の次の段がこの版を対象にできるように）。
 * - 同じ事例は取り込み版が旧版を置き換える。置き換えた旧い記録は data/case-reflect-history.jsonl に追記して残す。
 * - 入力指紋（hash）が同じなら何も書かない（再実行で重複・巻き戻りなし）。取り込み出力が手元に無い事例の記録は消さない。
 *
 * 書き込み先はローカルのファイルだけ。R2・公開・本番には触れない。
 * 使い方: node --import tsx scripts/reader-case/case-reflect.ts [--ids a,b] [--data data] [--dry-run]
 */
import { existsSync, appendFileSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ReaderCaseSchema, type ReaderCase } from '../../src/shared/reader-case';
import { checkLead } from '../../src/shared/lead-standard';
import { citesRestrictedSource, type AnalysisFile, type StoredAnalysis } from './analysis-lib';
import { LEDGER_DIR, readCaseRecords } from './ledger';
import { contentHash } from './publication-evaluation';
import { IMPORT_ACTOR } from './import-case-rebuild';

export const REFLECT_RULE_VERSION = 'case-reflect-v1';
export const REFLECT_FILE = 'data/case-reflect.json';
export const REFLECT_HISTORY_FILE = 'data/case-reflect-history.jsonl';

/** どの段で止まったか。IMPORT=取り込みの保留、CONTENT=取り込み版の中身の基準、RELEASE=公開の関門 */
export type ReflectStage = 'IMPORT' | 'CONTENT' | 'RELEASE';
export interface ReflectEntry {
  id: string;
  state: 'SHOW' | 'HOLD';
  stage?: ReflectStage;
  reasons: string[];
  /** 取り込みの入力指紋（import.json / 台帳の inputHash） */
  importHash: string | null;
  /** 取り込み版の中身（推論込み）。取り込みと中身の基準を通った時だけ */
  reader?: ReaderCase;
  ruleVersion: string;
  /** この記録の指紋（時刻を含まない）。同じなら書き換えない */
  hash: string;
  reflectedAt: string;
}
export interface ReflectState { version: 1; cases: Record<string, ReflectEntry> }

const PLACEHOLDER = /仮置|仮の(値|数字|数値|金額)|ダミー|プレースホルダ|placeholder|\bTBD\b|\bTODO\b|\bXXX\b/i;

/** 取り込み版の中身の基準。リード（画面と同じ checkLead）・仮置きの語・出典。問題が無ければ空配列 */
export function contentProblems(reader: ReaderCase): string[] {
  const problems: string[] = [];
  const parsed = ReaderCaseSchema.safeParse(reader);
  if (!parsed.success) return ['表示形式が不正'];
  const lead = reader.analysis.find((a) => a.item === 'HEADLINE');
  if (!lead) problems.push('リードが無い');
  else {
    const verdict = checkLead({ text: lead.text, basis: lead.basis }, reader);
    if (!verdict.ok) problems.push(`リード基準外:${verdict.problems.join(',')}`);
  }
  const texts: [string, string | undefined][] = [
    ...reader.facts.map((f) => [`事実:${f.id}`, f.text] as [string, string]),
    ...reader.metrics.map((m) => [`数値:${m.id}`, [m.label, m.basis].filter(Boolean).join(' ')] as [string, string]),
    ...reader.analysis.map((a) => [`推論:${a.item}`, [a.text, a.formula].filter(Boolean).join(' ')] as [string, string]),
  ];
  for (const [where, text] of texts) if (text && PLACEHOLDER.test(text)) problems.push(`仮置きの語:${where}`);
  if (!reader.sources.length) problems.push('出典が無い');
  if (citesRestrictedSource(reader)) problems.push('利用規約で表示できない出典');
  return problems;
}

export function readReflectState(path = REFLECT_FILE): ReflectState {
  if (!existsSync(path)) return { version: 1, cases: {} };
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as ReflectState;
  if (parsed?.version !== 1 || typeof parsed.cases !== 'object') throw new Error(`${path} の形式が不正`);
  return parsed;
}

/**
 * 読み手（loadReaders・select-finished・build-audit-input・prepare-catalog-release）が使う重ね書き。
 * reader あり → 取り込み版で置き換える。reader なし → その事例は旧版も出さない（null）。重ね書きに無い事例は undefined（従来どおり）。
 */
export function reflectedReader(state: ReflectState, id: string): ReaderCase | null | undefined {
  const entry = state.cases[id];
  if (!entry) return undefined;
  return entry.reader ?? null;
}

/** 推論ファイルに重ね書きを当てる。取り込み版の推論が旧い推論（reader-analysis.json）より常に勝つ */
export function withReflectedAnalysis(file: AnalysisFile, state: ReflectState): AnalysisFile {
  const out: AnalysisFile = { ...file };
  for (const [id, entry] of Object.entries(state.cases)) {
    if (entry.reader) out[id] = entry.reader.analysis as StoredAnalysis[];
    else delete out[id];
  }
  return out;
}

/** 画面の正本を作る時の判定（prepare-catalog-release）。SHOW 以外、または中身の基準に落ちる（手で書き換えた等）なら理由を返す */
export function reflectHoldReasons(state: ReflectState, id: string): string[] | null {
  const entry = state.cases[id];
  if (!entry) return null;
  if (entry.state !== 'SHOW' || !entry.reader) return entry.reasons.length ? entry.reasons : ['取り込み版が未確定'];
  const problems = contentProblems(entry.reader);
  if (problems.length) return problems;
  if (entryHash(entry) !== entry.hash) return ['反映記録の指紋が合わない（手で書き換えられた）'];
  return [];
}

export function entryHash(e: Pick<ReflectEntry, 'id' | 'state' | 'stage' | 'reasons' | 'importHash' | 'reader'>): string {
  return contentHash({ rule: REFLECT_RULE_VERSION, id: e.id, state: e.state, stage: e.stage ?? null, reasons: e.reasons, importHash: e.importHash, reader: e.reader ?? null });
}

/** 公開の関門。本番の実装は publication-evaluation の evaluateForRelease を手元の証拠で呼ぶ。テストでは差し替える */
export type ReleaseGate = (id: string, reader: ReaderCase) => Promise<{ publishable: boolean; reasons: string[] }>;

export interface ReflectOptions { ids?: string[]; dataDir: string; ledgerDir?: string; dryRun?: boolean; now?: Date }
export type ReflectOutcome = { id: string; result: 'UNCHANGED' | 'NEW' | 'REPLACED'; state: ReflectEntry['state']; stage?: ReflectStage; reasons: string[] };

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

/** 取り込みの対象になった事例（取り込み出力のある事例 ∪ 取り込み台帳に記録がある事例） */
export function importedIds(dataDir: string, ledgerDir: string): string[] {
  const ids = new Set<string>();
  const dir = `${dataDir}/case-import`;
  if (existsSync(dir)) for (const name of readdirSync(dir)) if (existsSync(`${dir}/${name}/import.json`)) ids.add(name);
  if (existsSync(ledgerDir)) {
    for (const f of readdirSync(ledgerDir).filter((x) => x.endsWith('.jsonl'))) {
      const id = f.replace(/\.jsonl$/, '');
      if (readCaseRecords(id, ledgerDir).some((r) => r.actor === IMPORT_ACTOR)) ids.add(id);
    }
  }
  return [...ids].sort();
}

/** 1事例ぶんの反映記録を作る。取り込みの記録が無ければ null（反映しない） */
export async function buildEntry(id: string, opts: { dataDir: string; ledgerDir: string }, gate: ReleaseGate): Promise<Omit<ReflectEntry, 'hash' | 'reflectedAt' | 'ruleVersion'> | null> {
  const last = readCaseRecords(id, opts.ledgerDir).filter((r) => r.stage === 'ANALYZE' && r.actor === IMPORT_ACTOR).at(-1);
  const dir = `${opts.dataDir}/case-import/${id}`;
  if (!last) return null;
  if (last.status === 'HOLD' || last.status === 'FAILED') {
    return { id, state: 'HOLD', stage: 'IMPORT', reasons: [`取り込み保留:${last.reasonCode ?? '理由なし'}${last.reasonText ? ` ${last.reasonText}` : ''}`], importHash: last.inputHash ?? null };
  }
  const manifest = existsSync(`${dir}/import.json`) ? readJson<{ inputHash?: string }>(`${dir}/import.json`) : null;
  if (!manifest || manifest.inputHash !== last.inputHash || !existsSync(`${dir}/reader.json`) || !existsSync(`${dir}/analysis.json`)) {
    return { id, state: 'HOLD', stage: 'IMPORT', reasons: ['取り込み出力が台帳の最新と合わない（古い出力が残っている／欠けている）'], importHash: last.inputHash ?? null };
  }
  const parsed = ReaderCaseSchema.safeParse({ ...readJson<ReaderCase>(`${dir}/reader.json`), analysis: readJson<StoredAnalysis[]>(`${dir}/analysis.json`) });
  if (!parsed.success) return { id, state: 'HOLD', stage: 'IMPORT', reasons: ['取り込み出力の形式が不正'], importHash: manifest.inputHash };
  const reader = parsed.data;
  const problems = contentProblems(reader);
  if (problems.length) return { id, state: 'HOLD', stage: 'CONTENT', reasons: problems, importHash: manifest.inputHash };
  const release = await gate(id, reader);
  if (!release.publishable) return { id, state: 'HOLD', stage: 'RELEASE', reasons: release.reasons, importHash: manifest.inputHash, reader };
  return { id, state: 'SHOW', reasons: [], importHash: manifest.inputHash, reader };
}

const stableState = (state: ReflectState): string => `${JSON.stringify({ version: 1, cases: Object.fromEntries(Object.entries(state.cases).sort(([a], [b]) => a.localeCompare(b))) }, null, 1)}\n`;

export async function reflectCases(opts: ReflectOptions, gate: ReleaseGate): Promise<{ outcomes: ReflectOutcome[]; state: ReflectState; changed: boolean }> {
  const ledgerDir = opts.ledgerDir ?? LEDGER_DIR;
  const statePath = `${opts.dataDir}/case-reflect.json`;
  const historyPath = `${opts.dataDir}/case-reflect-history.jsonl`;
  const state = readReflectState(statePath);
  const now = (opts.now ?? new Date()).toISOString();
  const outcomes: ReflectOutcome[] = [];
  const history: string[] = [];
  for (const id of opts.ids ?? importedIds(opts.dataDir, ledgerDir)) {
    const built = await buildEntry(id, { dataDir: opts.dataDir, ledgerDir }, gate);
    if (!built) continue; // 取り込みの記録が無い事例は触らない（既存の記録も消さない）
    const hash = entryHash(built);
    const prev = state.cases[id];
    if (prev?.hash === hash) { outcomes.push({ id, result: 'UNCHANGED', state: prev.state, stage: prev.stage, reasons: prev.reasons }); continue; }
    if (prev) history.push(JSON.stringify({ ...prev, replacedAt: now, replacedByHash: hash }));
    state.cases[id] = { ...built, ruleVersion: REFLECT_RULE_VERSION, hash, reflectedAt: now };
    outcomes.push({ id, result: prev ? 'REPLACED' : 'NEW', state: built.state, stage: built.stage, reasons: built.reasons });
  }
  const changed = outcomes.some((o) => o.result !== 'UNCHANGED');
  if (changed && !opts.dryRun) {
    if (history.length) appendFileSync(historyPath, `${history.join('\n')}\n`);
    writeFileSync(`${statePath}.tmp`, stableState(state));
    renameSync(`${statePath}.tmp`, statePath);
  }
  return { outcomes, state, changed };
}

/** いま公開目録に載っていて、反映で SHOW でなくなった事例（catalog:prepare の --withdrawals に渡す一覧） */
export function withdrawalsFor(state: ReflectState, publishedIds: Iterable<string>): string[] {
  return [...publishedIds].filter((id) => state.cases[id] && reflectHoldReasons(state, id)?.length).sort();
}

async function main() {
  const args = process.argv.slice(2);
  const val = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const dataDir = val('--data') ?? 'data';
  const ids = val('--ids')?.split(',').map((s) => s.trim()).filter(Boolean);
  const { loadEntities } = await import('./load-readers');
  const { loadPublicationInput, readPublicationAudits } = await import('./publication-inputs');
  const { evaluateForRelease, preparePublicationReader } = await import('./publication-evaluation');
  const { VERDICTS_FILE } = await import('./verify-lib');
  const verdicts = existsSync(VERDICTS_FILE) ? readJson<Record<string, never>>(VERDICTS_FILE) : {};
  const audits = readPublicationAudits();
  const wanted = ids ?? importedIds(dataDir, LEDGER_DIR);
  const entities = loadEntities(wanted);
  const gate: ReleaseGate = async (id, reader) => {
    const entity = entities.get(id);
    if (!entity) return { publishable: false, reasons: ['事業の記録（entities-index.json）に無い'] };
    const prepared = preparePublicationReader({ ...reader, analysis: [] }, verdicts[id], reader.analysis as StoredAnalysis[]);
    const input = await loadPublicationInput(entity, prepared.reader, verdicts[id]);
    return evaluateForRelease(input, audits[id], prepared.problems);
  };
  const { outcomes, state, changed } = await reflectCases({ ids: wanted, dataDir, dryRun: args.includes('--dry-run') }, gate);
  for (const o of outcomes) console.log(JSON.stringify(o));
  const published = existsSync(`${dataDir}/catalog-release.json`) ? Object.keys(readJson<{ details: Record<string, string> }>(`${dataDir}/catalog-release.json`).details) : [];
  const withdrawals = withdrawalsFor(state, published);
  console.log(JSON.stringify({ changed, show: Object.values(state.cases).filter((e) => e.state === 'SHOW').length, hold: Object.values(state.cases).filter((e) => e.state === 'HOLD').length, withdrawals }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main().catch((error) => { console.error(error); process.exitCode = 1; });
