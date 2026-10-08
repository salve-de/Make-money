import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { parseFinancialEntitiesResiliently } from '../src/shared/financial-entity-schema';
import { normalizeFinancialEntity } from '../src/shared/financial-integrity';
import { reconcileFinancialEntity } from '../src/platform/data/financial-reconciliation';
import { INSTITUTIONAL_ENTITY_ALIASES } from '../src/platform/data/mockLedgerData';
import { isPublishableEntity, publicEntity, publicSummaryEntity } from '../src/lib/company-access/public-entity';
import { collectApprovalCandidateIds } from '../src/lib/company-access/approval-candidates';
import { projectReaderCase, validateReader, type UnboundLine, type ReviewItem } from '../src/lib/company-access/reader-case-projection';
import { applyVerdicts } from '../src/lib/company-access/reader-verdicts';
import type { VerdictsFile } from './reader-case/verify-lib';
import { citesRestrictedSource, reflectAnalysis, missingRequired, REQUIRED_ITEMS, type AnalysisFile } from './reader-case/analysis-lib';
import { computeDossierContentHash, getDossierStoragePath, stringifyDeterministic } from '../src/lib/foundation/dossier-projection';
import { deriveDiscoveryDataset } from '../src/features/discover';
import { findTemplateViolations, MIN_REPEAT } from './architecture/template-prose-lib.mjs';
import type { FinancialEntity } from '../src/shared/terminal';
import { evaluateForRelease, preparePublicationReader, withoutUnaudited } from './reader-case/publication-evaluation';
import { loadPublicationInput, readPublicationAudits } from './reader-case/publication-inputs';
import { checkWithdrawals, planRelease } from './reader-case/release-plan';
import { readReflectState, reflectHoldReasons, reflectedReader, withReflectedAnalysis } from './reader-case/case-reflect';
import { rightsOptions } from './reader-case/load-readers';
import { displayForEntity, DISPLAY_SOURCE_FILE_NAMES, type DisplaySourceFiles } from '../src/shared/reader-display';
import { heldChapterRemovals, readHeld, withoutHeldClaims, withoutHeldDisplay, type HeldRemoval } from './reader-case/held-items';
import { manifestObjectKey, type ReleasePointer } from '../src/shared/catalog-manifest';

// 取り下げた旧表示（出典の無い数字や作文）は内部の監査記録。公開版には入れない
function withoutWithdrawnSnapshot(entity: FinancialEntity): FinancialEntity {
  if (!entity.reaudit?.legacyDisplaySnapshot) return entity;
  const reaudit = { ...entity.reaudit };
  delete reaudit.legacyDisplaySnapshot;
  return { ...entity, reaudit };
}

async function main() {
// --dry-run: 何も書かずに「追加・訂正・除外」の計画だけ出す。--previous: 比べる相手の目録（既定は今の data/catalog-release.json）
// --withdrawals: 除外してよい事例IDの明示一覧。計画の除外と完全に一致しない限り、目録は書き換えない（黙って巻き戻らない）
const dryRun = process.argv.includes('--dry-run');
const flagValue = (name: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const previous = JSON.parse(await readFile(flagValue('--previous') ?? 'data/catalog-release.json', 'utf8')) as { details: Record<string, string>; coreDetails?: Record<string, string> };
const withdrawalsPath = flagValue('--withdrawals');
// --changed: 差分公開。この一覧の事例だけを受領書つきで評価し直す。いま公開中でこの一覧に無い事例は、受領書の再評価をせずに引き継ぐ。
// ただし引き継いだ事例の中身（詳細の指紋）が公開中と1文字でも違えば止める（審査を経ない書き換えを出さない）
const changedPath = flagValue('--changed');
const changedIds = changedPath
  ? new Set((await readFile(changedPath, 'utf8')).split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !x.startsWith('#')))
  : null;
const carried = (id: string) => changedIds !== null && !changedIds.has(id) && id in previous.details;
const authorizedWithdrawals = withdrawalsPath
  ? new Set((await readFile(withdrawalsPath, 'utf8')).split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !x.startsWith('#')))
  : new Set<string>();
// 出典本文・画像台帳などの手元の証拠（gitに入れない）は公開の作業場所や CI には無い。照合だけの実行（--check / --artifacts-only）では
// 目録に載った事例をそのまま信頼し、証拠を読んで受領書を再評価するのは目録を作る実行と --dry-run だけにする
const verifyOnly = process.argv.includes('--check') || process.argv.includes('--artifacts-only');
const audited = verifyOnly ? {} : readPublicationAudits();
const source = await readFile('data/entities-index.json');
const sourceHash = createHash('sha256').update(source).digest('hex');
const raw: unknown = JSON.parse(source.toString('utf8'));
// 公開版を作る前に、3件以上で使い回された作文（テンプレ文）が残っていないか確認する（除外リストは template-prose-lib.mjs）
const templateViolations = findTemplateViolations(raw as Record<string, unknown>[]);
if (templateViolations.length) {
  const top = templateViolations.slice(0, 5).map((v) => `${v.count}件 [${v.field}] ${v.sentence.slice(0, 60)}`).join('\n  ');
  throw new Error(`Catalog release blocked: ${templateViolations.length} sentences are reused by ${MIN_REPEAT}+ records (template prose). Run node --import tsx scripts/reaudit/demote-template-prose.ts\n  ${top}`);
}
const parsed = parseFinancialEntitiesResiliently(raw);
if (parsed.invalidEntities.length) throw new Error('Catalog release contains invalid records');
const publishable = parsed.validEntities
  .filter((entity) => !INSTITUTIONAL_ENTITY_ALIASES[entity.id])
  .map(reconcileFinancialEntity).map(normalizeFinancialEntity).filter(isPublishableEntity)
  .map(withoutWithdrawnSnapshot);
// 画面が読む中身（ReaderCase）を全件に付ける。スキーマを通らない事例と、事実2件以下で数字も無い事例は公開しない
const rawById = new Map<string, Record<string, unknown>>();
for (const r of raw as Record<string, unknown>[]) if (typeof r?.id === 'string') rawById.set(r.id, r);
// 出典本文との照合結果。判定が無い主張は出さず、1件も照合していない事例は公開しない（withheld.unverified）
let verdicts: VerdictsFile = {};
try { verdicts = JSON.parse(await readFile('data/reader-verdicts.json', 'utf8')) as VerdictsFile; } catch { /* 無ければ全件未照合 */ }
// 推論（reader.analysis）。事実とは別の欄。無ければ空配列
let analysisFile: AnalysisFile = {};
try { analysisFile = JSON.parse(await readFile('data/reader-analysis.json', 'utf8')) as AnalysisFile; } catch { /* 無ければ推論なし */ }
// 反映段（case-reflect.ts）: 取り込み版の事例は、その中身と推論で置き換える。取り込み版が基準に通らなければ旧版も出さない
const reflectState = readReflectState();
analysisFile = withReflectedAnalysis(analysisFile, reflectState);
const displaySources = Object.fromEntries(await Promise.all(DISPLAY_SOURCE_FILE_NAMES.map(async (name) => [name, JSON.parse(await readFile(`data/${name}.json`, 'utf8').catch(() => '[]')) as unknown]))) as unknown as DisplaySourceFiles;
const withheld = { imported: 0, audit: 0, evidence: 0, schemaInvalid: 0, thin: 0, noRawRecord: 0, unverified: 0, resource: 0, queued: 0 };
// 事例ごとのスタンプ（画面に出すか・出さない理由）。捨てずに保存し、探し直しの対象にする
type Display = 'SHOW' | 'CARRIED' | 'HOLD_IMPORT' | 'HOLD_AUDIT' | 'HOLD_NO_RAW' | 'HOLD_UNVERIFIED' | 'HOLD_SCHEMA' | 'HOLD_THIN' | 'HOLD_RESOURCE' | 'HOLD_QUEUE' | 'HOLD_EVIDENCE';
const DISPLAY_REASON: Record<Display, string> = {
  SHOW: '出典と照合した事実がある',
  HOLD_IMPORT: '作り直した版（取り込み）が基準に通っていない。旧版は出さない（data/case-reflect.json）',
  HOLD_NO_RAW: '元の記録が無い',
  HOLD_UNVERIFIED: '出典と照合できた事実が無い（出典が開けない・消えた・未照合）。一次情報を探し直す',
  HOLD_SCHEMA: '形式の検査を通らない',
  HOLD_THIN: 'データが少ない（事実2件以下で数字なし）。一次情報を探し直す',
  HOLD_RESOURCE: '出典に利用規約で商用の表示を禁じる紹介サイト（eBiz Facts）を含む。本人・公式の一次情報に付け替えるまで出さない',
  HOLD_AUDIT: '事例の監査記録が無い（身元が変わった・未監査）、または出典・画像・権利の再確認に通らない。文を直しただけなら、その項目だけが隠れて事例は外れない',
  CARRIED: '公開中の版を引き継いだ（差分公開。中身が公開中と同じことを指紋で確かめた）',
  HOLD_EVIDENCE: '判定に要る手元の証拠（出典本文・画像台帳）が無く、判定できない（不合格ではない）。証拠を揃えてから再実行する',
  HOLD_QUEUE: '順番待ち。全項目の推論と抜き取り監査が済んだら出す（data/catalog-finished-ids.txt に載せる）',
};
// 仕上げ済み（全項目の推論と抜き取り監査が済んだ）事例の一覧。ファイルがあれば、載っている事例だけを出す
let finishedIds: Set<string> | null = null;
try { finishedIds = new Set((await readFile('data/catalog-finished-ids.txt', 'utf8')).split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('#'))); } catch { /* 無ければ全件が対象 */ }
// 原文照合で保留にした項目（data/source-check/held.json）。case:run を通さず手で公開しても、保留の事実とそれに頼る文は画面へ出さない
const heldAll = readHeld();
const heldRemoved: Record<string, HeldRemoval[]> = {};
const caseStamps: Record<string, { display: Display; reason: string }> = {};
// 判定に要る証拠が手元にも証明書にも無い事例 → 足りない物。不合格ではないので、公開中の事例でも取り下げ扱いにしない（引き継いだ形で計画に残し、反映は止める）
const insufficientEvidence: Record<string, string[]> = {};
const evidenceCarried = new Set<string>();
// 事例は出すが、未監査のため隠した項目（'analysis:<id>' / 'fact:<id>' / 'metric:<id>'）
const hiddenItems: Record<string, string[]> = {};
// 言い回しだけの直しとして、機械の照合で監査済みのまま出す項目（数字・年月日・固有名が増えていない）
const paraphrasedItems: Record<string, string[]> = {};
const stamp = (id: string, display: Display, reason = DISPLAY_REASON[display]) => { caseStamps[id] = { display, reason }; };
const totals = { facts: 0, metrics: 0, processDropped: 0, unbound: 0 };
// 画面に出す事例の必須項目の空欄（事実でも推論でも埋まっていない数）。終点は空欄率5%未満
const blanks = { cells: 0, empty: 0, byItem: {} as Record<string, number> };
const unboundAll: { id: string; lines: UnboundLine[] }[] = [];
const reviewAll: { id: string; items: ReviewItem[] }[] = [];
const entities: FinancialEntity[] = [];
for (const entity of publishable) {
  const rawRecord = rawById.get(entity.id);
  if (!rawRecord) { withheld.noRawRecord++; stamp(entity.id, 'HOLD_NO_RAW'); continue; }
  const reflectHold = reflectHoldReasons(reflectState, entity.id);
  if (reflectHold?.length) { withheld.imported++; stamp(entity.id, 'HOLD_IMPORT', reflectHold.join(' / ')); continue; }
  const projected = projectReaderCase(rawRecord, rightsOptions(rawRecord as Record<string, unknown>));
  const result = { ...projected, reader: reflectedReader(reflectState, entity.id) ?? projected.reader };
  totals.processDropped += result.stats.processDropped;
  totals.unbound += result.unbound.length;
  if (result.unbound.length) unboundAll.push({ id: entity.id, lines: result.unbound });
  if (result.review.length) reviewAll.push({ id: entity.id, items: result.review });
  const verified = applyVerdicts(result.reader, verdicts[entity.id]);
  if (!verified) { withheld.unverified++; stamp(entity.id, 'HOLD_UNVERIFIED'); continue; }
  verified.reader = reflectAnalysis(verified.reader, analysisFile[entity.id]);
  const heldHere = heldAll.filter((h) => h.entityId === entity.id);
  let heldIds = new Set<string>();
  let heldList: HeldRemoval[] = [];
  if (heldHere.length) {
    const cut = withoutHeldClaims(verified.reader, heldHere, (claimId) => verdicts[entity.id]?.[claimId]?.verdict === 'HELD');
    verified.reader = cut.reader; heldIds = cut.removedIds; heldList = cut.removed;
  }
  if (validateReader(verified.reader)) { withheld.schemaInvalid++; stamp(entity.id, 'HOLD_SCHEMA'); continue; }
  if (verified.reader.facts.length <= 2 && verified.reader.metrics.length === 0) { withheld.thin++; stamp(entity.id, 'HOLD_THIN'); continue; }
  if (citesRestrictedSource(verified.reader)) { withheld.resource++; stamp(entity.id, 'HOLD_RESOURCE'); continue; }
  if (finishedIds && !finishedIds.has(entity.id)) { withheld.queued++; stamp(entity.id, 'HOLD_QUEUE'); continue; }
  if (!verifyOnly && !carried(entity.id)) {
    // select-finished.ts と同じ入力（照合後の事実＋機械検査を通った推論）で評価する。指紋が一致しなければ受領書は無効
    const prepared = preparePublicationReader(result.reader, verdicts[entity.id], analysisFile[entity.id]);
    const input = await loadPublicationInput(entity, prepared.reader, verdicts[entity.id]);
    if (input.missingEvidence?.length) {
      insufficientEvidence[entity.id] = input.missingEvidence;
      if (!(entity.id in previous.details)) { withheld.evidence++; stamp(entity.id, 'HOLD_EVIDENCE', `${DISPLAY_REASON.HOLD_EVIDENCE}: ${input.missingEvidence.join(' / ')}`); continue; }
      evidenceCarried.add(entity.id);
    }
    const evaluated = evidenceCarried.has(entity.id) ? null : evaluateForRelease(input, audited[entity.id], prepared.problems);
    if (evaluated) {
    // 未監査の項目を隠した結果として薄くなった時も、どの項目を隠したかを理由に残す（差分監査を流せば戻る）
    if (!evaluated.publishable) { withheld.audit++; stamp(entity.id, 'HOLD_AUDIT', [...evaluated.reasons, ...evaluated.unaudited.map((k) => `未監査で隠した:${k}`)].join(' / ')); continue; }
    // 監査の後に中身が変わった項目（未監査）は、その項目だけを画面から隠す。差分監査（run-diff-audit.sh）を通ると戻る
    if (evaluated.paraphrased.length) paraphrasedItems[entity.id] = evaluated.paraphrased;
    if (evaluated.unaudited.length) {
      verified.reader = withoutUnaudited(verified.reader, evaluated.unaudited);
      hiddenItems[entity.id] = evaluated.unaudited;
    }
    }
  }
  if (evidenceCarried.has(entity.id)) stamp(entity.id, 'CARRIED', `${DISPLAY_REASON.HOLD_EVIDENCE}。公開中の版を取り下げずに残した: ${insufficientEvidence[entity.id].join(' / ')}`);
  else stamp(entity.id, carried(entity.id) ? 'CARRIED' : 'SHOW');
  const missing = missingRequired(verified.reader);
  blanks.cells += REQUIRED_ITEMS.length;
  blanks.empty += missing.length;
  for (const m of missing) blanks.byItem[m] = (blanks.byItem[m] ?? 0) + 1;
  totals.facts += verified.reader.facts.length;
  totals.metrics += verified.reader.metrics.length;
  // 画面用の編集文（正本は data/list-lines.json など5つ）は、事例の事実と同じ版に入れて運ぶ（ビルドには同梱しない）
  const display = withoutHeldDisplay(displayForEntity(displaySources, entity.id), heldIds, heldHere, heldList);
  heldList.push(...heldChapterRemovals(displayForEntity(displaySources, entity.id), heldHere));
  if (heldList.length) heldRemoved[entity.id] = heldList;
  entities.push({ ...entity, reader: display ? { ...verified.reader, display } : verified.reader });
}
const sourcelessExcluded = publishable.length - entities.length;
if (process.env.READER_REPORT_DIR && !dryRun) {
  await mkdir(process.env.READER_REPORT_DIR, { recursive: true });
  await writeFile(`${process.env.READER_REPORT_DIR}/unbound.json`, JSON.stringify(unboundAll, null, 1));
  await writeFile(`${process.env.READER_REPORT_DIR}/review.json`, JSON.stringify(reviewAll, null, 1));
}
const directory = '.catalog-release';
const checkOnly = process.argv.includes('--check');
// CI の e2e 用: .catalog-release/*.gz だけを書く。目録ファイル（data/catalog-release.json）は書き換えず、食い違えば失敗
const artifactsOnly = process.argv.includes('--artifacts-only');
const withdrawnIds = Object.keys(previous.details).filter((id) => !entities.some((e) => e.id === id));
const withdrawalApproval = checkWithdrawals(withdrawnIds, authorizedWithdrawals);
// 証拠不足は不合格ではない。公開中の事例を取り下げずに計画へ残すが、判定していない版は反映しない（足りない物を揃えて再実行する）
// 止めるのは、公開中の事例の判定ができない時だけ。まだ公開していない新しい事例は HOLD_EVIDENCE で外れるだけで、ほかの事例の反映を止めない
const evidenceBlocked = evidenceCarried.size > 0;
if (!dryRun && !verifyOnly && evidenceBlocked) throw new Error(`Catalog release blocked: ${evidenceCarried.size} published cases lack the evidence needed to judge (not a failure; nothing was withdrawn or changed). Provide the missing evidence and rerun: ${JSON.stringify(Object.fromEntries([...evidenceCarried].map((id) => [id, insufficientEvidence[id]])))}`);
if (!dryRun && !verifyOnly && !withdrawalApproval.allowed) throw new Error(`Catalog release needs explicit --withdrawals approval: ${JSON.stringify(withdrawalApproval)}. Inspect --dry-run first; no manifest was changed.`);
if (!checkOnly && !dryRun) await mkdir(directory, { recursive: true });
const objects: { key: string; file: string }[] = [];
async function artifact(value: unknown, key?: string) {
  const json = stringifyDeterministic(value);
  const hash = createHash('sha256').update(json).digest('hex');
  const file = `${directory}/${hash}.json.gz`;
  if (!checkOnly && !dryRun) await writeFile(file, gzipSync(json));
  const storageKey = key ?? `views/make-money/catalog-v1/objects/${hash}.json.gz`;
  objects.push({ key: storageKey, file });
  return { hash, key: storageKey };
}
const details: Record<string, string> = {};
// 画面用の編集文（reader.display）を除いた中身の指紋。引き継ぐ事例が「審査を経ない書き換え」をされていないかは、編集文を除いて比べる
// （編集文は出典と照合する別の検査 display:build を通す。事実・推論・数字が変わった時だけ、受領書の再評価が要る）
const coreDetails: Record<string, string> = {};
const carriedDrift: string[] = [];
for (const entity of entities) {
  const hash = computeDossierContentHash(entity);
  const { display: _display, ...coreReader } = entity.reader ?? ({} as NonNullable<FinancialEntity['reader']>);
  void _display;
  const coreHash = entity.reader?.display ? computeDossierContentHash({ ...entity, reader: coreReader as NonNullable<FinancialEntity['reader']> }) : hash;
  coreDetails[entity.id] = coreHash;
  if (carried(entity.id) && !evidenceCarried.has(entity.id) && (previous.coreDetails?.[entity.id] ?? previous.details[entity.id]) !== coreHash) carriedDrift.push(entity.id);
  await artifact(entity, getDossierStoragePath(entity.id, hash));
  details[entity.id] = hash;
}
if (carriedDrift.length) throw new Error(`Catalog release blocked: ${carriedDrift.length} carried-over cases changed without a receipt (add them to --changed and audit): ${carriedDrift.slice(0, 10).join(', ')}`);
const summaryRows = entities.map((entity) => ({ ...publicSummaryEntity(entity), latestDossierHash: details[entity.id] }));
if (parseFinancialEntitiesResiliently(summaryRows).invalidEntities.length) throw new Error('Invalid summary projection');
const summaries = await artifact(summaryRows);
const discovery = await artifact(deriveDiscoveryDataset(entities.map(publicEntity)));
const manifest = { version: 1, sourceHash, sourceCount: parsed.validEntities.length, publishedCount: entities.length,
  summaries, discovery, details, coreDetails, approvalCandidateIds: [...collectApprovalCandidateIds(raw)].sort() };
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
// 版の目録そのものも、指紋で名前が決まる成果物として置く。本番は「目印」が指す目録を実行時に読む（ビルドし直さなくても版が進む）。
const manifestJson = stringifyDeterministic(manifest);
const manifestHash = createHash('sha256').update(manifestJson).digest('hex');
const manifestFile = `${directory}/${manifestHash}.json.gz`;
if (!checkOnly && !dryRun) await writeFile(manifestFile, gzipSync(manifestJson));
objects.push({ key: manifestObjectKey(manifestHash), file: manifestFile });
const localPointer: ReleasePointer = { version: 1, manifestHash, manifestKey: manifestObjectKey(manifestHash), publishedCount: entities.length, updatedAt: new Date().toISOString(), previous: null };
const plan = planRelease(previous, manifest);
if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, plan, canApply: withdrawalApproval.allowed && !evidenceBlocked, withdrawalApproval, insufficientEvidence, withheld, heldRemoved, hiddenItems, paraphrasedItems, caseStamps }));
  return;
}
if (checkOnly || artifactsOnly) {
  if (await readFile('data/catalog-release.json', 'utf8') !== manifestText) throw new Error('Catalog release is stale; run pnpm catalog:prepare and publish before deployment');
  // 手元の画面（開発サーバ・自動テスト）が、同梱の版と食い違わずに今の版を読めるよう、手元の目印を書く
  if (artifactsOnly) await writeFile(`${directory}/current.json`, `${JSON.stringify(localPointer, null, 2)}\n`);
} else {
  await writeFile(`${directory}/current.json`, `${JSON.stringify(localPointer, null, 2)}\n`);
  await writeFile('data/catalog-release.json', manifestText);
  await writeFile('data/case-display.json', `${JSON.stringify(Object.fromEntries(Object.entries(caseStamps).sort(([x], [y]) => x.localeCompare(y))), null, 1)}\n`);
  await writeFile(`${directory}/upload.json`, JSON.stringify(objects));
}
console.log(JSON.stringify({ sourceHash, sourceCount: manifest.sourceCount, publishedCount: entities.length, sourcelessExcluded, plan, withheld, heldRemoved, hiddenItems, paraphrasedItems, totals,
  blankRate: blanks.cells ? Number((blanks.empty / blanks.cells).toFixed(4)) : null, blanks, objects: objects.length }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
