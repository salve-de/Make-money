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
import { LEAD_REWRITE_PREFIX } from '../../src/shared/display-contract';
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
  /** 審査で直した推論（受領書の入力指紋が取り込み版と一致した時だけ）。表示はこちら、審査の入力と合流は取り込み版の推論を使う */
  approvedAnalysis?: StoredAnalysis[];
  /** 外して表示する項目（出典・事実・数値・推論）。1項目の問題で事例全体を止めないための記録。診断で収集側へ返す */
  hidden?: string[];
  ruleVersion: string;
  /** この記録の指紋（時刻を含まない）。同じなら書き換えない */
  hash: string;
  reflectedAt: string;
}
export interface ReflectState { version: 1; cases: Record<string, ReflectEntry> }

const PLACEHOLDER = /仮置|仮の(値|数字|数値|金額)|ダミー|プレースホルダ|placeholder|\bTBD\b|\bTODO\b|\bXXX\b/i;

/**
 * 1項目だけの問題は、その項目を外して残りで組む（オーナー指示 2026-10-06: 1項目の欠け・1件の出典の失敗で全体を止めない）。
 * - 仮置きの語を含む事実・数値・推論 → その項目を外す（根拠のない数字は出さない）
 * - 使えない出典（利用条件・本文が取れない） → その出典と、それを根拠にする事実・数値・推論を外す
 * 外した項目は hidden に残し、診断で収集側（別の出典の候補）へ戻す。リード（HEADLINE）が外れたら contentProblems が「リードを書き直す」を出す
 */
export function withoutItems(reader: ReaderCase, drop: { sources?: string[]; claims?: string[]; placeholders?: boolean }): { reader: ReaderCase; hidden: string[] } {
  const hidden: string[] = [];
  const sources = new Set(drop.sources ?? []);
  const claims = new Set(drop.claims ?? []);
  const ph = (t?: string) => !!drop.placeholders && !!t && PLACEHOLDER.test(t);
  for (const s of reader.sources) if (sources.has(s.id)) hidden.push(`出典:${s.id}:${s.url}`);
  const facts = reader.facts.filter((f) => {
    const out = sources.has(f.sourceId) || claims.has(f.id) || ph(f.text);
    if (out) hidden.push(`事実:${f.id}${ph(f.text) ? ':仮置きの語' : ''}`);
    return !out;
  });
  const metrics = reader.metrics.filter((m) => {
    const out = sources.has(m.sourceId) || claims.has(m.id) || ph([m.label, m.basis].filter(Boolean).join(' '));
    if (out) hidden.push(`数値:${m.id}`);
    return !out;
  });
  const gone = new Set([...reader.facts, ...reader.metrics].map((c) => c.id).filter((id) => !facts.some((f) => f.id === id) && !metrics.some((m) => m.id === id)));
  const analysis = reader.analysis.filter((a) => {
    const out = (a.basis ?? []).some((b) => gone.has(b)) || ph([a.text, a.formula].filter(Boolean).join(' '));
    if (out) hidden.push(`推論:${a.item}`);
    return !out;
  });
  const summaryFactId = reader.summaryFactId && facts.some((f) => f.id === reader.summaryFactId) ? reader.summaryFactId : undefined;
  const next = { ...reader, sources: reader.sources.filter((s) => !sources.has(s.id)), facts, metrics, analysis } as ReaderCase;
  if (summaryFactId) next.summaryFactId = summaryFactId; else delete (next as { summaryFactId?: string }).summaryFactId;
  return { reader: next, hidden };
}

/** 取り込み版の中身の基準（事例全体に関わるものだけ）。リード（画面と同じ checkLead）・出典・禁止された出典。問題が無ければ空配列 */
export function contentProblems(reader: ReaderCase): string[] {
  const problems: string[] = [];
  const parsed = ReaderCaseSchema.safeParse(reader);
  if (!parsed.success) return ['表示形式が不正'];
  const lead = reader.analysis.find((a) => a.item === 'HEADLINE');
  if (!lead) problems.push(`${LEAD_REWRITE_PREFIX}:リードが無い`);
  else {
    const verdict = checkLead({ text: lead.text, basis: lead.basis }, reader);
    if (!verdict.ok) problems.push(`${LEAD_REWRITE_PREFIX}:リード基準外:${verdict.problems.join(',')}`);
  }
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
  if (!entry.reader) return null;
  return entry.approvedAnalysis ? { ...entry.reader, analysis: entry.approvedAnalysis } : entry.reader;
}

/**
 * 推論ファイルに重ね書きを当てる。取り込み版の推論が旧い推論（reader-analysis.json）より常に勝つ。
 * stage='display'（既定。select-finished・prepare-catalog-release）は審査で直した推論（採用済みなら reader-analysis.json の今の文）を、
 * stage='audit'（build-audit-input・merge-analysis）は審査に出した取り込み版の推論を返す。後者で受領書の入力指紋が毎回同じになる
 */
export function withReflectedAnalysis(file: AnalysisFile, state: ReflectState, stage: 'display' | 'audit' = 'display'): AnalysisFile {
  const out: AnalysisFile = { ...file };
  for (const [id, entry] of Object.entries(state.cases)) {
    // 審査の直しを採用済みの事例（approvedAnalysis あり）は、その正本 reader-analysis.json の今の文を出す。採用の後に言い回しを直しても、
    // 反映をやり直さずに画面の候補へ届く。直した項目は項目ごとの監査記録と合わないので、差分監査を通るまでその項目だけ隠れる
    if (entry.reader) out[id] = (stage === 'display' && entry.approvedAnalysis ? file[id] ?? entry.approvedAnalysis : entry.reader.analysis) as StoredAnalysis[];
    else delete out[id];
  }
  return out;
}

/** 画面の正本を作る時の判定（prepare-catalog-release）。SHOW 以外、または中身の基準に落ちる（手で書き換えた等）なら理由を返す */
export function reflectHoldReasons(state: ReflectState, id: string): string[] | null {
  const entry = state.cases[id];
  if (!entry) return null;
  if (entry.state !== 'SHOW' || !entry.reader) return entry.reasons.length ? entry.reasons : ['取り込み版が未確定'];
  const problems = contentProblems(reflectedReader(state, id)!);
  if (problems.length) return problems;
  if (entryHash(entry) !== entry.hash) return ['反映記録の指紋が合わない（手で書き換えられた）'];
  return [];
}

export function entryHash(e: Pick<ReflectEntry, 'id' | 'state' | 'stage' | 'reasons' | 'importHash' | 'reader' | 'approvedAnalysis' | 'hidden'>): string {
  return contentHash({ rule: REFLECT_RULE_VERSION, id: e.id, state: e.state, stage: e.stage ?? null, reasons: e.reasons, importHash: e.importHash, reader: e.reader ?? null, ...(e.approvedAnalysis ? { approvedAnalysis: e.approvedAnalysis } : {}), ...(e.hidden?.length ? { hidden: e.hidden } : {}) });
}

/** 公開の関門。本番の実装は publication-evaluation の evaluateForRelease を手元の証拠で呼ぶ。テストでは差し替える */
/**
 * analysis を返した時は、その推論（審査で直したもの）を取り込み版の推論の代わりに採用する。
 * 本番の関門は「受領書の入力指紋＝取り込み版の推論で組んだ入力の指紋」の時だけ返す（古い版の推論を拾わない）。
 */
export type ReleaseGate = (id: string, reader: ReaderCase) => Promise<{ publishable: boolean; reasons: string[]; analysis?: StoredAnalysis[] }>;

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
  if (!parsed.success) return { id, state: 'HOLD', stage: 'IMPORT', reasons: ['取り込み出力の形式が不正'], importHash: manifest.inputHash ?? null };
  return finishEntry(id, parsed.data, manifest.inputHash ?? null, [], gate);
}

/**
 * 取り込み版の事例（reader）に、中身の基準と公開の関門を当てて反映記録を作る。取り込み出力（case-import）からも、
 * 反映記録に残っている取り込み版（rebuildEntryFromState）からも、同じ手順で作る。関門は変えない（受領書が審査していない版は SHOW にならない）。
 */
async function finishEntry(id: string, base: ReaderCase, importHash: string | null, priorHidden: string[], gate: ReleaseGate): Promise<Omit<ReflectEntry, 'hash' | 'reflectedAt' | 'ruleVersion'>> {
  // 仮置きの語を含む項目は外す（根拠のない数字は出さない）。事例全体は止めない
  // 利用規約で表示できない出典（eBiz Facts 等）も、その出典と根拠にする項目だけ外す
  const restricted = base.sources.filter((src) => citesRestrictedSource({ sources: [src] })).map((src) => src.id);
  const first = withoutItems(base, { placeholders: true, sources: restricted });
  let reader = first.reader;
  let hidden = [...new Set([...priorHidden, ...first.hidden])];
  const problems = contentProblems(reader);
  const keepHidden = () => (hidden.length ? { hidden } : {});
  if (problems.length) return { id, state: 'HOLD', stage: 'CONTENT', reasons: problems, importHash, ...keepHidden() };
  let release = await gate(id, reader);
  // 使えない出典（利用条件・本文が取れない）と根拠の合わない主張は、その出典・主張だけ外して関門をやり直す（最大2回）
  for (let round = 0; round < 2 && !release.publishable; round++) {
    const sources = release.reasons.flatMap((r) => /^(利用条件|出典本文):(s[^ ]+)$/.exec(r)?.[2] ?? []);
    const claims = release.reasons.flatMap((r) => /^根拠の不一致:(.+)$/.exec(r)?.[1] ?? []);
    if (!sources.length && !claims.length) break;
    const trimmed = withoutItems(reader, { sources, claims });
    if (!trimmed.reader.sources.length) break;
    reader = trimmed.reader;
    hidden = [...new Set([...hidden, ...trimmed.hidden])];
    const after = contentProblems(reader);
    if (after.length) return { id, state: 'HOLD', stage: 'CONTENT', reasons: after, importHash, reader, ...keepHidden() };
    release = await gate(id, reader);
  }
  const approved = release.analysis ? { approvedAnalysis: release.analysis } : {};
  if (!release.publishable) return { id, state: 'HOLD', stage: 'RELEASE', reasons: release.reasons, importHash, reader, ...approved, ...keepHidden() };
  return { id, state: 'SHOW', reasons: [], importHash, reader, ...approved, ...keepHidden() };
}

/**
 * 取り込み出力（data/case-import/）が手元に無い事例を、反映記録に残っている取り込み版から作り直す。
 * 監査・訂正のあとで、審査で直した推論（reader-analysis.json）を表示版へ届ける時に使う（人が付き添わず回すため）。
 * 取り込み版は変えない（reader.analysis は審査の入力のまま）。変わるのは関門の判定と、審査で直した推論（approvedAnalysis）だけ。
 */
export async function rebuildEntryFromState(prev: ReflectEntry, gate: ReleaseGate): Promise<Omit<ReflectEntry, 'hash' | 'reflectedAt' | 'ruleVersion'> | null> {
  if (!prev.reader) return null;
  return finishEntry(prev.id, prev.reader, prev.importHash, prev.hidden ?? [], gate);
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
  for (const id of opts.ids ?? [...new Set([...importedIds(opts.dataDir, ledgerDir), ...Object.keys(state.cases)])].sort()) {
    const prev = state.cases[id];
    let built = await buildEntry(id, { dataDir: opts.dataDir, ledgerDir }, gate);
    // 取り込み出力が手元に無い（取り込みの記録が無い、または出力ファイルが欠けている）事例は、反映記録の取り込み版から作り直す
    const importDir = `${opts.dataDir}/case-import/${id}`;
    // import.json だけ残って reader.json / analysis.json が欠けている（途中までのコピー・片付け）は、黙って戻さず失敗にする
    if (existsSync(`${importDir}/import.json`) && (!existsSync(`${importDir}/reader.json`) || !existsSync(`${importDir}/analysis.json`))) {
      throw new Error(`取り込み出力が欠けている（${id}: import.json はあるが reader.json か analysis.json が無い）。出力を取り直すか、${importDir} ごと消して反映記録の取り込み版から作り直す`);
    }
    const outputMissing = !existsSync(`${importDir}/import.json`);
    if (prev?.reader && outputMissing && (!built || (built.stage === 'IMPORT' && built.reasons[0]?.startsWith('取り込み出力が台帳の最新と合わない')))) built = await rebuildEntryFromState(prev, gate);
    if (!built) continue; // 取り込みの記録が無く、反映記録の取り込み版も無い事例は触らない（既存の記録も消さない）
    const hash = entryHash(built);
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
  const { evaluateForRelease, preparePublicationReader, contentHash: hashOf } = await import('./publication-evaluation');
  const { ANALYSIS_FILE } = await import('./analysis-lib');
  const analysisFile = existsSync(ANALYSIS_FILE) ? readJson<AnalysisFile>(ANALYSIS_FILE) : {};
  const { VERDICTS_FILE } = await import('./verify-lib');
  const verdicts = existsSync(VERDICTS_FILE) ? readJson<Record<string, never>>(VERDICTS_FILE) : {};
  const audits = readPublicationAudits();
  const wanted = ids ?? [...new Set([...importedIds(dataDir, LEDGER_DIR), ...Object.keys(readReflectState(`${dataDir}/case-reflect.json`).cases)])].sort();
  const entities = loadEntities(wanted);
  const gate: ReleaseGate = async (id, reader) => {
    const entity = entities.get(id);
    if (!entity) return { publishable: false, reasons: ['事業の記録（entities-index.json）に無い'] };
    const inputWith = async (analysis: StoredAnalysis[]) => {
      const prepared = preparePublicationReader({ ...reader, analysis: [] }, verdicts[id], analysis);
      return { input: await loadPublicationInput(entity, prepared.reader, verdicts[id]), problems: prepared.problems };
    };
    const imported = await inputWith(reader.analysis as StoredAnalysis[]);
    const receipt = audits[id];
    const approved = analysisFile[id];
    // 監査記録がこの取り込み版の推論一式を全体監査したもので、審査の直しを当てた推論が reader-analysis.json にあれば、それを採用する。
    // 採用した後に reader-analysis.json の文を直した項目は、項目ごとの監査記録と合わないので、その項目だけが画面から隠れる
    if (receipt && approved && receipt.baseAnalysisHash === hashOf(imported.input.reader.analysis)) {
      const audited = await inputWith(approved);
      const result = evaluateForRelease(audited.input, receipt, audited.problems);
      return { ...result, analysis: approved };
    }
    return evaluateForRelease(imported.input, receipt, imported.problems);
  };
  const { outcomes, state, changed } = await reflectCases({ ids: wanted, dataDir, dryRun: args.includes('--dry-run') }, gate);
  for (const o of outcomes) console.log(JSON.stringify(o));
  const published = existsSync(`${dataDir}/catalog-release.json`) ? Object.keys(readJson<{ details: Record<string, string> }>(`${dataDir}/catalog-release.json`).details) : [];
  const withdrawals = withdrawalsFor(state, published);
  console.log(JSON.stringify({ changed, show: Object.values(state.cases).filter((e) => e.state === 'SHOW').length, hold: Object.values(state.cases).filter((e) => e.state === 'HOLD').length, withdrawals }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main().catch((error) => { console.error(error); process.exitCode = 1; });
