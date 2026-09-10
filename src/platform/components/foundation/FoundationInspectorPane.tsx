'use client';

import React from 'react';
import { ExternalLink, X } from 'lucide-react';
import type {
  FoundationBusinessCase,
  FoundationClaim,
  FoundationDerivedRecord,
  FoundationEvent,
  FoundationMetricSignal,
  FoundationMoneySignal,
  FoundationObservation,
  FoundationRelationship,
} from '@/lib/foundation/business-reader';
import type { FoundationValueProfile } from '@/lib/foundation/value-projection';

interface FoundationInspectorPaneProps {
  entity: FoundationBusinessCase | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

function display(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '未確認';
  return typeof value === 'number' ? value.toLocaleString() : value;
}

function dateValue(value: string | null): string {
  return value ? value.slice(0, 10) : '未確認';
}

function evidenceValue(values: string[]): string {
  return values.length > 0 ? values.join(', ') : '証拠ID未確認';
}

function Badge({ children, tone = 'zinc' }: { children: React.ReactNode; tone?: 'cyan' | 'emerald' | 'amber' | 'zinc' }) {
  const classes = {
    cyan: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/20',
    emerald: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-950/30 text-amber-300 border-amber-500/20',
    zinc: 'bg-white/[0.04] text-zinc-400 border-white/[0.08]',
  }[tone];
  return <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono ${classes}`}>{children}</span>;
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="border-b border-white/[0.06] px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold tracking-wider text-zinc-300">{title}</h3>
        <span className="font-mono text-[10px] text-zinc-600">{count}</span>
      </div>
      {count > 0 ? children : <div className="text-[11px] text-zinc-600">記録なし / 未確認</div>}
    </section>
  );
}

function ValueSummary({ profile }: { profile: FoundationValueProfile }) {
  const tone = profile.tier === 'HIGH_SIGNAL' ? 'emerald' : profile.tier === 'USEFUL' ? 'cyan' : 'amber';
  const signalRows: Array<[string, string | null]> = [
    ['事業 / 顧客課題', profile.businessSignal || profile.painSignal],
    ['価格 / 財務', profile.moneySignal],
    ['初動 / 成長', profile.tractionSignal],
    ['収益化 / 仕組み', profile.mechanismSignal],
    ['時系列', profile.timeSignal],
  ];
  const rows = signalRows.filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <section className="border-b border-white/[0.06] bg-white/[0.015] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">VALUE SNAPSHOT</div>
          <div className="mt-1 text-[11px] text-zinc-500">bundleに実際にある信号だけを要約</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge tone={tone}>{profile.tier}</Badge>
          <span className="font-mono text-[10px] text-zinc-500">coverage {profile.score}/10</span>
        </div>
      </div>
      {rows.length > 0 ? (
        <div className="mt-3 space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded border border-white/[0.06] bg-white/[0.02] p-2">
              <div className="text-[10px] text-zinc-600">{label}</div>
              <div className="mt-1 text-[11px] leading-relaxed text-zinc-200">{value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 text-[11px] text-zinc-600">事業・価格・初動に使える記録がまだありません。候補として保持しています。</div>
      )}
      <div className="mt-2 text-[10px] text-zinc-600">
        {profile.labels.length > 0 ? profile.labels.join(' ・ ') : '表示信号なし'} ・ evidence {profile.counts.evidence}
      </div>
    </section>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-white/[0.04] py-1.5 last:border-0">
      <span className="w-24 shrink-0 text-[10px] text-zinc-600">{label}</span>
      <span className="min-w-0 break-words text-[11px] text-zinc-300">{value}</span>
    </div>
  );
}

function ClaimCard({ item }: { item: FoundationClaim }) {
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="cyan">{item.originType}</Badge>
        <Badge tone={item.verificationStatus === 'SUPPORTED' ? 'emerald' : 'amber'}>{item.verificationStatus}</Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-200">{item.statement}</p>
      <div className="mt-2 text-[10px] text-zinc-600">{dateValue(item.occurredAt)} ・ {evidenceValue(item.evidenceIds)}</div>
    </div>
  );
}

function MetricCard({ item }: { item: FoundationMetricSignal }) {
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium text-white">{item.metricType}</span>
        <span className="font-mono text-xs tabular-nums text-emerald-300">{display(item.value)} {display(item.currency || item.unit)}</span>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-zinc-500">
        <span>basis: {display(item.basis)}</span>
        <span>scope: {display(item.scope)}</span>
        <span>origin: {item.originType}</span>
        <span>status: {item.verificationStatus}</span>
        <span>period: {dateValue(item.periodStart)}–{dateValue(item.periodEnd)}</span>
        <span>evidence: {item.evidenceIds.length}</span>
      </div>
    </div>
  );
}

function MoneyCard({ item }: { item: FoundationMoneySignal }) {
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-zinc-200">{item.moneyType}</span>
        <span className="font-mono text-xs tabular-nums text-amber-300">{display(item.amountLabel || item.amount)} {display(item.currency || item.unit)}</span>
      </div>
      <div className="mt-1.5 space-y-1 text-[10px] text-zinc-500">
        <div>purpose: {display(item.purpose)} ・ basis: {display(item.basis)}</div>
        <div>origin: {item.originType} ・ status: {item.verificationStatus} ・ evidence: {item.evidenceIds.length}</div>
      </div>
    </div>
  );
}

function EventCard({ item }: { item: FoundationEvent }) {
  return (
    <div className="border-l border-cyan-500/30 pl-3">
      <div className="flex flex-wrap gap-1.5"><Badge tone="cyan">{item.eventType}</Badge><Badge>{item.verificationStatus}</Badge></div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-300">{item.description}</p>
      <div className="mt-1 text-[10px] text-zinc-600">{dateValue(item.occurredAt)} ・ {evidenceValue(item.evidenceIds)}</div>
    </div>
  );
}

function RelationshipCard({ item }: { item: FoundationRelationship }) {
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2.5 text-[11px]">
      <div className="text-cyan-300">{item.predicate}</div>
      <div className="mt-1 text-zinc-300">{display(item.object)}</div>
      <div className="mt-1 text-[10px] text-zinc-600">{item.verificationStatus} ・ {dateValue(item.validFrom)}–{dateValue(item.validTo)}</div>
    </div>
  );
}

function ObservationCard({ item }: { item: FoundationObservation }) {
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="flex flex-wrap gap-1.5"><Badge tone="zinc">{display(item.kind)}</Badge><Badge>{item.originType}</Badge><Badge>{item.verificationStatus}</Badge></div>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-300">{item.text}</p>
      <div className="mt-1 text-[10px] text-zinc-600">{dateValue(item.observedAt)} ・ {display(item.collectionChannel)} ・ evidence: {item.evidenceIds.length}</div>
    </div>
  );
}

function DerivedCard({ item }: { item: FoundationDerivedRecord }) {
  return (
    <div className="rounded border border-amber-500/20 bg-amber-950/10 p-2.5">
      <div className="flex flex-wrap gap-1.5"><Badge tone="amber">{item.type}</Badge><Badge tone="amber">{item.originType}</Badge></div>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-300">{item.text}</p>
      <div className="mt-1 text-[10px] text-zinc-600">confidence: {display(item.confidence)} ・ supporting evidence: {item.supportingEvidenceIds.length}</div>
    </div>
  );
}

export const FoundationInspectorPane: React.FC<FoundationInspectorPaneProps> = ({
  entity,
  loading,
  error,
  onClose,
}) => {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden" />
      <aside className="fixed md:static inset-x-0 bottom-0 z-40 flex h-full max-h-[92vh] w-full shrink-0 flex-col overflow-hidden border-t border-white/[0.06] bg-[#08090C] shadow-2xl md:max-h-none md:min-w-[480px] md:border-l md:border-t-0">
        <div className="shrink-0 border-b border-white/[0.06] bg-[#07080B] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="emerald">FOUNDATION LAKE</Badge>
                <Badge>READ-ONLY</Badge>
                {entity && <Badge tone="cyan">{entity.entityType}</Badge>}
                {entity && <Badge tone={entity.valueProfile.tier === 'HIGH_SIGNAL' ? 'emerald' : entity.valueProfile.tier === 'USEFUL' ? 'cyan' : 'amber'}>{entity.valueProfile.tier}</Badge>}
              </div>
              <h2 className="mt-2 truncate font-sans text-base font-bold text-white">{entity?.name || (loading ? '読み込み中...' : '未選択')}</h2>
              {entity && <div className="mt-1 truncate font-mono text-[10px] text-zinc-600">{entity.id}</div>}
            </div>
            <button type="button" onClick={onClose} className="shrink-0 p-1 text-zinc-500 transition-colors hover:text-white" aria-label="閉じる"><X className="h-4 w-4" /></button>
          </div>
          {entity && (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-zinc-500">
              <span>status: <strong className="text-zinc-300">{entity.status}</strong></span>
              <span>observed: <strong className="text-zinc-300">{dateValue(entity.observedAt)}</strong></span>
              <span className="truncate">domain: {display(entity.domain)}</span>
              <span>evidence: {entity.evidenceIds.length}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-5 text-center font-mono text-xs text-zinc-500">関連bundleを読み取り中...</div>}
          {error && <div className="m-4 rounded border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-300">{error}</div>}
          {entity && !loading && !error && (
            <>
              <ValueSummary profile={entity.valueProfile} />
              <Section title="IDENTITY" count={1}>
                <div className="space-y-0.5">
                  <MetaLine label="canonical" value={display(entity.canonicalIdentifier)} />
                  <MetaLine label="domain" value={display(entity.domain)} />
                  <MetaLine label="aliases" value={entity.aliases.length > 0 ? entity.aliases.join(', ') : '未確認'} />
                  <MetaLine label="evidence IDs" value={evidenceValue(entity.evidenceIds)} />
                  {entity.domain && <a href={`https://${entity.domain}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"><ExternalLink className="h-3 w-3" />公式ドメインを開く</a>}
                </div>
              </Section>
              <Section title="CLAIMS" count={entity.claims.length}><div className="space-y-2">{entity.claims.map((item) => <ClaimCard key={item.id} item={item} />)}</div></Section>
              <Section title="METRICS / PRICE ANCHORS" count={entity.metrics.length}><div className="space-y-2">{entity.metrics.map((item) => <MetricCard key={item.id} item={item} />)}</div></Section>
              <Section title="MONEY SIGNALS" count={entity.moneySignals.length}><div className="space-y-2">{entity.moneySignals.map((item) => <MoneyCard key={item.id} item={item} />)}</div></Section>
              <Section title="EVENTS / TIMELINE" count={entity.events.length}><div className="space-y-3">{entity.events.map((item) => <EventCard key={item.id} item={item} />)}</div></Section>
              <Section title="RELATIONSHIPS" count={entity.relationships.length}><div className="space-y-2">{entity.relationships.map((item) => <RelationshipCard key={item.id} item={item} />)}</div></Section>
              <Section title="OBSERVATIONS / FIELD NOTES" count={entity.observations.length}><div className="space-y-2">{entity.observations.map((item) => <ObservationCard key={item.id} item={item} />)}</div></Section>
              <Section title="DERIVED / INFERRED" count={entity.derived.length}><div className="space-y-2">{entity.derived.map((item) => <DerivedCard key={item.id} item={item} />)}</div></Section>
              <div className="px-4 py-3 font-mono text-[10px] text-zinc-600">bundles scanned: {entity.bundlesScanned.toLocaleString()} ・ listed: {entity.bundleObjectsListed.toLocaleString()}<br />R2正本は変更していません。未記録の財務値は未確認のままです。</div>
            </>
          )}
        </div>
      </aside>
    </>
  );
};
