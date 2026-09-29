/**
 * 再監査候補の雛形生成（candidate-skeleton v1）— 2026-09-29
 * 現在のカタログ記録（機械的正直化済み）から、統一 `reaudit` 契約つきの候補雛形を作る。
 * 調査担当はこの雛形の「事実フィールド」だけを埋め、根拠の無い項目は未確認のまま残す。
 *
 * 使い方:
 *   node --import tsx scripts/reaudit/candidate-skeleton.ts --ids id1,id2 [--lane sec|ebiz|ih|gen] [--out data/incoming/reaudit-<lane>-batch-NNN-20260929.json]
 *   node --import tsx scripts/reaudit/candidate-skeleton.ts --range 100-124 --family indiehackers --lane ih --out ...
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type AnyRecord = Record<string, unknown>;
const AUDIT_DATE = '2026-09-29';
const args = process.argv.slice(2);
const opt = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const idsArg = opt('ids'); const rangeArg = opt('range'); const family = opt('family'); const lane = opt('lane') ?? 'manual'; const out = opt('out');
if ((!idsArg && !rangeArg) || !out) { console.error('usage: --ids a,b | --range start-end [--family ebizfacts|indiehackers|generated] --out <file> [--lane <lane>]'); process.exit(64); }

const catalog = JSON.parse(readFileSync(resolve(process.cwd(), 'data/entities-index.json'), 'utf8')) as AnyRecord[];
let targets: AnyRecord[] = [];
if (idsArg) {
  const ids = new Set(idsArg.split(',').map((s) => s.trim()).filter(Boolean));
  targets = catalog.filter((e) => ids.has(String(e.id)));
} else if (rangeArg) {
  const [a, b] = rangeArg.split('-').map((n) => Number.parseInt(n, 10));
  const pool = family ? catalog.filter((e) => ((e.reaudit as AnyRecord | undefined)?.family) === family) : catalog;
  targets = pool.slice(a, b + 1);
}
if (targets.length === 0) { console.error('no targets'); process.exit(1); }

const skeletons = targets.map((e) => {
  const reaudit = ((e.reaudit as AnyRecord | undefined) ?? {});
  const officialUrl = typeof e.officialUrl === 'string' ? e.officialUrl : (typeof e.url === 'string' ? e.url : '');
  return {
    ...e,
    publishability: 'PARTIAL',
    reaudit: {
      ...reaudit,
      status: 'PARTIAL',
      auditDate: AUDIT_DATE,
      timezone: 'Asia/Tokyo',
      method: 'MANUAL_REAUDIT',
      lane,
      auditOwner: `lane:${lane} (fill: agent name)`,
      // 調査担当が埋める: 確認した出典を1件ずつ追加する。rightsTier は TIER1_OFFICIAL / TIER1_PUBLIC_RECORD / TIER1_PLATFORM / TIER2_FACTS_ONLY のいずれか。
      sources: [
        ...(Array.isArray(reaudit.sources) ? (reaudit.sources as AnyRecord[]) : []),
      ],
      supported: [],
      unknown: ['月商・利益・原価・手残りの実額', 'チーム規模・稼働時間・初期資本', '創業年・現在の稼働状況', '集客経路・ツール構成'],
      unresearched: [],
      conflicts: Array.isArray(reaudit.conflicts) ? reaudit.conflicts : [],
      narrativeStatus: reaudit.narrativeStatus ?? 'AI_GENERATED_UNVERIFIED_AMOUNTS_REDACTED',
      rights: { status: 'NOT_REVIEWED', permission: 'FACTS_ONLY_WITH_ATTRIBUTION', basis: '事実のみ表示。原文・画像は転載しない。出典名・URL・日付を表示する。' },
      legacyDisplaySnapshot: reaudit.legacyDisplaySnapshot ?? { status: 'NOT_CAPTURED', supersededAt: AUDIT_DATE },
      skeletonNote: `雛形生成 ${AUDIT_DATE}。officialUrl=${officialUrl || '(none)'}。事実を確認したら supported[] と evidenceCards を更新し、pnl は根拠が無ければ数値0・全項目 unconfirmed のまま。本人申告は revenueLabel と reportedMetrics に「本人申告・発言日・期間・URL」付きで記録する。`,
    },
  };
});

writeFileSync(resolve(process.cwd(), out), JSON.stringify(skeletons, null, 2), 'utf8');
console.log(`✓ ${skeletons.length} skeleton(s) → ${out}`);
for (const s of skeletons as AnyRecord[]) console.log(`- ${String(s.id)} | ${String(s.name)} | ${String(s.officialUrl ?? s.url ?? '')}`);
