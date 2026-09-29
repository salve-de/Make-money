/**
 * 再監査候補の検査（validate-candidates v1）— 2026-09-29
 * 候補ファイルの各記録について、実行時スキーマ、reaudit 契約、出典の有無、金額の混入、禁止表現を検査する。
 * 使い方: node --import tsx scripts/reaudit/validate-candidates.ts <file.json> [<file2.json> ...]
 * 終了コード: 0 = 全件 PASS、1 = 1件以上 FAIL
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';

type AnyRecord = Record<string, unknown>;
const isHttp = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v);
const FORBIDDEN = ['サバンナOS', 'サバンナ OS', '略奪転用方程式', 'カニバリズム障壁', '身も蓋もない真実', '特異物証', '地雷検死', '検死開示', 'ホスティング関所', '決済関所', 'Indie Hackers表示', '報告値・利益ではない', '掲載タグラインが示す課題', '防御要因は未確認'];
const TIERS = new Set(['TIER1_OFFICIAL', 'TIER1_PUBLIC_RECORD', 'TIER1_PLATFORM', 'TIER2_FACTS_ONLY']);

const files = process.argv.slice(2);
if (files.length === 0) { console.error('usage: validate-candidates.ts <file.json> ...'); process.exit(64); }

const catalog = JSON.parse(readFileSync(resolve(process.cwd(), 'data/entities-index.json'), 'utf8')) as AnyRecord[];
const byId = new Map(catalog.map((e) => [String(e.id), e]));

let fails = 0; let total = 0;
for (const file of files) {
  const records = JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8')) as AnyRecord[];
  const seen = new Set<string>();
  for (const rec of records) {
    total += 1;
    const errors: string[] = [];
    const id = String(rec.id ?? '');
    if (!byId.has(id)) errors.push('id not in catalog (new entities go through the normal collection path, not re-audit)');
    if (seen.has(id)) errors.push('duplicate id within file'); seen.add(id);
    try { parseFinancialEntity(rec); } catch (err) { errors.push(`schema: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`); }
    const reaudit = rec.reaudit as AnyRecord | undefined;
    if (!reaudit || typeof reaudit !== 'object') errors.push('missing reaudit block');
    else {
      if (reaudit.status !== 'PARTIAL' && reaudit.status !== 'LEGACY_WITH_SOURCE') errors.push(`reaudit.status must be PARTIAL (got ${String(reaudit.status)})`);
      const sources = Array.isArray(reaudit.sources) ? (reaudit.sources as AnyRecord[]) : [];
      if (sources.length === 0) errors.push('reaudit.sources is empty');
      for (const s of sources) {
        if (!isHttp(s.url)) errors.push(`source without http url: ${JSON.stringify(s).slice(0, 80)}`);
        if (!TIERS.has(String(s.rightsTier))) errors.push(`source ${String(s.url)} has invalid rightsTier ${String(s.rightsTier)}`);
        if (!s.checkedAt) errors.push(`source ${String(s.url)} missing checkedAt`);
      }
      if (!reaudit.legacyDisplaySnapshot) errors.push('missing reaudit.legacyDisplaySnapshot');
      if (!reaudit.rights || typeof reaudit.rights !== 'object') errors.push('missing reaudit.rights');
      if (typeof reaudit.auditOwner !== 'string' || /fill:/.test(reaudit.auditOwner)) errors.push('reaudit.auditOwner not filled');
    }
    const pnl = (rec.pnl as AnyRecord | undefined) ?? {};
    const claimsRevenue = typeof pnl.monthlyRevenue === 'number' && pnl.monthlyRevenue > 0 && !pnl.isRevenueUnconfirmed;
    if (claimsRevenue && !(Array.isArray(rec.claimBindings) && rec.claimBindings.length > 0)) errors.push('confirmed monthlyRevenue without claimBindings (keep unconfirmed; put self-reported figures in revenueLabel/reportedMetrics)');
    if (typeof pnl.revenueLabel === 'string' && /本人申告/.test(pnl.revenueLabel) && !/(20\d\d|掲載|発言|日)/.test(pnl.revenueLabel)) errors.push('self-reported revenueLabel lacks a date');
    const cards = Array.isArray(rec.evidenceCards) ? (rec.evidenceCards as AnyRecord[]) : [];
    if (cards.length < 2) errors.push('fewer than 2 evidence cards (keep the source card and the research-limits card)');
    if (!cards.some((c) => isHttp(c.url))) errors.push('no evidence card with an http url');
    const text = JSON.stringify(rec, (k, v) => (k === 'sourceMetadata' || k === 'legacyDisplaySnapshot' ? undefined : v));
    for (const w of FORBIDDEN) if (text.includes(w)) errors.push(`forbidden phrase: ${w}`);
    const tagline = String(rec.tagline ?? '');
    if (!/[ぁ-んァ-ヶ]/.test(tagline)) errors.push('tagline must be Japanese');
    if (/[¥$€£]\s?[0-9]|[0-9]\s?(億|万|千)?円|[0-9]\s?ドル/.test(tagline) && !/本人申告/.test(tagline)) errors.push('tagline carries a money figure without 本人申告 label');
    if (errors.length) { fails += 1; console.log(`✗ ${id} (${String(rec.name)})\n  - ${errors.join('\n  - ')}`); }
    else console.log(`✓ ${id} (${String(rec.name)}) sources=${(((rec.reaudit as AnyRecord).sources as unknown[]) ?? []).length} cards=${cards.length}`);
  }
}
console.log(`\n${total - fails}/${total} PASS`);
process.exit(fails ? 1 : 0);
