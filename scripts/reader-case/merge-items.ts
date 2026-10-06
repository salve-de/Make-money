/**
 * 統合の純粋関数。今回の出力で通った項目を、既存の推論へ「項目単位」で重ねる。
 * - 今回通った項目は、同じ項目の既存を置き換える。
 * - 今回出なかった・基準を通らなかった項目は、既存をそのまま残す（出力が一部でも、全部落ちても、既存は消えない）。
 * - 既存の項目の並びは保ち、新しい項目は後ろに足す。
 */
import type { StoredAnalysis } from './analysis-lib';

export interface MergeOutcome {
  items: StoredAnalysis[];
  /** 今回通って置き換え・追加した項目数 */
  replaced: number;
  /** 今回通らず（または出ず）既存を残した項目数 */
  retained: number;
  /** 今回の出力が1件も通らず、既存だけが残った（既存があった時のみ true） */
  allRejected: boolean;
}

export function mergeAnalysisItems(existing: readonly StoredAnalysis[] | undefined, kept: readonly StoredAnalysis[]): MergeOutcome {
  const prev = existing ?? [];
  const fresh = new Map(kept.map((k) => [k.item as string, k]));
  const merged: StoredAnalysis[] = prev.map((p) => fresh.get(p.item as string) ?? p);
  const had = new Set(prev.map((p) => p.item as string));
  for (const k of kept) if (!had.has(k.item as string)) merged.push(k);
  const replaced = kept.length;
  const retained = prev.filter((p) => !fresh.has(p.item as string)).length;
  return { items: merged, replaced, retained, allRejected: kept.length === 0 && prev.length > 0 };
}
