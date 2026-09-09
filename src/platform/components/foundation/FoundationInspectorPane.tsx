'use client';

import React from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  X,
} from 'lucide-react';
import type {
  FoundationBusinessCase,
  FoundationClaim,
  FoundationEntitySummary,
  FoundationEvent,
  FoundationMetricSignal,
  FoundationMoneySignal,
  FoundationObservation,
  FoundationRelationship,
} from '@/lib/foundation/business-reader';

interface FoundationInspectorPaneProps {
  entity: FoundationEntitySummary | null;
  detail: FoundationBusinessCase | null;
  detailLoading: boolean;
  onClose: () => void;
  onPrevEntity?: () => void;
  onNextEntity?: () => void;
}

function statusClass(status: string): string {
  if (status === 'SUPPORTED' || status === 'ACTIVE') {
    return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
  }
  if (status === 'CONFLICTED' || status === 'RETRACTED') {
    return 'text-red-300 border-red-500/30 bg-red-500/10';
  }
  return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
}

function valueLabel(value: number | string | null, currency: string | null, unit: string | null): string {
  if (value === null) return '未確認';
  const prefix = currency ? `${currency} ` : '';
  const suffix = unit && unit !== currency ? ` (${unit})` : '';
  return `${prefix}${typeof value === 'number' ? value.toLocaleString() : value}${suffix}`;
}

function publicUrl(identifier: string | null): string | null {
  if (!identifier) return null;
  if (/^https?:\/\//i.test(identifier)) return identifier;
  if (identifier.startsWith('domain:')) return `https://${identifier.slice('domain:'.length)}`;
  return null;
}

function timeLabel(
  periodStart: string | null,
  periodEnd: string | null,
  pointInTime: string | null
): string {
  if (periodStart || periodEnd) return `${periodStart || '?'} – ${periodEnd || '?'}`;
  return pointInTime || '時点未確認';
}

function FactStatus({ status, originType }: { status: string; originType: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-mono">
      <span className={`rounded border px-1 py-0.5 ${statusClass(status)}`}>{status}</span>
      <span className="text-zinc-500">{originType}</span>
    </span>
  );
}

function MetricRow({ metric }: { metric: FoundationMetricSignal }) {
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] text-zinc-200 font-mono break-all">{metric.metricType}</span>
        <FactStatus status={metric.verificationStatus} originType={metric.originType} />
      </div>
      <div className="text-[12px] text-white font-mono tabular-nums">
        {valueLabel(metric.value, metric.currency, metric.unit)}
      </div>
      <div className="text-[10px] text-zinc-500 font-mono">
        {timeLabel(metric.periodStart, metric.periodEnd, metric.pointInTime)}
        {metric.scope ? ` · ${metric.scope}` : ''}
      </div>
      {metric.basis && <div className="text-[10px] text-zinc-400 leading-relaxed">根拠: {metric.basis}</div>}
    </div>
  );
}

function MoneySignalRow({ signal }: { signal: FoundationMoneySignal }) {
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] text-zinc-200 font-mono">{signal.moneyType}</span>
        <FactStatus status={signal.verificationStatus} originType={signal.originType} />
      </div>
      <div className="text-[12px] text-white font-mono tabular-nums">
        {valueLabel(signal.amount, signal.currency, signal.unit)}
      </div>
      <div className="text-[10px] text-zinc-500 leading-relaxed">
        {signal.amountLabel || signal.purpose || '目的未確認'}
        {signal.scope ? ` · ${signal.scope}` : ''}
      </div>
      <div className="text-[10px] text-zinc-500 font-mono">
        {timeLabel(signal.periodStart, signal.periodEnd, signal.pointInTime)}
      </div>
    </div>
  );
}

function ClaimRow({ claim }: { claim: FoundationClaim }) {
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] text-zinc-600 font-mono">{claim.id}</span>
        <FactStatus status={claim.verificationStatus} originType={claim.originType} />
      </div>
      <p className="text-[11px] text-zinc-300 leading-relaxed">{claim.statement}</p>
    </div>
  );
}

function ObservationRow({ observation }: { observation: FoundationObservation }) {
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {observation.kind && <span className="text-[9px] text-zinc-300 font-mono">{observation.kind}</span>}
        {observation.collectionTier && (
          <span className="text-[9px] text-zinc-500 font-mono">tier={observation.collectionTier}</span>
        )}
        <FactStatus status={observation.verificationStatus} originType={observation.originType} />
      </div>
      <p className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{observation.text}</p>
      <div className="text-[9px] text-zinc-600 font-mono">
        {observation.collectionChannel || 'collection channel unknown'}
        {observation.observedAt ? ` · ${observation.observedAt}` : ''}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: FoundationEvent }) {
  return (
    <div className="flex gap-2 border-l border-white/[0.12] pl-2">
      <div className="min-w-[82px] text-[9px] text-zinc-500 font-mono">{event.occurredAt || '日付未確認'}</div>
      <div className="min-w-0 space-y-1">
        <div className="text-[10px] text-zinc-200 font-mono">{event.eventType}</div>
        <div className="text-[11px] text-zinc-400 leading-relaxed">{event.description}</div>
        <FactStatus status={event.verificationStatus} originType="event" />
      </div>
    </div>
  );
}

function RelationshipRow({ relationship }: { relationship: FoundationRelationship }) {
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2 text-[10px] leading-relaxed">
      <span className="text-zinc-200 font-mono">{relationship.predicate}</span>
      <span className="text-zinc-500"> → {relationship.object || '対象未確認'}</span>
      <div className="mt-1">
        <FactStatus status={relationship.verificationStatus} originType="relationship" />
      </div>
    </div>
  );
}

export const FoundationInspectorPane: React.FC<FoundationInspectorPaneProps> = ({
  entity,
  detail,
  detailLoading,
  onClose,
  onPrevEntity,
  onNextEntity,
}) => {
  if (!entity) return null;
  const entityUrl = publicUrl(entity.canonicalIdentifier);

  return (
    <aside className="fixed inset-y-0 right-0 z-30 w-full md:w-[440px] lg:w-[480px] xl:w-[520px] bg-[#08090C] border-l border-white/[0.08] shadow-2xl overflow-y-auto">
      <div className="sticky top-0 z-10 bg-[#08090C]/95 backdrop-blur border-b border-white/[0.08] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-mono text-zinc-500 tracking-wider">FOUNDATION / R2 LAKE</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${statusClass(entity.status)}`}>
                {entity.status}
              </span>
            </div>
            <h2 className="text-base font-semibold text-white truncate">{entity.name}</h2>
            <div className="text-[10px] text-zinc-500 font-mono mt-1 truncate">{entity.id}</div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-zinc-500 hover:text-white" aria-label="閉じる">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={onPrevEntity} disabled={!onPrevEntity} className="p-1.5 rounded border border-white/[0.08] text-zinc-400 hover:text-white disabled:opacity-30">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={onNextEntity} disabled={!onNextEntity} className="p-1.5 rounded border border-white/[0.08] text-zinc-400 hover:text-white disabled:opacity-30">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {entityUrl && (
            <a href={entityUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-emerald-300 font-mono">
              公開ページ <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <section className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2">
            <div className="text-zinc-600">entity_type</div>
            <div className="mt-1 text-zinc-200 break-words">{entity.entityType}</div>
          </div>
          <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2">
            <div className="text-zinc-600">domain</div>
            <div className="mt-1 text-zinc-200 break-words">{entity.domain || '未確認'}</div>
          </div>
          <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2">
            <div className="text-zinc-600">根拠</div>
            <div className="mt-1 text-zinc-200">{entity.evidenceIds.length}件</div>
          </div>
          <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2">
            <div className="text-zinc-600">観測時点</div>
            <div className="mt-1 text-zinc-200 break-words">{entity.observedAt || '未確認'}</div>
          </div>
        </section>

        {entity.aliases.length > 0 && (
          <section>
            <div className="text-[10px] text-zinc-500 font-mono mb-2">ALIASES</div>
            <div className="flex flex-wrap gap-1">
              {entity.aliases.map((alias) => <span key={alias} className="text-[10px] text-zinc-300 rounded bg-white/[0.05] px-1.5 py-1 font-mono">{alias}</span>)}
            </div>
          </section>
        )}

        {detailLoading && (
          <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono rounded border border-white/[0.08] p-3">
            <span className="h-3 w-3 animate-spin rounded-full border border-zinc-500 border-t-emerald-300" />
            関連するresearch-bundleをR2から読み込み中…
          </div>
        )}

        {detail && !detailLoading && (
          <>
            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider">METRICS / 実績・価格・コスト</div>
                <span className="text-[9px] text-zinc-600 font-mono">{detail.metrics.length}件</span>
              </div>
              {detail.metrics.length > 0 ? (
                <div className="space-y-2 max-h-[430px] overflow-y-auto pr-1">{detail.metrics.map((metric) => <MetricRow key={metric.id} metric={metric} />)}</div>
              ) : (
                <div className="text-[11px] text-amber-300/80 border border-amber-500/20 rounded p-3">数値Metricは未確認。売上・利益・手取りを推定で埋めていません。</div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider">MONEY SIGNALS / 金の流れ</div>
                <span className="text-[9px] text-zinc-600 font-mono">{detail.moneySignals.length}件</span>
              </div>
              {detail.moneySignals.length > 0 ? (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">{detail.moneySignals.map((signal) => <MoneySignalRow key={signal.id} signal={signal} />)}</div>
              ) : (
                <div className="text-[11px] text-zinc-500 border border-white/[0.06] rounded p-3">支払者・受取者・金額の紐付けは未確認。</div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider">OBSERVATIONS / UNIVERSAL STREAM</div>
                <span className="text-[9px] text-zinc-600 font-mono">{detail.observations.length}件</span>
              </div>
              {detail.observations.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">{detail.observations.map((observation) => <ObservationRow key={observation.id} observation={observation} />)}</div>
              ) : (
                <div className="text-[11px] text-zinc-500 border border-white/[0.06] rounded p-3">自由観測は未確認。</div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider">TIMELINE / EVENTS</div>
                <span className="text-[9px] text-zinc-600 font-mono">{detail.events.length}件</span>
              </div>
              {detail.events.length > 0 ? <div className="space-y-3">{detail.events.map((event) => <EventRow key={event.id} event={event} />)}</div> : <div className="text-[11px] text-zinc-500 border border-white/[0.06] rounded p-3">イベントは未確認。</div>}
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider">CLAIMS / 主張</div>
                <span className="text-[9px] text-zinc-600 font-mono">{detail.claims.length}件</span>
              </div>
              {detail.claims.length > 0 ? <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">{detail.claims.map((claim) => <ClaimRow key={claim.id} claim={claim} />)}</div> : <div className="text-[11px] text-zinc-500 border border-white/[0.06] rounded p-3">主張は未確認。</div>}
            </section>

            {detail.relationships.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] text-zinc-500 font-mono tracking-wider">RELATIONSHIPS / 依存・競合</div>
                  <span className="text-[9px] text-zinc-600 font-mono">{detail.relationships.length}件</span>
                </div>
                <div className="space-y-2">{detail.relationships.map((relationship) => <RelationshipRow key={relationship.id} relationship={relationship} />)}</div>
              </section>
            )}
          </>
        )}

        {!detail && !detailLoading && (
          <div className="flex gap-2 rounded border border-amber-500/20 bg-amber-500/[0.04] p-3 text-[11px] text-amber-200/80 leading-relaxed">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
            関連データを取得できませんでした。R2のcanonical Entityだけを表示しており、未確認の数値や説明は補っていません。
          </div>
        )}

        <div className="border-t border-white/[0.06] pt-3 text-[9px] text-zinc-600 font-mono flex items-center gap-1">
          <FileText className="h-3 w-3" />
          source: Foundation typed dataset / immutable research-bundle read
        </div>
      </div>
    </aside>
  );
};
