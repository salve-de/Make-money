/**
 * 事例担当（case-content-rebuild）が作り直した事例を、経路の入力へ変換して取り込む。
 *
 * 入力（読み取りのみ。書き換えない）: <src>/out/<id>.json
 *   { id, status, incompleteReasons, lead, reader:{sources,facts,metrics,unknowns,summaryFactId,analysis}, removedPlaceholders, followUps }
 * 出力: <data>/case-import/<id>/（git に入れない。.gitignore 参照）
 *   reader.json        出典・事実・数値・未調査（reader の analysis を除いた部分。スキーマに通したもの）
 *   analysis.json      reader-analysis.json 相当（その事例の推論の一覧。受け入れ検査 checkCase を通ったものだけ）
 *   audit-input.json   審査受領書の入力（build-audit-input.ts が作る 1 事例ぶんと同じ形）。入力指紋 publicationHash 付き
 *   import.json        取り込みの記録（入力指紋・規則版・門の結果・落とした項目）
 * 台帳: ANALYZE 段階に、取り込めたら DONE、取り込まなかったら HOLD（理由つき）を追記する。
 *
 * 再実行の規則: 入力指紋（status・lead・reader・規則版）が同じなら何もしない（台帳にも足さない）。
 * 指紋が変わった時だけ作り直す。READY 以外（INCOMPLETE 等）は通さず、台帳に保留と理由を1回だけ残す。
 *
 * 使い方: node --import tsx scripts/reader-case/import-case-rebuild.ts [--ids a,b] [--src <dir>] [--data data] [--no-gate] [--dry-run]
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ReaderCaseSchema, UNKNOWN_ITEMS, type ReaderCase } from '../../src/shared/reader-case';
import { evidenceNumbers, numbersIn, numbersMissingFrom } from '../../src/shared/number-evidence';
import { auditEvidence, checkCase, type StoredAnalysis } from './analysis-lib';
import { appendRecord, LEDGER_DIR, readCaseRecords, type ReasonCode } from './ledger';
import { auditSnapshot, contentHash, publicationHash, type PublicationInput } from './publication-evaluation';

export const IMPORT_RULE_VERSION = 'case-rebuild-import-v1';
export const IMPORT_ACTOR = 'import-case-rebuild';
export const DEFAULT_SRC = '/Volumes/SS/Worktrees/Make-Money/case-content-rebuild/data/case-rebuild';
export const DEFAULT_IDS = [
  'ent_snowhousestudio_1fa416086829',
  'ent_bazzly_c5129a918174',
  'ent_rfrcui_64e924ac',
  'ent_lowtechguyscom_42a06677420f',
  'ent_practicaltypographycom_e9aa6bc94ccf',
  'ent_asmrvideo_b03209afa1ea',
];

export interface RebuildOut {
  id: string;
  status: string;
  incompleteReasons?: string[];
  lead?: string;
  reader: {
    sources: unknown[];
    facts: unknown[];
    metrics: unknown[];
    unknowns?: string[];
    summaryFactId?: string;
    analysis?: { item?: string; text?: string; basis?: string[]; formula?: string; confidence?: string }[];
  };
  removedPlaceholders?: unknown[];
  followUps?: unknown[];
}

/** 入力指紋。変換結果に影響する欄だけ（followUps・removedPlaceholders は記録用なので含めない） */
export function importFingerprint(out: RebuildOut): string {
  return contentHash({ rule: IMPORT_RULE_VERSION, id: out.id, status: out.status, reasons: out.incompleteReasons ?? [], lead: out.lead ?? null, reader: out.reader });
}

export interface Converted {
  reader: ReaderCase;
  /** 機械的に直した形式のずれ（意味を変えない直しだけ） */
  repairs: { where: string; from: string; to: string }[];
  analysis: StoredAnalysis[];
  dropped: { item: string; reason: string; text: string }[];
  droppedUnknowns: string[];
}
export type ConvertResult = { ok: true; value: Converted } | { ok: false; problem: string };

/** 作り直した事例を経路の形へ。reader の形が不正なら ok:false。confidence は引き継がない（廃止）。 */
export function convertCase(out: RebuildOut): ConvertResult {
  const repairs: Converted['repairs'] = [];
  // 意味を変えない形式の直しだけ行う: 通貨が空 → 欄を外す、通貨欄に単位（人・社 等）が入っている → unit へ移す
  const metrics = (out.reader.metrics as Record<string, unknown>[]).map((m) => {
    const c = m.currency;
    if (typeof c !== 'string' || /^[A-Z]{3}$/.test(c)) return m;
    const { currency: _drop, ...rest } = m;
    void _drop;
    if (c.trim() && rest.unit === undefined) { repairs.push({ where: `metrics.${String(m.id)}.currency`, from: c, to: 'unit' }); return { ...rest, unit: c.trim() }; }
    repairs.push({ where: `metrics.${String(m.id)}.currency`, from: c, to: '(外した)' });
    return rest;
  });
  const unknowns = (out.reader.unknowns ?? []).filter((u): u is (typeof UNKNOWN_ITEMS)[number] => (UNKNOWN_ITEMS as readonly string[]).includes(u));
  const droppedUnknowns = (out.reader.unknowns ?? []).filter((u) => !(UNKNOWN_ITEMS as readonly string[]).includes(u));
  const parsed = ReaderCaseSchema.safeParse({
    sources: out.reader.sources, facts: out.reader.facts, metrics, unknowns,
    ...(out.reader.summaryFactId ? { summaryFactId: out.reader.summaryFactId } : {}), analysis: [],
  });
  if (!parsed.success) return { ok: false, problem: `reader の形式が不正: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')} ${i.message}`).join(' / ')}` };
  const reader = parsed.data;
  // 推定（ESTIMATE）は「式で数字を導いたもの」だけ。式欄が出典の説明（数字の計算でない）なら事実の言い換え
  const isCalculation = (f?: string) => !!f && numbersIn(f).filter((n) => !(Number.isInteger(n) && n < 10)).length >= 2 && /[×÷+＋−=＝*/]|[0-9]\s*-\s*[0-9]/.test(f);
  const raw = (out.reader.analysis ?? []).map((a) => {
    const basis = a.basis ?? [];
    // 式の無い文の数字がすべて basis の事実・数値にある時だけ、「出典に載っている値」と式欄に書く（applyAudit と同じ作法）。出典に無い数字は式が無いまま number-without-formula で落ちる
    const fromSource = !a.formula?.trim() && basis.length > 0 && numbersMissingFrom(a.text ?? '', evidenceNumbers(reader.facts, reader.metrics, basis)).length === 0;
    return {
      item: a.item, text: a.text, basis, ...(a.formula?.trim() ? { formula: a.formula } : fromSource ? { formula: '数字は出典に載っている値' } : {}),
      presentation: isCalculation(a.formula) ? 'ESTIMATE' : 'FACT_SUMMARY',
    };
  });
  const { kept, dropped } = checkCase(out.id, raw, reader, { strictNumbers: true });
  return { ok: true, value: { reader, repairs, analysis: kept, dropped: dropped.map((d) => ({ item: d.item, reason: d.reason, text: d.text })), droppedUnknowns } };
}

export interface GateResult { available: boolean; errors: { code: string; where: string; detail: string }[] }
export type Gate = (out: RebuildOut) => Promise<GateResult> | GateResult;

/** case-content-rebuild の品質検査 check-case.mjs の checkCase を呼ぶ門。ファイルが無ければ available:false（記録のみ） */
export function makeCheckCaseGate(srcDir: string): Gate {
  const root = `${srcDir}/../..`;
  const modulePath = `${root}/scripts/case-rebuild/check-case.mjs`;
  return async (out) => {
    if (!existsSync(modulePath)) return { available: false, errors: [] };
    try {
      const mod = (await import(pathToFileURL(modulePath).href)) as { checkCase: (o: unknown, pack: unknown) => { issues: { code: string; where: string; detail: string; level: string }[] } };
      const packPath = `${srcDir}/packs/${out.id}.json`;
      const pack = existsSync(packPath) ? JSON.parse(readFileSync(packPath, 'utf8')) : null;
      const { issues } = mod.checkCase(out, pack);
      return { available: true, errors: issues.filter((i) => i.level === 'ERROR').map(({ code, where, detail }) => ({ code, where, detail })) };
    } catch { return { available: false, errors: [] }; }
  };
}

export interface ImportDeps {
  /** 審査入力の材料を作る（本番は loadPublicationInput）。テストでは差し替える */
  buildPublicationInput: (id: string, reader: ReaderCase) => Promise<PublicationInput>;
  gate?: Gate;
}

export interface ImportOptions { ids: string[]; srcDir: string; dataDir: string; ledgerDir?: string; dryRun?: boolean }
export type ImportOutcome =
  | { id: string; result: 'IMPORTED'; inputHash: string; kept: number; dropped: number }
  | { id: string; result: 'SKIPPED_SAME_INPUT'; inputHash: string }
  | { id: string; result: 'HELD'; inputHash?: string; reasonCode: ReasonCode; reasonText: string }
  | { id: string; result: 'WOULD_IMPORT'; inputHash: string };

const writeJson = (path: string, value: unknown) => { writeFileSync(`${path}.tmp`, `${JSON.stringify(value, null, 1)}\n`); renameSync(`${path}.tmp`, path); };

/** 台帳の最後の ANALYZE 記録が、同じ入力・同じ結果なら true（再実行で足さない） */
function alreadyRecorded(id: string, inputHash: string, ledgerDir: string, hold?: { reasonCode: ReasonCode; reasonText: string }): boolean {
  const last = readCaseRecords(id, ledgerDir).filter((r) => r.stage === 'ANALYZE' && r.actor === IMPORT_ACTOR).at(-1);
  if (!last || last.inputHash !== inputHash) return false;
  if (hold) return last.status === 'HOLD' && last.reasonCode === hold.reasonCode && last.reasonText === hold.reasonText;
  return last.status === 'DONE' || last.status === 'SKIPPED_SAME_INPUT';
}

export async function importCases(opts: ImportOptions, deps: ImportDeps): Promise<ImportOutcome[]> {
  const ledgerDir = opts.ledgerDir ?? LEDGER_DIR;
  const outcomes: ImportOutcome[] = [];
  for (const id of opts.ids) {
    const file = `${opts.srcDir}/out/${id}.json`;
    const hold = (inputHash: string | undefined, reasonCode: ReasonCode, reasonText: string, nextAction: string): ImportOutcome => {
      if (!opts.dryRun && !(inputHash && alreadyRecorded(id, inputHash, ledgerDir, { reasonCode, reasonText }))) {
        appendRecord({ caseId: id, stage: 'ANALYZE', status: 'HOLD', reasonCode, reasonText, nextAction, actor: IMPORT_ACTOR, inputHash, ruleVersion: IMPORT_RULE_VERSION, finishedAt: new Date().toISOString() }, ledgerDir);
      }
      return { id, result: 'HELD', inputHash, reasonCode, reasonText };
    };
    if (!existsSync(file)) { outcomes.push(hold(undefined, 'THIN', `作り直しの出力が無い: ${file}`, '事例担当の出力を待つ')); continue; }
    let out: RebuildOut;
    try { out = JSON.parse(readFileSync(file, 'utf8')) as RebuildOut; } catch { outcomes.push(hold(undefined, 'ANALYSIS_REJECTED', `作り直しの出力が JSON として読めない: ${id}`, '事例担当に出力の作り直しを頼む')); continue; }
    if (out.id !== id) { outcomes.push(hold(undefined, 'ANALYSIS_REJECTED', `出力の id（${out.id}）がファイル名（${id}）と違う`, '事例担当に確認')); continue; }
    const inputHash = importFingerprint(out);
    if (out.status !== 'READY') {
      outcomes.push(hold(inputHash, 'THIN', `status=${out.status}: ${(out.incompleteReasons ?? []).join(' / ') || '理由の記載なし'}`, '追加調査（followUps）の結果を待つ'));
      continue;
    }
    const manifestPath = `${opts.dataDir}/case-import/${id}/import.json`;
    const prevManifest = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as { inputHash?: string }) : undefined;
    if (prevManifest?.inputHash === inputHash && alreadyRecorded(id, inputHash, ledgerDir)) { outcomes.push({ id, result: 'SKIPPED_SAME_INPUT', inputHash }); continue; }
    const converted = convertCase(out);
    if (!converted.ok) { outcomes.push(hold(inputHash, 'ANALYSIS_REJECTED', converted.problem, '事例担当に reader の形式修正を頼む')); continue; }
    const gate = deps.gate ? await deps.gate(out) : { available: false, errors: [] };
    if (gate.errors.length) {
      const lead = gate.errors.some((e) => e.code === 'LEAD');
      outcomes.push(hold(inputHash, lead ? 'LEAD_NOT_PASSED' : 'ANALYSIS_REJECTED', `品質検査に不合格: ${gate.errors.slice(0, 3).map((e) => `[${e.code}] ${e.where}`).join(' / ')}`, '事例担当に直しを頼む'));
      continue;
    }
    if (opts.dryRun) { outcomes.push({ id, result: 'WOULD_IMPORT', inputHash }); continue; }
    const { reader, analysis, dropped, droppedUnknowns, repairs } = converted.value;
    const withAnalysis: ReaderCase = { ...reader, analysis };
    const input = await deps.buildPublicationInput(id, withAnalysis);
    const snapshot = auditSnapshot(input);
    const auditCase = { entityId: id, ...auditEvidence(withAnalysis, snapshot.sources), analysis, identity: snapshot.identity, media: snapshot.media, snapshot, publicationHash: publicationHash(input) };
    const dir = `${opts.dataDir}/case-import/${id}`;
    mkdirSync(dir, { recursive: true });
    writeJson(`${dir}/reader.json`, reader);
    writeJson(`${dir}/analysis.json`, analysis);
    writeJson(`${dir}/audit-input.json`, auditCase);
    writeJson(manifestPath, {
      id, inputHash, ruleVersion: IMPORT_RULE_VERSION, importedAt: new Date().toISOString(), publicationHash: auditCase.publicationHash,
      lead: out.lead ?? null, items: { kept: analysis.map((a) => a.item), dropped }, droppedUnknowns, repairs,
      gate: gate.available ? 'PASSED' : 'NOT_RUN（check-case.mjs が無い／呼べない。記録のみ）',
      followUps: out.followUps ?? [], removedPlaceholders: out.removedPlaceholders ?? [],
    });
    appendRecord({ caseId: id, stage: 'ANALYZE', status: 'DONE', actor: IMPORT_ACTOR, inputHash, ruleVersion: IMPORT_RULE_VERSION, finishedAt: new Date().toISOString(), reasonText: `取り込み: 推論 ${analysis.length} 件（落とした ${dropped.length} 件）` }, ledgerDir);
    outcomes.push({ id, result: 'IMPORTED', inputHash, kept: analysis.length, dropped: dropped.length });
  }
  return outcomes;
}

async function main() {
  const args = process.argv.slice(2);
  const val = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const srcDir = val('--src') ?? process.env.CASE_REBUILD_DIR ?? DEFAULT_SRC;
  const ids = (val('--ids') ?? DEFAULT_IDS.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
  const { loadEntities } = await import('./load-readers');
  const { loadPublicationInput } = await import('./publication-inputs');
  const buildPublicationInput: ImportDeps['buildPublicationInput'] = async (id, reader) => {
    const entity = loadEntities([id]).get(id);
    if (!entity) throw new Error(`${id}: data/entities-index.json に事業の記録が無い（審査入力に使う identity が作れない）`);
    return loadPublicationInput(entity, reader, undefined);
  };
  const outcomes = await importCases(
    { ids, srcDir, dataDir: val('--data') ?? 'data', dryRun: args.includes('--dry-run') },
    { buildPublicationInput, gate: args.includes('--no-gate') ? undefined : makeCheckCaseGate(srcDir) },
  );
  for (const o of outcomes) console.log(JSON.stringify(o));
  if (outcomes.some((o) => o.result === 'HELD')) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main().catch((error) => { console.error(error); process.exitCode = 1; });
