/**
 * 出典本文の照合結果（data/reader-verdicts.json）を reader に当てる。純粋関数。
 * 判定が無い主張、SUPPORTED/PARTIAL 以外、照合した時と文が変わった主張は reader に入れない。
 * PARTIAL は fix の文・値に置き換える。判定が1件も無い事例は null（未照合＝公開しない）。
 */
import { ReaderCaseSchema, FACT_KINDS, type ReaderCase } from '@/shared/reader-case';
import { computeUnknowns } from './reader-case-projection';
import { metricLine, type VerdictEntry } from '../../../scripts/reader-case/verify-lib';

type Fact = ReaderCase['facts'][number];
type Metric = ReaderCase['metrics'][number];

export interface ApplyResult {
  reader: ReaderCase;
  kept: number;
  replaced: number;
  dropped: { claimId: string; text: string; reason: 'no-verdict' | 'text-changed' | 'invalid-fix' }[];
}

const METRIC_KEYS = ['measure', 'periodKind', 'period', 'amount', 'currency', 'unit', 'origin', 'basis', 'label'] as const;

function fixMetric(m: Metric, fix: NonNullable<VerdictEntry['fix']>['metric']): Metric | null {
  if (!fix) return null;
  const next: Record<string, unknown> = { ...m };
  for (const k of METRIC_KEYS) {
    if (!(k in fix)) continue;
    const v = (fix as Record<string, unknown>)[k];
    if (v === null) delete next[k];
    else if (v !== undefined) next[k] = v;
  }
  if (next.measure !== 'OTHER' && next.label === undefined) delete next.label;
  return next as Metric;
}

export function applyVerdicts(reader: ReaderCase, verdicts: Record<string, VerdictEntry> | undefined, statusUnknown = false): ApplyResult | null {
  if (!verdicts || Object.keys(verdicts).length === 0) return null;
  const dropped: ApplyResult['dropped'] = [];
  let replaced = 0;
  const okVerdict = (id: string, text: string): VerdictEntry | null => {
    const v = verdicts[id];
    if (!v || (v.verdict !== 'SUPPORTED' && v.verdict !== 'PARTIAL')) {
      dropped.push({ claimId: id, text, reason: 'no-verdict' });
      return null;
    }
    if (v.claimText !== text) {
      dropped.push({ claimId: id, text, reason: 'text-changed' });
      return null;
    }
    return v;
  };

  const facts: Fact[] = [];
  for (const f of reader.facts) {
    const v = okVerdict(f.id, f.text);
    if (!v) continue;
    if (v.verdict === 'PARTIAL') {
      const t = v.fix?.text?.trim();
      const kind = (FACT_KINDS as readonly string[]).includes(f.kind) ? f.kind : 'OTHER';
      const cand = t ? { ...f, kind, text: t } : null;
      if (!cand || !ReaderCaseSchema.shape.facts.element.safeParse(cand).success) {
        dropped.push({ claimId: f.id, text: f.text, reason: 'invalid-fix' });
        continue;
      }
      facts.push(cand);
      replaced++;
    } else facts.push(f);
  }
  const metrics: Metric[] = [];
  for (const m of reader.metrics) {
    const v = okVerdict(m.id, metricLine(m));
    if (!v) continue;
    if (v.verdict === 'PARTIAL') {
      const cand = fixMetric(m, v.fix?.metric);
      if (!cand || !ReaderCaseSchema.shape.metrics.element.safeParse(cand).success) {
        dropped.push({ claimId: m.id, text: metricLine(m), reason: 'invalid-fix' });
        continue;
      }
      metrics.push(cand);
      replaced++;
    } else metrics.push(m);
  }

  const usedSources = new Set([...facts.map((f) => f.sourceId), ...metrics.map((m) => m.sourceId)]);
  const summaryFactId =
    reader.summaryFactId && facts.some((f) => f.id === reader.summaryFactId) ? reader.summaryFactId : facts.find((f) => f.kind === 'DESCRIPTION')?.id;
  const out: ReaderCase = {
    sources: reader.sources.filter((s) => usedSources.has(s.id)),
    facts,
    metrics,
    unknowns: computeUnknowns(facts, metrics, statusUnknown || reader.unknowns.includes('STATUS')),
    analysis: [],
    ...(summaryFactId ? { summaryFactId } : {}),
  };
  return { reader: out, kept: facts.length + metrics.length, replaced, dropped };
}
