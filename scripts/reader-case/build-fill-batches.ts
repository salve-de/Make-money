/**
 * 分析済みの事例のうち、次の2種類だけを集めて Codex に渡す入力（data/analyze/batches/add-NNN.json / re-NNN.json）を作る。
 *  1. 空欄補充（add-）: 必須項目が空いたままの事例。空いた項目だけを onlyItems に載せる。
 *  2. 再評価（re-）: 前回の評価から新しい根拠（事実・数字・出典本文の追加や変更）が入った事例。
 *     空欄だけでなく、既存の文すべてと「未確認」になっている項目（事実が無く不明のまま）を、新しい根拠で評価し直す。
 *     入力には newEvidence（何が新しいか）、existingAnalysis（今の文）、unknownItems（不明のままの項目）を付ける。
 * 新しい根拠かどうかは data/analyze/evidence-current.json（build-analyze-batches.ts が出典全文から作る指紋）と、
 * 前回の評価時の指紋 evidence-reviewed.json の差で決める。前回の指紋が無い事例は基準を記録するだけで、空欄補充だけ行う。
 * 事例の中身（事実・出典全文）は分析に使ったバッチ（batch-*.json）から取る。先に build-analyze-batches.ts を実行して最新にしておくこと。
 * 実行: ANALYZE_PREFIX=add- ANALYZE_NOTE='各事例の onlyItems に挙げた項目だけを返す' bash scripts/reader-case/run-analyze.sh
 *       ANALYZE_PREFIX=re- ANALYZE_NOTE='各事例の onlyItems の項目を、newEvidence を踏まえて既存の文（existingAnalysis）と unknownItems を含め評価し直して返す。根拠が変わらない項目は同じ文でよい' bash scripts/reader-case/run-analyze.sh
 * 結果は merge-analysis.ts が既存の推論へ統合する。add- は既存の後ろに足し（同じ項目は既存が先勝ち）、re- は同じ項目の既存を置き換える（load-readers.ts の loadRawItems）。
 * 使い方: node --import tsx scripts/reader-case/build-fill-batches.ts --ids <候補の一覧> [--start N] [--dry-run]
 *   --dry-run: 束を書かず、基準の指紋・保留の指紋も更新しない（件数だけ表示）
 */
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import type { ReaderCase } from '../../src/shared/reader-case';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { ANALYSIS_FILE, ANALYZE_DIR, missingRequired, reflectAnalysis, type AnalysisFile } from './analysis-lib';
import { EVIDENCE_CURRENT_FILE, EVIDENCE_PENDING_FILE, EVIDENCE_REVIEWED_FILE, diffEvidence, reevaluationTargets, type EvidenceDigest, type EvidenceDigestFile, type EvidenceDiff } from './evidence-digest';
import { packByChunks, textHash } from './source-chunks';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';

const PER = 10;

/**
 * 束の名前: <prefix><連番3桁>-<中身の指紋8桁>。中身（事例・出典全文・onlyItems・newEvidence など）が変われば名前が変わるので、
 * 古い束の出力（同じ連番でも）は有効な出力として使われない（load-readers.ts の loadRawItems は束が存在する出力だけを読む）。
 */
export function bundleName(prefix: string, seq: number, cases: readonly Record<string, unknown>[]): string {
  const fp = textHash(JSON.stringify([...cases].sort((a, b) => String(a.entityId).localeCompare(String(b.entityId)))));
  return `${prefix}${String(seq).padStart(3, '0')}-${fp.slice(0, 8)}`;
}

export interface FillPlan {
  kind: 'add' | 'reevaluate';
  onlyItems: string[];
  extra: Record<string, unknown>;
}

/**
 * 1事例の扱いを決める純粋関数。
 * 新しい根拠がある → 再評価（空欄・既存の文・未確認を全部）。無ければ空欄があれば補充。どちらも無ければ null。
 */
export function planFill(reflected: Pick<ReaderCase, 'analysis' | 'unknowns' | 'facts' | 'metrics'>, diff: EvidenceDiff | null): FillPlan | null {
  const missing = missingRequired(reflected as ReaderCase);
  if (diff?.hasNew) {
    const t = reevaluationTargets(reflected, missing);
    return {
      kind: 'reevaluate',
      onlyItems: t.items,
      extra: {
        mode: 'reevaluate',
        newEvidence: {
          factIds: [...diff.newFactIds, ...diff.changedFactIds],
          metricIds: [...diff.newMetricIds, ...diff.changedMetricIds],
          sourceIds: [...diff.newSourceIds, ...diff.changedSourceIds],
        },
        unknownItems: t.unknownItems,
        weakItems: t.weakItems,
        existingAnalysis: reflected.analysis.map((a) => ({ item: a.item, text: a.text, basis: a.basis, confidence: a.confidence, ...(a.formula ? { formula: a.formula } : {}) })),
      },
    };
  }
  return missing.length ? { kind: 'add', onlyItems: missing, extra: {} } : null;
}

/**
 * 評価済みの指紋の進め方。再評価の束を作っただけでは「評価済み」にしない（pending に置く）。
 * 結果が統合（merge-analysis.ts）で受理されてから reviewed へ進める。失敗・拒否・保留なら次回も同じ新しい根拠が再評価の対象に残る。
 */
export function trackEvidence(plan: FillPlan | null, base: EvidenceDigest | undefined, cur: EvidenceDigest): { reviewed?: EvidenceDigest; pending?: EvidenceDigest; baselined: boolean } {
  if (plan?.kind === 'reevaluate') return { pending: cur, baselined: false };
  return { reviewed: cur, baselined: !base };
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const verdicts = JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')) as VerdictsFile;
  const analysis = JSON.parse(readFileSync(ANALYSIS_FILE, 'utf8')) as AnalysisFile;
  const current: EvidenceDigestFile = existsSync(EVIDENCE_CURRENT_FILE) ? (JSON.parse(readFileSync(EVIDENCE_CURRENT_FILE, 'utf8')) as EvidenceDigestFile) : {};
  const reviewed: EvidenceDigestFile = existsSync(EVIDENCE_REVIEWED_FILE) ? (JSON.parse(readFileSync(EVIDENCE_REVIEWED_FILE, 'utf8')) as EvidenceDigestFile) : {};
  const batchDir = `${ANALYZE_DIR}/batches`;
  const inputs = new Map<string, Record<string, unknown>>();
  for (const f of readdirSync(batchDir).filter((x) => /^batch-[\w-]+\.json$/.test(x)).sort()) {
    for (const c of (JSON.parse(readFileSync(`${batchDir}/${f}`, 'utf8')) as { cases: { entityId: string }[] }).cases) inputs.set(c.entityId, c);
  }
  const adds: Record<string, unknown>[] = [];
  const reevals: Record<string, unknown>[] = [];
  let baselined = 0;
  const nextReviewed = { ...reviewed };
  const nextPending: EvidenceDigestFile = {};
  for (const [id, reader] of loadReaders(readIdsFile(argValue('--ids') ?? ''))) {
    const applied = applyVerdicts(reader, verdicts[id]);
    const input = inputs.get(id);
    if (!applied || !input || !analysis[id]) continue;
    const cur = current[id];
    const base = reviewed[id];
    const diff = cur && base ? diffEvidence(base, cur) : null;
    const plan = planFill(reflectAnalysis(applied.reader, analysis[id]), diff);
    if (plan) (plan.kind === 'add' ? adds : reevals).push({ ...input, ...plan.extra, onlyItems: plan.onlyItems });
    if (cur) {
      const t = trackEvidence(plan, base, cur);
      if (t.baselined) baselined++;
      if (t.reviewed) nextReviewed[id] = t.reviewed;
      if (t.pending) nextPending[id] = t.pending;
    }
  }
  const start = Number(argValue('--start') ?? 1);
  const sourcesOf = (c: Record<string, unknown>) => (Array.isArray(c.sources) ? c.sources.length : 0);
  const write = (prefix: string, cases: Record<string, unknown>[]) => {
    const batches = packByChunks(cases, sourcesOf, PER);
    const names = batches.map((b, i) => bundleName(prefix, start + i, b));
    if (!dryRun) {
      batches.forEach((b, i) => writeFileSync(`${batchDir}/${names[i]}.json`, JSON.stringify({ batch: names[i], cases: b })));
      // 今回の束に含まれない同じ種類の古い束は消す（古い束とその出力が再び有効になるのを防ぐ）
      for (const f of readdirSync(batchDir)) if (new RegExp(`^${prefix}[\\w-]+\\.json$`).test(f) && !names.includes(f.replace(/\.json$/, ''))) unlinkSync(`${batchDir}/${f}`);
    }
    return batches.length;
  };
  const addBatches = write('add-', adds);
  const reBatches = write('re-', reevals);
  if (!dryRun) {
    writeFileSync(EVIDENCE_REVIEWED_FILE, JSON.stringify(nextReviewed, null, 1) + '\n');
    writeFileSync(EVIDENCE_PENDING_FILE, JSON.stringify(nextPending, null, 1) + '\n');
  }
  const count = (cs: Record<string, unknown>[]) => cs.reduce((s, c) => s + (c.onlyItems as string[]).length, 0);
  console.log(JSON.stringify({ add: { cases: adds.length, items: count(adds), batches: addBatches }, reevaluate: { cases: reevals.length, items: count(reevals), batches: reBatches }, baselined, dryRun }));
}

if (process.argv[1]?.endsWith('build-fill-batches.ts')) main();
