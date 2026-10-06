/**
 * 事例の根拠（事実・数字・出典本文）の指紋と差分。新しい根拠が入った事例だけを、既存の文と「不明」判定も含めて再評価に回す。
 * 純粋関数だけを持つ。保存先は data/analyze/evidence-current.json（今の根拠）と evidence-reviewed.json（前回の評価時の根拠）。
 */
import { textHash } from './source-chunks';
import type { ReaderCase } from '../../src/shared/reader-case';

export const EVIDENCE_CURRENT_FILE = 'data/analyze/evidence-current.json';
export const EVIDENCE_REVIEWED_FILE = 'data/analyze/evidence-reviewed.json';

/** 再評価の束を作ったが、まだ受理されていない事例の根拠の指紋。merge-analysis.ts が受理後に reviewed へ進める */
export const EVIDENCE_PENDING_FILE = 'data/analyze/evidence-pending.json';

/** id → 内容の指紋 */
export interface EvidenceDigest {
  facts: Record<string, string>;
  metrics: Record<string, string>;
  /** 出典ID → 本文全文の指紋。本文が取れていない出典は載せない */
  sources: Record<string, string>;
}
export type EvidenceDigestFile = Record<string, EvidenceDigest>;

export function digestEvidence(
  facts: readonly { id: string; kind: string; text: string; attribution?: unknown }[],
  metrics: readonly { id: string; line: string }[],
  sourceTexts: Readonly<Record<string, string>>,
): EvidenceDigest {
  return {
    facts: Object.fromEntries(facts.map((f) => [f.id, textHash(JSON.stringify([f.kind, f.text, f.attribution ?? null]))])),
    metrics: Object.fromEntries(metrics.map((m) => [m.id, textHash(m.line)])),
    sources: Object.fromEntries(Object.entries(sourceTexts).map(([id, t]) => [id, textHash(t)])),
  };
}

export interface EvidenceDiff {
  newFactIds: string[];
  changedFactIds: string[];
  newMetricIds: string[];
  changedMetricIds: string[];
  newSourceIds: string[];
  changedSourceIds: string[];
  /** 新しい根拠（追加・変更）が1つでもあるか。減っただけ（根拠の削除）は再評価の対象にしない */
  hasNew: boolean;
}

function diffMap(prev: Record<string, string>, cur: Record<string, string>): { added: string[]; changed: string[] } {
  const added: string[] = [];
  const changed: string[] = [];
  for (const [id, h] of Object.entries(cur)) {
    if (!(id in prev)) added.push(id);
    else if (prev[id] !== h) changed.push(id);
  }
  return { added, changed };
}

export function diffEvidence(prev: EvidenceDigest, cur: EvidenceDigest): EvidenceDiff {
  const f = diffMap(prev.facts, cur.facts);
  const m = diffMap(prev.metrics, cur.metrics);
  const s = diffMap(prev.sources, cur.sources);
  return {
    newFactIds: f.added, changedFactIds: f.changed,
    newMetricIds: m.added, changedMetricIds: m.changed,
    newSourceIds: s.added, changedSourceIds: s.changed,
    hasNew: [f, m, s].some((x) => x.added.length + x.changed.length > 0),
  };
}

/** 「未確認」の項目と、それを推論で埋める分析項目の対応 */
export const UNKNOWN_TO_ANALYSIS: Record<string, string> = {
  REVENUE: 'REVENUE_ESTIMATE',
  PROFIT: 'TAKE_HOME',
  COST: 'COST_STRUCTURE',
  TEAM: 'CAPITAL_AND_TEAM',
  CHANNEL: 'CHANNELS',
  TOOLS: 'TOOLS',
  PRICING: 'PRICING',
};

export interface ReevaluationTargets {
  /** 今回返してもらう項目（空欄・既存・未確認の和） */
  items: string[];
  /** 事実が無く「未確認」になっている項目に対応する分析項目（既存の「不明」判定の再評価対象） */
  unknownItems: string[];
  /** 根拠が空の推論（事実に拠らない文＝実質「不明」）の項目。確度ラベルは廃止したので見ない */
  weakItems: string[];
}

/**
 * 新しい根拠が入った事例の再評価対象。空欄だけでなく、既存の文すべてと、「不明」になっている項目も含める。
 * 呼び出し側は hasNew の時だけ使う。
 */
export function reevaluationTargets(reader: Pick<ReaderCase, 'analysis' | 'unknowns'>, missing: readonly string[]): ReevaluationTargets {
  const existing = reader.analysis.map((a) => a.item as string);
  const unknownItems = reader.unknowns.map((u) => UNKNOWN_TO_ANALYSIS[u]).filter((x): x is string => !!x);
  const weakItems = reader.analysis.filter((a) => a.basis.length === 0).map((a) => a.item as string);
  return { items: [...new Set([...missing, ...existing, ...unknownItems])], unknownItems: [...new Set(unknownItems)], weakItems: [...new Set(weakItems)] };
}
