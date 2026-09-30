/**
 * 業種(sector)の付け直しを entities-index.json に当てる（2026-09-30, 10回目の監査）。
 *
 * 入力: data/reaudit/sector-reclass.json（scripts/reaudit/build-sector-reclass.mjs が作る）
 *   { "<id>": { "sector": "<値>", "sectorBasis"?: { "source": "SEC_SIC" | "SOURCED_DESCRIPTION", "note": "<根拠>" } } }
 *
 * 処理:
 *  1. 各レコードの sector を入力の値に置き換える。sectorBasis があれば entity.sectorBasis に入れ、UNKNOWN では消す。
 *  2. 元の sector は reaudit.legacyDisplaySnapshot.priorNarrative.sector に退避する（すでにあれば上書きしない）。
 *  3. 冪等: 2回目以降は何も変えない（退避済みの値は保持、同じ値の再代入のみ）。
 *
 * 使い方（リポジトリ直下で）: node --import tsx scripts/reaudit/apply-sector-reclass.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type AnyRecord = Record<string, unknown>;
const rec = (v: unknown): AnyRecord => (v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : {});

const SECTORS = new Set([
  'AI_AUTOMATION',
  'NICHE_SAAS',
  'MONOPOLY_MFG',
  'CONTENT_MEDIA',
  'PHYSICAL_ASSET',
  'FINTECH_INFRA',
  'LOCAL_SERVICES',
  'UNKNOWN',
]);
const SOURCES = new Set(['SEC_SIC', 'SOURCED_DESCRIPTION']);

const root = process.cwd();
const indexPath = resolve(root, 'data/entities-index.json');
const reclassPath = resolve(root, 'data/reaudit/sector-reclass.json');
const dryRun = process.argv.includes('--dry-run');

const reclass = JSON.parse(readFileSync(reclassPath, 'utf8')) as Record<string, AnyRecord>;
const entities = JSON.parse(readFileSync(indexPath, 'utf8')) as AnyRecord[];

let changed = 0;
let stashed = 0;
let missing = 0;
const before: Record<string, number> = {};
const after: Record<string, number> = {};

for (const e of entities) {
  const id = String(e.id);
  const sector = String(e.sector);
  before[sector] = (before[sector] ?? 0) + 1;
  const r = reclass[id];
  if (!r) {
    missing += 1;
    after[sector] = (after[sector] ?? 0) + 1;
    continue;
  }
  const next = String(r.sector);
  if (!SECTORS.has(next)) throw new Error(`${id}: 未知の sector ${next}`);
  const basis = r.sectorBasis === undefined ? undefined : rec(r.sectorBasis);
  if (next === 'UNKNOWN' && basis) throw new Error(`${id}: UNKNOWN に sectorBasis は付けない`);
  if (next !== 'UNKNOWN' && !(basis && SOURCES.has(String(basis.source)) && typeof basis.note === 'string' && basis.note)) {
    throw new Error(`${id}: ${next} には source と note が要る`);
  }

  const reaudit = rec(e.reaudit);
  const snap = rec(reaudit.legacyDisplaySnapshot);
  const prior = rec(snap.priorNarrative);
  if (!('sector' in prior)) {
    prior.sector = sector; // 初回だけ元の値を退避する
    stashed += 1;
  }
  snap.priorNarrative = prior;
  reaudit.legacyDisplaySnapshot = snap;

  // 画面は entity.sectorBasis を読む（src/shared/terminal.ts の SectorBasis）
  delete reaudit.sectorBasis;
  e.reaudit = reaudit;
  if (basis) e.sectorBasis = { source: basis.source, note: basis.note };
  else delete e.sectorBasis;

  if (sector !== next) {
    e.sector = next;
    changed += 1;
  }
  after[next] = (after[next] ?? 0) + 1;
}

console.log(JSON.stringify({ total: entities.length, changed, stashed, missingInReclass: missing, before, after }, null, 1));
if (!dryRun) writeFileSync(indexPath, JSON.stringify(entities, null, 2), 'utf8');
