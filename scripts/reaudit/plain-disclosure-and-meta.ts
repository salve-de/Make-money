/**
 * 画面に出る開示文を平易にし、出典の無い有料分析(meta)を取り下げる（2026-09-30）
 *
 * 1. pnl.estimationLogic の内部語入りの3文を、読者向けの平易な文に置き換える。
 * 1b. 画面に出る他の文字列欄（reaudit と meta を除く）に残った内部の語（reportedMetrics / 互換値）を平易な語に置き換える。
 * 2. トップレベル meta が残っているレコードは reaudit.legacyDisplaySnapshot.priorNarrative.meta へ退避して削除する。
 * 冪等: 置換済み・退避済みは再処理しない。
 *
 * 使い方: node --import tsx scripts/reaudit/plain-disclosure-and-meta.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';

type AnyRecord = Record<string, unknown>;

const rec = (v: unknown): AnyRecord => (v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : {});

const REPLACEMENTS: Array<[string, string]> = [
  [
    '推計は挿入していない。旧表示の月次P&Lは出典で裏付けられないため reaudit.legacyDisplaySnapshot へ退避。',
    '推計は入れていません。月次の損益は出典で確認できていないため未確認です。',
  ],
  [
    '推計は挿入していない。財務数値は根拠が見つかっていないため未確認（内部の0は不明の互換値）。旧表示は reaudit.legacyDisplaySnapshot に退避。',
    '推計は入れていません。財務数値は出典で確認できていないため未確認です。',
  ],
  [
    '推計は挿入していない。出典付きの報告値だけを revenueLabel と reportedMetrics に記載し、月次換算・利益推計・為替換算は行っていない。金額欄の0は不明の互換値。',
    '推計は入れていません。出典に書かれた報告値だけを載せ、月次への換算・利益の推計・為替換算はしていません。',
  ],
];

const TERM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\s*内部の?0は不明の互換値。?/g, ''],
  [/\s*金額欄の0は不明の互換値。?/g, ''],
  [/\s*reportedMetrics\s*/g, '報告値'],
];

function cleanTerms(v: unknown, path: string, counter: { n: number }): unknown {
  if (typeof v === 'string') {
    let out = v;
    for (const [re, to] of TERM_REPLACEMENTS) out = out.replace(re, to);
    if (out !== v) counter.n++;
    return out;
  }
  if (Array.isArray(v)) return v.map((x, i) => cleanTerms(x, `${path}[${i}]`, counter));
  if (v && typeof v === 'object') {
    const o = v as AnyRecord;
    for (const k of Object.keys(o)) {
      if (k === 'id' && /^(evidenceCards|observationsStream)\[\d+\]$/.test(path)) continue;
      o[k] = cleanTerms(o[k], path ? `${path}.${k}` : k, counter);
    }
    return o;
  }
  return v;
}

const dryRun = process.argv.includes('--dry-run');
const indexPath = resolve(process.cwd(), 'data/entities-index.json');

function main() {
  const entities: AnyRecord[] = JSON.parse(readFileSync(indexPath, 'utf8'));
  const counts = { replaced: [0, 0, 0], metaMoved: 0, termsCleaned: 0 };
  for (const e of entities) {
    let changed = false;
    const pnl = rec(e.pnl);
    const idx = REPLACEMENTS.findIndex(([from]) => pnl.estimationLogic === from);
    if (idx >= 0) {
      pnl.estimationLogic = REPLACEMENTS[idx][1];
      counts.replaced[idx]++;
      changed = true;
    }
    for (const k of Object.keys(e)) {
      if (k === 'reaudit' || k === 'meta') continue;
      const c = { n: 0 };
      e[k] = cleanTerms(e[k], k, c);
      if (c.n > 0) { counts.termsCleaned += c.n; changed = true; }
    }
    if (e.meta !== undefined) {
      const reaudit: AnyRecord = { ...rec(e.reaudit) };
      const snapshot: AnyRecord = { ...rec(reaudit.legacyDisplaySnapshot) };
      const prior: AnyRecord = { ...rec(snapshot.priorNarrative) };
      prior.meta = e.meta;
      snapshot.priorNarrative = prior;
      reaudit.legacyDisplaySnapshot = snapshot;
      e.reaudit = reaudit;
      delete e.meta;
      counts.metaMoved++;
      changed = true;
    }
    if (changed) parseFinancialEntity(e);
  }
  console.log(JSON.stringify(counts));
  if (!dryRun) writeFileSync(indexPath, JSON.stringify(entities, null, 2), 'utf8');
}

main();
