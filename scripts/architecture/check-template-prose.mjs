/**
 * 公開前データ（data/entities-index.json）に、3件以上で使い回された作文（テンプレ文）が残っていれば exit 1。
 * 判定と除外リストは template-prose-lib.mjs。取り下げは scripts/reaudit/demote-template-prose.ts。
 *
 * もう一つ: 許可リスト方式（facts-only-lib.mjs）。
 *  A. narrativeStatus が AI_NARRATIVE_DEMOTED_UNVERIFIED_20260930 のレコードに、許可リスト外の値（出典の無い数値・作文・カード・観測）が残っていたら失敗。
 *  B1 運営指標の型（週20時間・初期資本100000・自動化85・初期人数1 のうち2つ以上）
 *  B2 COGS未確認なのに粗利=売上・粗利率100%
 *  B3 幅の上限・ピーク値を月商にしている
 *  B4 founder が現職の肩書だけ（「創業」の語が無い）
 * 取り下げは scripts/reaudit/facts-only-allowlist.ts。
 *
 * C. 画面に出る文字列欄（reaudit・meta・sourceMetadata を除く）に内部の語（reaudit.legacyDisplaySnapshot / 互換値 / revenueLabel / reportedMetrics）が含まれていたら失敗。
 *    さらに工程の語（再監査 / 再調査 / 再抽出 / 以前の数値・表示・損益・説明 / 機械的 / scripted / lane X / re-audit / 行頭の「次の作業:」）とHTML実体（&amp; など）も失敗。
 *    id キー（entity / evidenceCards[] / observationsStream[]）は画面に出ないので除外。
 *    「機械的」は工程の語としての「機械的再監査」だけを見る（「AIの機械的な言い回し」のような自然文は誤検知しない）。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { findTemplateViolations, MIN_REPEAT } from './template-prose-lib.mjs';
import { findFactsOnlyViolations } from './facts-only-lib.mjs';
import { INTERNAL_TERMS, PROCESS_RES } from './screen-text-lib.mjs';

const entities = JSON.parse(readFileSync(resolve(process.cwd(), 'data/entities-index.json'), 'utf8'));
const violations = findTemplateViolations(entities);
const factsOnly = findFactsOnlyViolations(entities);

const internalHits = [];
function scanInternal(id, path, v) {
  if (typeof v === 'string') {
    const hit = INTERNAL_TERMS.find((t) => v.includes(t)) ?? PROCESS_RES.find(([re]) => re.test(v))?.[1];
    if (hit) internalHits.push({ id, path, hit });
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => scanInternal(id, `${path}[${i}]`, x));
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (k === 'id' && (path === '' || /^(evidenceCards|observationsStream)\[\d+\]$/.test(path))) continue;
      scanInternal(id, path ? `${path}.${k}` : k, x);
    }
  }
}
for (const e of entities) {
  for (const [k, x] of Object.entries(e)) {
    if (k === 'reaudit' || k === 'meta' || k === 'sourceMetadata' || k === 'id') continue;
    if (Array.isArray(x) && (k === 'evidenceCards' || k === 'observationsStream')) {
      x.forEach((c, i) => scanInternal(e.id, `${k}[${i}]`, c));
    } else scanInternal(e.id, k, x);
  }
}
// country: GLOBAL は国ではない（未確認にする）
for (const e of entities) if (e.country === 'GLOBAL') internalHits.push({ id: e.id, path: 'country', hit: 'GLOBAL は国ではない' });
if (internalHits.length > 0) {
  console.error(`[check-template-prose] FAIL: ${internalHits.length} screen-visible strings contain internal terms (${INTERNAL_TERMS.join(' / ')}).`);
  for (const h of internalHits.slice(0, 20)) console.error(`  ${h.id} ${h.path} [${h.hit}]`);
  if (internalHits.length > 20) console.error(`  ... and ${internalHits.length - 20} more`);
  process.exitCode = 1;
}
if (factsOnly.length > 0) {
  console.error(`[check-template-prose] FAIL: ${factsOnly.length} allow-list / mechanical-error groups. Run: node --import tsx scripts/reaudit/facts-only-allowlist.ts`);
  for (const v of factsOnly.slice(0, 20)) console.error(`  ${v.count}件 [${v.label}] e.g. ${v.sample.join(', ')}`);
  if (factsOnly.length > 20) console.error(`  ... and ${factsOnly.length - 20} more`);
  process.exitCode = 1;
}
if (violations.length === 0) {
  if (factsOnly.length > 0 || internalHits.length > 0) process.exit(1);
  console.log(`[check-template-prose] OK: ${entities.length} entities, no sentence reused by ${MIN_REPEAT}+ records outside the disclosure allow-list; demoted records hold only allow-listed facts (A), no B1-B4 patterns.`);
} else {
  console.error(`[check-template-prose] FAIL: ${violations.length} reused sentences (${MIN_REPEAT}+ records each). Run: node --import tsx scripts/reaudit/demote-template-prose.ts`);
  for (const v of violations.slice(0, 20)) console.error(`  ${v.count}件 [${v.field}] ${v.sentence.slice(0, 90)}`);
  if (violations.length > 20) console.error(`  ... and ${violations.length - 20} more`);
  process.exit(1);
}
