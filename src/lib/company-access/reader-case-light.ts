import type { ReaderCase } from '@/shared/reader-case';

/**
 * 一覧用の軽い形。metrics、概要の事実（summaryFactId が指すもの）、unknowns だけを残す。
 * 使う出典（metrics と概要の事実が指すもの）だけを sources に残すので、ReaderCaseSchema をそのまま通る。
 */
export function lightReader(reader: ReaderCase): ReaderCase {
  const summary = reader.summaryFactId ? reader.facts.find((f) => f.id === reader.summaryFactId) : undefined;
  const facts = summary ? [summary] : [];
  const need = new Set<string>([...reader.metrics.map((m) => m.sourceId), ...facts.map((f) => f.sourceId)]);
  return {
    sources: reader.sources.filter((s) => need.has(s.id)),
    facts,
    metrics: reader.metrics,
    unknowns: reader.unknowns,
    analysis: [],
    ...(summary ? { summaryFactId: summary.id } : {}),
  };
}
