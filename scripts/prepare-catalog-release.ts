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
import { reflectAnalysis, missingRequired, REQUIRED_ITEMS, type AnalysisFile } from './reader-case/analysis-lib';
import { computeDossierContentHash, getDossierStoragePath, stringifyDeterministic } from '../src/lib/foundation/dossier-projection';
import { deriveDiscoveryDataset } from '../src/features/discover';
import { findTemplateViolations, MIN_REPEAT } from './architecture/template-prose-lib.mjs';
import type { FinancialEntity } from '../src/shared/terminal';

// 取り下げた旧表示（出典の無い数字や作文）は内部の監査記録。公開版には入れない
function withoutWithdrawnSnapshot(entity: FinancialEntity): FinancialEntity {
  if (!entity.reaudit?.legacyDisplaySnapshot) return entity;
  const reaudit = { ...entity.reaudit };
  delete reaudit.legacyDisplaySnapshot;
  return { ...entity, reaudit };
}

async function main() {
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
const withheld = { schemaInvalid: 0, thin: 0, noRawRecord: 0, unverified: 0, resource: 0, queued: 0 };
// 事例ごとのスタンプ（画面に出すか・出さない理由）。捨てずに保存し、探し直しの対象にする
type Display = 'SHOW' | 'HOLD_NO_RAW' | 'HOLD_UNVERIFIED' | 'HOLD_SCHEMA' | 'HOLD_THIN' | 'HOLD_RESOURCE' | 'HOLD_QUEUE';
const DISPLAY_REASON: Record<Display, string> = {
  SHOW: '出典と照合した事実がある',
  HOLD_NO_RAW: '元の記録が無い',
  HOLD_UNVERIFIED: '出典と照合できた事実が無い（出典が開けない・消えた・未照合）。一次情報を探し直す',
  HOLD_SCHEMA: '形式の検査を通らない',
  HOLD_THIN: 'データが少ない（事実2件以下で数字なし）。一次情報を探し直す',
  HOLD_RESOURCE: '出典が利用規約で商用の表示を禁じる紹介サイト（eBiz Facts）だけ。本人・公式の一次情報に付け替えるまで出さない',
  HOLD_QUEUE: '順番待ち。全項目の推論と抜き取り監査が済んだら出す（data/catalog-finished-ids.txt に載せる）',
};
// 素材の商用利用・公の表示を利用規約で禁じる出典（2026-09-30 確認: ebizfacts.com/about/terms）
const TERMS_RESTRICTED_HOSTS = ['ebizfacts.com'];
const onlyRestrictedSources = (urls: string[]) => urls.length > 0 && urls.every((u) => {
  try { const h = new URL(u).hostname.replace(/^www\./, ''); return TERMS_RESTRICTED_HOSTS.includes(h); } catch { return false; }
});
// 仕上げ済み（全項目の推論と抜き取り監査が済んだ）事例の一覧。ファイルがあれば、載っている事例だけを出す
let finishedIds: Set<string> | null = null;
try { finishedIds = new Set((await readFile('data/catalog-finished-ids.txt', 'utf8')).split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('#'))); } catch { /* 無ければ全件が対象 */ }
const caseStamps: Record<string, { display: Display; reason: string }> = {};
const stamp = (id: string, display: Display) => { caseStamps[id] = { display, reason: DISPLAY_REASON[display] }; };
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
  if (onlyRestrictedSources(verified.reader.sources.map((x) => x.url))) { withheld.resource++; stamp(entity.id, 'HOLD_RESOURCE'); continue; }
  if (finishedIds && !finishedIds.has(entity.id)) { withheld.queued++; stamp(entity.id, 'HOLD_QUEUE'); continue; }
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
if (process.env.READER_REPORT_DIR) {
  await mkdir(process.env.READER_REPORT_DIR, { recursive: true });
  await writeFile(`${process.env.READER_REPORT_DIR}/unbound.json`, JSON.stringify(unboundAll, null, 1));
  await writeFile(`${process.env.READER_REPORT_DIR}/review.json`, JSON.stringify(reviewAll, null, 1));
}
const directory = '.catalog-release';
const checkOnly = process.argv.includes('--check');
if (!checkOnly) await mkdir(directory, { recursive: true });
const objects: { key: string; file: string }[] = [];
async function artifact(value: unknown, key?: string) {
  const json = stringifyDeterministic(value);
  const hash = createHash('sha256').update(json).digest('hex');
  const file = `${directory}/${hash}.json.gz`;
  if (!checkOnly) await writeFile(file, gzipSync(json));
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
if (checkOnly) {
  if (await readFile('data/catalog-release.json', 'utf8') !== manifestText) throw new Error('Catalog release is stale; run pnpm catalog:prepare and publish before deployment');
} else {
  await writeFile('data/catalog-release.json', manifestText);
  await writeFile('data/case-display.json', `${JSON.stringify(Object.fromEntries(Object.entries(caseStamps).sort(([x], [y]) => x.localeCompare(y))), null, 1)}\n`);
  await writeFile(`${directory}/upload.json`, JSON.stringify(objects));
}
console.log(JSON.stringify({ sourceHash, sourceCount: manifest.sourceCount, publishedCount: entities.length, sourcelessExcluded, withheld, totals,
  blankRate: blanks.cells ? Number((blanks.empty / blanks.cells).toFixed(4)) : null, blanks, objects: objects.length }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
