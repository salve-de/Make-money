'use client';

import React, { useMemo, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import type {
  FoundationBusinessCase,
  FoundationClaim,
  FoundationEvent,
  FoundationMetricSignal,
  FoundationMoneySignal,
  FoundationObservation,
  FoundationRelationship,
} from '@/lib/foundation/business-reader';
import {
  buildFoundationDossierProjection,
  type DossierModule,
  type DossierRow,
} from '@/lib/foundation/dossier-projection';
import {
  humanizeVerificationStatus,
  cleanMetricLabel,
  cleanIntelligenceText,
  formatHumanMoney,
} from '@/lib/foundation/text-cleaner';

interface FoundationInspectorPaneProps {
  entity: FoundationBusinessCase | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

type Tab = 'CORE' | 'FINANCIALS' | 'PLAYBOOK' | 'STREAM' | 'EVIDENCE';

function display(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '未確認';
  return typeof value === 'number' ? value.toLocaleString() : value;
}

function dateValue(value: string | null): string {
  return value ? value.slice(0, 10) : '時期未確認';
}

function Badge({
  children,
  tone = 'zinc',
}: {
  children: React.ReactNode;
  tone?: 'cyan' | 'emerald' | 'amber' | 'red' | 'zinc';
}) {
  const classes = {
    cyan: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/25',
    emerald: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/25',
    amber: 'bg-amber-950/30 text-amber-300 border-amber-500/25',
    red: 'bg-red-950/30 text-red-300 border-red-500/25',
    zinc: 'bg-white/[0.04] text-zinc-400 border-white/[0.08]',
  }[tone];
  return <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-mono ${classes}`}>{children}</span>;
}

function caseLevelBadge(level: string) {
  switch (level) {
    case 'FULL_DOSSIER':
      return { label: '完全解剖ドシエ', tone: 'emerald' as const };
    case 'FOCUSED_CASE':
      return { label: '重点事例ドシエ', tone: 'cyan' as const };
    default:
      return { label: 'シグナル観測中', tone: 'zinc' as const };
  }
}

function originTypeLabel(origin?: string): string {
  if (!origin) return '';
  switch (origin) {
    case 'reported': return '公表値';
    case 'calculated': return '逆算値';
    case 'inferred': return '推計';
    case 'observed': return '観測値';
    case 'event': return 'イベント';
    case 'relationship': return '関係性';
    default: return origin;
  }
}

function Row({ row }: { row: DossierRow }) {
  const statusInfo = humanizeVerificationStatus(row.verificationStatus);
  const cleanVal = cleanIntelligenceText(row.value);
  const cleanNt = row.note ? cleanIntelligenceText(row.note) : undefined;
  return (
    <div className="border-b border-white/[0.04] px-3 py-2.5 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="w-28 shrink-0 font-sans text-[11px] font-medium text-zinc-400">{row.label}</div>
        <div className="min-w-0 flex-1">
          <div className="font-sans text-[11px] leading-relaxed text-zinc-100">{cleanVal}</div>
          {(cleanNt || row.originType || row.verificationStatus || row.evidenceIds.length > 0) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {row.originType && <Badge tone="zinc">{originTypeLabel(row.originType)}</Badge>}
              {row.verificationStatus && <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>}
              {row.evidenceIds.length > 0 && <span className="font-mono text-[9px] text-zinc-600">根拠 {row.evidenceIds.length}件</span>}
              {cleanNt && <span className="font-sans text-[9px] text-zinc-500">{cleanNt}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ module, index }: { module: DossierModule; index: number }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded border border-white/[0.08] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[9px] font-bold text-zinc-400">
            #{String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <div className="truncate font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">{module.eyebrow}</div>
            <h3 className="truncate text-xs font-bold text-zinc-100">{module.title}</h3>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {module.analysis && <Badge tone="amber">分析</Badge>}
          {module.evidenceIds.length > 0 && <span className="font-mono text-[9px] text-zinc-600">根拠 {module.evidenceIds.length}件</span>}
        </div>
      </div>
      <div className="overflow-hidden rounded-md border border-white/[0.08] bg-[#0A0C10] shadow-sm">
        {module.summary && <div className="border-b border-white/[0.05] px-3 py-2.5 text-[11px] font-medium leading-relaxed text-white">{cleanIntelligenceText(module.summary)}</div>}
        {module.body.map((text, bodyIndex) => (
          <p key={bodyIndex} className="border-b border-white/[0.04] px-3 py-2.5 text-[11px] leading-relaxed text-zinc-300">{cleanIntelligenceText(text)}</p>
        ))}
        {module.rows.map((row, rowIndex) => <Row key={`${module.id}-${rowIndex}`} row={row} />)}
      </div>
    </section>
  );
}

function EmptyModules({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-4 text-[11px] leading-relaxed text-zinc-500">
      {text}
    </div>
  );
}

function RawClaim({ item }: { item: FoundationClaim }) {
  const statusInfo = humanizeVerificationStatus(item.verificationStatus);
  const cleanStatement = cleanIntelligenceText(item.statement);
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="flex flex-wrap items-center gap-1">
        <Badge tone="zinc">{originTypeLabel(item.originType)}</Badge>
        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
      </div>
      <div className="mt-2 font-sans text-[11px] leading-relaxed text-zinc-300">{cleanStatement}</div>
      <div className="mt-1.5 font-mono text-[9px] text-zinc-600">{dateValue(item.occurredAt)} ・ 根拠 {item.evidenceIds.length}件</div>
    </div>
  );
}

function RawEvent({ item }: { item: FoundationEvent }) {
  const statusInfo = humanizeVerificationStatus(item.verificationStatus);
  const cleanDesc = cleanIntelligenceText(item.description);
  return (
    <div className="border-l border-cyan-500/30 pl-3">
      <div className="flex flex-wrap items-center gap-1">
        <Badge tone="cyan">{item.eventType}</Badge>
        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
      </div>
      <div className="mt-1.5 font-sans text-[11px] leading-relaxed text-zinc-300">{cleanDesc}</div>
      <div className="mt-1 font-mono text-[9px] text-zinc-600">{dateValue(item.occurredAt)} ・ 根拠 {item.evidenceIds.length}件</div>
    </div>
  );
}

function RawObservation({ item }: { item: FoundationObservation }) {
  const statusInfo = humanizeVerificationStatus(item.verificationStatus);
  const cleanText = cleanIntelligenceText(item.text);
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="flex flex-wrap items-center gap-1">
        <Badge tone="zinc">{item.kind || '観測'}</Badge>
        <Badge tone="zinc">{originTypeLabel(item.originType)}</Badge>
        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
      </div>
      <div className="mt-2 font-sans text-[11px] leading-relaxed text-zinc-300">{cleanText}</div>
      <div className="mt-1.5 font-mono text-[9px] text-zinc-600">{dateValue(item.observedAt)} ・ 根拠 {item.evidenceIds.length}件</div>
    </div>
  );
}

function RawRelationship({ item }: { item: FoundationRelationship }) {
  const statusInfo = humanizeVerificationStatus(item.verificationStatus);
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="font-mono text-[10px] font-bold text-cyan-300">{item.predicate}</div>
      <div className="mt-1 text-[11px] text-zinc-300">{display(item.object)}</div>
      <div className="mt-1 font-mono text-[9px] text-zinc-600">{statusInfo.label} ・ 根拠 {item.evidenceIds.length}件</div>
    </div>
  );
}

function RawMetric({ item }: { item: FoundationMetricSignal }) {
  const statusInfo = humanizeVerificationStatus(item.verificationStatus);
  const label = cleanMetricLabel(item.metricType);
  const money = item.currency ? formatHumanMoney(item.value, item.currency, item.unit) : `${display(item.value)} ${display(item.unit)}`;
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="flex items-start justify-between gap-3">
        <span className="font-sans text-[11px] font-medium text-zinc-300">{label}</span>
        <span className="shrink-0 font-mono text-xs font-bold text-emerald-300">{money}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <Badge tone="zinc">{originTypeLabel(item.originType)}</Badge>
        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
      </div>
      <div className="mt-1.5 font-sans text-[9px] leading-relaxed text-zinc-600">{cleanIntelligenceText(display(item.basis))} ・ 根拠 {item.evidenceIds.length}件</div>
    </div>
  );
}

function RawMoney({ item }: { item: FoundationMoneySignal }) {
  const statusInfo = humanizeVerificationStatus(item.verificationStatus);
  const money = formatHumanMoney(item.amount, item.currency, undefined, item.amountLabel);
  const label = cleanMetricLabel(item.moneyType);
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="flex items-start justify-between gap-3">
        <span className="font-sans text-[11px] font-medium text-zinc-300">{label}</span>
        <span className="shrink-0 font-mono text-xs font-bold text-amber-300">{money}</span>
      </div>
      <div className="mt-1 font-sans text-[10px] leading-relaxed text-zinc-500">{cleanIntelligenceText(display(item.purpose))}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <Badge tone="zinc">{originTypeLabel(item.originType)}</Badge>
        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
      </div>
    </div>
  );
}

export const FoundationInspectorPane: React.FC<FoundationInspectorPaneProps> = ({ entity, loading, error, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('CORE');
  const dossier = useMemo(() => entity ? buildFoundationDossierProjection(entity) : null, [entity]);

  const coreModules = dossier?.modules.filter((item) => item.section === 'CORE') || [];
  const riskModules = dossier?.modules.filter((item) => item.section === 'RISK') || [];
  const financialModules = dossier?.modules.filter((item) => item.section === 'FINANCIALS') || [];
  const playbookModules = dossier?.modules.filter((item) => item.section === 'PLAYBOOK') || [];

  const caseLevel = dossier ? caseLevelBadge(dossier.caseLevel) : null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden" />
      <aside className="fixed md:static inset-x-0 bottom-0 z-40 flex h-full max-h-[92vh] w-full shrink-0 flex-col overflow-hidden border-t border-white/[0.06] bg-[#08090C] shadow-2xl md:max-h-none md:min-w-[520px] md:border-l md:border-t-0">
        <div className="shrink-0 border-b border-white/[0.06] bg-[#07080B]">
          <div className="flex items-start justify-between gap-3 p-3 pb-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="emerald">裏帳簿インテリジェンス</Badge>
                {entity && <Badge tone="cyan">{cleanIntelligenceText(entity.entityType)}</Badge>}
                {caseLevel && <Badge tone={caseLevel.tone}>{caseLevel.label}</Badge>}
                {dossier && dossier.conflictedCount > 0 && <Badge tone="red">要確認 {dossier.conflictedCount}件</Badge>}
              </div>
              <h2 className="mt-2 truncate text-sm font-bold text-white">{entity?.name || (loading ? '読み込み中...' : '未選択')}</h2>
              {dossier && <p className="mt-1 text-[11px] leading-snug text-zinc-300">{dossier.headline}</p>}
              {dossier?.subheadline && <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-zinc-500">{dossier.subheadline}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {entity?.domain && (
                <a href={`https://${entity.domain}`} target="_blank" rel="noopener noreferrer" className="p-1 text-zinc-500 transition-colors hover:text-white" title="公式サイト">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button type="button" onClick={onClose} className="p-1 text-zinc-500 transition-colors hover:text-white" aria-label="閉じる"><X className="h-4 w-4" /></button>
            </div>
          </div>

          {entity && dossier && (
            <div className="px-3 pb-2">
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-zinc-600">
                <span>観測年月: {dateValue(entity.observedAt)}</span>
                <span>・</span>
                <span>根拠: {dossier.evidenceCount}件</span>
                <span>・</span>
                <span>分析: {dossier.modules.length}モジュール</span>
                {dossier.strongestSignal && <><span>・</span><strong className="text-emerald-300">{dossier.strongestSignalLabel}: {dossier.strongestSignal}</strong></>}
              </div>
              <div className="mt-1.5 flex gap-1 overflow-x-auto scrollbar-none">
                {dossier.tags.map((tag) => <Badge key={tag}>{cleanIntelligenceText(tag)}</Badge>)}
              </div>
            </div>
          )}

          <div className="flex border-t border-white/[0.05] text-[10px] font-mono">
            {([
              { id: 'CORE', label: '基本・急所' },
              { id: 'FINANCIALS', label: '財務・収益' },
              { id: 'PLAYBOOK', label: '攻略手口' },
              { id: 'STREAM', label: '時系列・観測' },
              { id: 'EVIDENCE', label: '検証データ' },
            ] as Array<{ id: Tab; label: string }>).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 border-b-2 px-1 py-2 transition-colors ${activeTab === tab.id ? 'border-emerald-400 bg-emerald-950/15 text-white font-bold' : 'border-transparent text-zinc-600 hover:text-zinc-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 text-xs">
          {loading && <div className="p-5 text-center font-mono text-xs text-zinc-500">Foundationから事例を構成中...</div>}
          {error && <div className="rounded border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-300">{error}</div>}

          {entity && dossier && !loading && !error && activeTab === 'CORE' && (
            <div className="space-y-6">
              {coreModules.length > 0 ? coreModules.map((module, index) => <ModuleCard key={module.id} module={module} index={index} />) : <EmptyModules text="このEntityはまだCore Dossierを作れるだけの事実がありません。情報を水増しせず、関連Signalとして保持します。" />}
              {riskModules.length > 0 && (
                <div className="space-y-5 border-t border-white/[0.08] pt-5">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-300/80">REALITY / RISK</div>
                  {riskModules.map((module, index) => <ModuleCard key={module.id} module={module} index={coreModules.length + index} />)}
                </div>
              )}
            </div>
          )}

          {entity && dossier && !loading && !error && activeTab === 'FINANCIALS' && (
            <div className="space-y-6">
              {financialModules.length > 0 ? financialModules.map((module, index) => <ModuleCard key={module.id} module={module} index={index} />) : <EmptyModules text="同期間で比較できる財務・人数データが不足しています。0円や推測値では埋めません。" />}
            </div>
          )}

          {entity && dossier && !loading && !error && activeTab === 'PLAYBOOK' && (
            <div className="space-y-6">
              {playbookModules.length > 0 ? playbookModules.map((module, index) => <ModuleCard key={module.id} module={module} index={index} />) : <EmptyModules text="転用可能な構造を裏付けるDerived分析がまだありません。一般論を自動生成して穴埋めしません。" />}
              <div className="rounded-md border border-amber-500/15 bg-amber-950/10 p-3 text-[10px] leading-relaxed text-zinc-500">
                PLAYBOOKは事実ではなく分析です。必ず元Evidenceへ遡れる既存Derivedだけを表示し、成功保証・未確認の収益予測は生成しません。
              </div>
            </div>
          )}

          {entity && !loading && !error && activeTab === 'STREAM' && (
            <div className="space-y-6">
              {entity.events.length > 0 && <section className="space-y-3"><h3 className="font-mono text-[10px] font-bold tracking-widest text-zinc-400">TIMELINE / EVENTS</h3>{entity.events.map((item) => <RawEvent key={item.id} item={item} />)}</section>}
              {entity.claims.length > 0 && <section className="space-y-2"><h3 className="font-mono text-[10px] font-bold tracking-widest text-zinc-400">CLAIMS</h3>{entity.claims.map((item) => <RawClaim key={item.id} item={item} />)}</section>}
              {entity.observations.length > 0 && <section className="space-y-2"><h3 className="font-mono text-[10px] font-bold tracking-widest text-zinc-400">OBSERVATIONS</h3>{entity.observations.map((item) => <RawObservation key={item.id} item={item} />)}</section>}
              {entity.relationships.length > 0 && <section className="space-y-2"><h3 className="font-mono text-[10px] font-bold tracking-widest text-zinc-400">RELATIONSHIPS</h3>{entity.relationships.map((item) => <RawRelationship key={item.id} item={item} />)}</section>}
              {entity.events.length + entity.claims.length + entity.observations.length + entity.relationships.length === 0 && <EmptyModules text="Streamに表示できる記録がありません。" />}
            </div>
          )}

          {entity && dossier && !loading && !error && activeTab === 'EVIDENCE' && (
            <div className="space-y-6">
              <section className="rounded-md border border-white/[0.08] bg-[#0A0C10] p-3">
                <div className="font-mono text-[10px] font-bold tracking-widest text-zinc-300">EVIDENCE STATE</div>
                <div className="mt-2 grid grid-cols-4 gap-2 text-center font-mono">
                  <div className="rounded border border-white/[0.05] bg-white/[0.02] p-2"><div className="text-[9px] text-zinc-600">Evidence</div><div className="mt-1 text-sm font-bold text-white">{dossier.evidenceCount}</div></div>
                  <div className="rounded border border-white/[0.05] bg-white/[0.02] p-2"><div className="text-[9px] text-zinc-600">Conflict</div><div className="mt-1 text-sm font-bold text-red-300">{dossier.conflictedCount}</div></div>
                  <div className="rounded border border-white/[0.05] bg-white/[0.02] p-2"><div className="text-[9px] text-zinc-600">Unverified</div><div className="mt-1 text-sm font-bold text-amber-300">{dossier.unverifiedCount}</div></div>
                  <div className="rounded border border-white/[0.05] bg-white/[0.02] p-2"><div className="text-[9px] text-zinc-600">Bundles</div><div className="mt-1 text-sm font-bold text-zinc-300">{entity.bundleScanComplete ? entity.bundlesScanned : `${entity.bundlesScanned}/${entity.bundleObjectsListed} 範囲`}</div></div>
                </div>
              </section>

              {entity.metrics.length > 0 && <section className="space-y-2"><h3 className="font-mono text-[10px] font-bold tracking-widest text-zinc-400">METRICS</h3>{entity.metrics.map((item) => <RawMetric key={item.id} item={item} />)}</section>}
              {entity.moneySignals.length > 0 && <section className="space-y-2"><h3 className="font-mono text-[10px] font-bold tracking-widest text-zinc-400">MONEY SIGNALS</h3>{entity.moneySignals.map((item) => <RawMoney key={item.id} item={item} />)}</section>}
              {entity.derived.length > 0 && (
                <section className="space-y-2">
                  <h3 className="font-mono text-[10px] font-bold tracking-widest text-amber-300/80">DERIVED / ANALYSIS</h3>
                  {entity.derived.map((item) => (
                    <div key={item.id} className="rounded border border-amber-500/15 bg-amber-950/10 p-2.5">
                      <div className="flex flex-wrap gap-1"><Badge tone="amber">{item.type}</Badge><Badge tone="amber">{item.originType}</Badge></div>
                      <div className="mt-2 text-[11px] leading-relaxed text-zinc-300">{item.text}</div>
                      <div className="mt-1.5 font-mono text-[9px] text-zinc-600">confidence {display(item.confidence)} ・ supporting evidence {item.supportingEvidenceIds.length}</div>
                    </div>
                  ))}
                </section>
              )}
              <div className="border-t border-white/[0.06] pt-3 font-mono text-[9px] leading-relaxed text-zinc-600">
                Foundation/R2は正本。表示モジュールは再生成可能なProjectionです。未確認値を0に変換せず、事実・計算・分析を分離します。
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
