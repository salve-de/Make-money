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
import { evaluateForRelease, preparePublicationReader } from './reader-case/publication-evaluation';
import { loadPublicationInput, readPublicationAudits } from './reader-case/publication-inputs';
import { checkWithdrawals, planRelease } from './reader-case/release-plan';

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
const previous = JSON.parse(await readFile(flagValue('--previous') ?? 'data/catalog-release.json', 'utf8')) as { details: Record<string, string> };
const withdrawalsPath = flagValue('--withdrawals');
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
const withheld = { audit: 0, schemaInvalid: 0, thin: 0, noRawRecord: 0, unverified: 0, resource: 0, queued: 0 };
// 事例ごとのスタンプ（画面に出すか・出さない理由）。捨てずに保存し、探し直しの対象にする
type Display = 'SHOW' | 'HOLD_AUDIT' | 'HOLD_NO_RAW' | 'HOLD_UNVERIFIED' | 'HOLD_SCHEMA' | 'HOLD_THIN' | 'HOLD_RESOURCE' | 'HOLD_QUEUE';
const DISPLAY_REASON: Record<Display, string> = {
  SHOW: '出典と照合した事実がある',
  HOLD_NO_RAW: '元の記録が無い',
  HOLD_UNVERIFIED: '出典と照合できた事実が無い（出典が開けない・消えた・未照合）。一次情報を探し直す',
  HOLD_SCHEMA: '形式の検査を通らない',
  HOLD_THIN: 'データが少ない（事実2件以下で数字なし）。一次情報を探し直す',
  HOLD_RESOURCE: '出典に利用規約で商用の表示を禁じる紹介サイト（eBiz Facts）を含む。本人・公式の一次情報に付け替えるまで出さない',
  HOLD_AUDIT: '今の入力全体に対する監査受領書が無い、または出典・画像・権利の再確認に通らない（文章が変わると古い受領書は無効）',
  HOLD_QUEUE: '順番待ち。全項目の推論と抜き取り監査が済んだら出す（data/catalog-finished-ids.txt に載せる）',
};
// 仕上げ済み（全項目の推論と抜き取り監査が済んだ）事例の一覧。ファイルがあれば、載っている事例だけを出す
let finishedIds: Set<string> | null = null;
try { finishedIds = new Set((await readFile('data/catalog-finished-ids.txt', 'utf8')).split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('#'))); } catch { /* 無ければ全件が対象 */ }
const caseStamps: Record<string, { display: Display; reason: string }> = {};
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
  const result = projectReaderCase(rawRecord);
  totals.processDropped += result.stats.processDropped;
  totals.unbound += result.unbound.length;
  if (result.unbound.length) unboundAll.push({ id: entity.id, lines: result.unbound });
  if (result.review.length) reviewAll.push({ id: entity.id, items: result.review });
  const verified = applyVerdicts(result.reader, verdicts[entity.id]);
  if (!verified) { withheld.unverified++; stamp(entity.id, 'HOLD_UNVERIFIED'); continue; }
  verified.reader = reflectAnalysis(verified.reader, analysisFile[entity.id]);
  if (validateReader(verified.reader)) { withheld.schemaInvalid++; stamp(entity.id, 'HOLD_SCHEMA'); continue; }
  if (verified.reader.facts.length <= 2 && verified.reader.metrics.length === 0) { withheld.thin++; stamp(entity.id, 'HOLD_THIN'); continue; }
  if (citesRestrictedSource(verified.reader)) { withheld.resource++; stamp(entity.id, 'HOLD_RESOURCE'); continue; }
  if (finishedIds && !finishedIds.has(entity.id)) { withheld.queued++; stamp(entity.id, 'HOLD_QUEUE'); continue; }
  if (!verifyOnly) {
    // select-finished.ts と同じ入力（照合後の事実＋機械検査を通った推論）で評価する。指紋が一致しなければ受領書は無効
    const prepared = preparePublicationReader(result.reader, verdicts[entity.id], analysisFile[entity.id]);
    const input = await loadPublicationInput(entity, prepared.reader, verdicts[entity.id]);
    const evaluated = evaluateForRelease(input, audited[entity.id], prepared.problems);
    if (!evaluated.publishable) { withheld.audit++; stamp(entity.id, 'HOLD_AUDIT', evaluated.reasons.join(' / ')); continue; }
  }
  stamp(entity.id, 'SHOW');
  const missing = missingRequired(verified.reader);
  blanks.cells += REQUIRED_ITEMS.length;
  blanks.empty += missing.length;
  for (const m of missing) blanks.byItem[m] = (blanks.byItem[m] ?? 0) + 1;
  totals.facts += verified.reader.facts.length;
  totals.metrics += verified.reader.metrics.length;
  entities.push({ ...entity, reader: verified.reader });
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
for (const entity of entities) {
  const hash = computeDossierContentHash(entity);
  await artifact(entity, getDossierStoragePath(entity.id, hash));
  details[entity.id] = hash;
}
const summaryRows = entities.map((entity) => ({ ...publicSummaryEntity(entity), latestDossierHash: details[entity.id] }));
if (parseFinancialEntitiesResiliently(summaryRows).invalidEntities.length) throw new Error('Invalid summary projection');
const summaries = await artifact(summaryRows);
const discovery = await artifact(deriveDiscoveryDataset(entities.map(publicEntity)));
const manifest = { version: 1, sourceHash, sourceCount: parsed.validEntities.length, publishedCount: entities.length,
  summaries, discovery, details, approvalCandidateIds: [...collectApprovalCandidateIds(raw)].sort() };
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
const plan = planRelease(previous, manifest);
if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, plan, canApply: withdrawalApproval.allowed, withdrawalApproval, withheld, caseStamps }));
  return;
}
if (checkOnly || artifactsOnly) {
  if (await readFile('data/catalog-release.json', 'utf8') !== manifestText) throw new Error('Catalog release is stale; run pnpm catalog:prepare and publish before deployment');
} else {
  await writeFile('data/catalog-release.json', manifestText);
  await writeFile('data/case-display.json', `${JSON.stringify(Object.fromEntries(Object.entries(caseStamps).sort(([x], [y]) => x.localeCompare(y))), null, 1)}\n`);
  await writeFile(`${directory}/upload.json`, JSON.stringify(objects));
}
console.log(JSON.stringify({ sourceHash, sourceCount: manifest.sourceCount, publishedCount: entities.length, sourcelessExcluded, plan, withheld, totals,
  blankRate: blanks.cells ? Number((blanks.empty / blanks.cells).toFixed(4)) : null, blanks, objects: objects.length }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
