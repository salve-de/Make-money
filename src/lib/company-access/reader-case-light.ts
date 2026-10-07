import type { ReaderCase } from '@/shared/reader-case';

/**
 * 一覧用の軽い形。metrics、概要の事実（summaryFactId が指すもの）、unknowns だけを残す。
 * 概要の事実が無い事例は、一覧の説明に使う強い一行（HEADLINE の推論）と、その根拠の事実だけを残す。
 * 使う出典（metrics と残した事実が指すもの）だけを sources に残すので、ReaderCaseSchema をそのまま通る。
 * listForm の印を付け、詳細を取りに行く判定（isDetailSettled）で完全な reader と区別する。
 */
export function lightReader(reader: ReaderCase): ReaderCase {
  const summary = reader.summaryFactId ? reader.facts.find((f) => f.id === reader.summaryFactId) : undefined;
  const headline = summary ? undefined : reader.analysis.find((a) => a.item === 'HEADLINE');
  const facts = summary ? [summary] : reader.facts.filter((f) => headline?.basis.includes(f.id));
  const need = new Set<string>([...reader.metrics.map((m) => m.sourceId), ...facts.map((f) => f.sourceId)]);
  return {
    sources: reader.sources.filter((s) => need.has(s.id)),
    facts,
    metrics: reader.metrics,
    unknowns: reader.unknowns,
    analysis: headline ? [headline] : [],
    ...(summary ? { summaryFactId: summary.id } : {}),
    // 一覧で使う編集文は1行だけ。章や答えは詳細にだけ付ける（一覧の容量を増やさない）
    ...(reader.display?.listLine ? { display: { listLine: reader.display.listLine } } : {}),
    listForm: true,
  };
}
