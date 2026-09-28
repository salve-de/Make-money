'use client';

import { FinancialEntity,UniversalObservation } from '@/shared/terminal';
import { httpUrl } from './SourcesSection';
import { StructuredObservationPayload } from './StructuredObservationPayload';
import {
  AlertCircle,
  Clock,
  HelpCircle,
  History,
} from 'lucide-react';
import React from 'react';

export function mergeInspectorObservations(entity: { observationsStream?: UniversalObservation[]; observations?: readonly unknown[] }): UniversalObservation[] {
  const structured = entity.observationsStream || [];
  const texts = new Set(structured.map((item) => item.text.trim()));
  const supplemental: UniversalObservation[] = [];
  for (const [index, value] of (entity.observations || []).entries()) {
    const text = typeof value === 'string' ? value : value && typeof value === 'object' && 'text' in value && typeof value.text === 'string' ? value.text : '';
    if (!text.trim() || texts.has(text.trim())) continue;
    texts.add(text.trim());
    const record: UniversalObservation = { id: `supplemental-${index}`, categoryLabel: '補足記録', text };
    // Historical objects may contain private transport payloads. Copy only
    // explicit public text/provenance fields, never spread the source object.
    if (value && typeof value === 'object') {
      if ('sourceUrl' in value && typeof value.sourceUrl === 'string') record.sourceUrl = httpUrl(value.sourceUrl) || undefined;
      if ('observedAt' in value && typeof value.observedAt === 'string') record.observedAt = value.observedAt;
      if ('author' in value && typeof value.author === 'string') record.author = value.author;
      if ('categoryLabel' in value && typeof value.categoryLabel === 'string') record.categoryLabel = value.categoryLabel;
      if ('originType' in value && (value.originType === 'observed' || value.originType === 'inferred' || value.originType === 'reported' || value.originType === 'estimated' || value.originType === 'unknown')) record.originType = value.originType;
      if ('verificationStatus' in value && (value.verificationStatus === 'SUPPORTED' || value.verificationStatus === 'UNVERIFIED' || value.verificationStatus === 'REFUTED')) record.verificationStatus = value.verificationStatus;
    }
    supplemental.push(record);
  }
  return [...structured, ...supplemental];
}

interface UniversalIntelligenceStreamProps {
  entity: FinancialEntity;
  currency: 'JPY' | 'USD';
}

export const UniversalIntelligenceStream: React.FC<UniversalIntelligenceStreamProps> = ({
  entity,
}) => {
  const { dynamicMoats, timelineEvents, coverageAudit, unknownsNotes, exposureAudit } = entity;
  const effectiveObservations = mergeInspectorObservations(entity);

  // Layer 2 特異点ブロックの存在判定
  const hasDynamicMoats = dynamicMoats && (
    dynamicMoats.parasiteHost ||
    dynamicMoats.dataHostage ||
    dynamicMoats.affiliateBribery ||
    dynamicMoats.upfrontCash ||
    dynamicMoats.pivotGraveyard
  );

  const hasExposureAudit = exposureAudit && (
    exposureAudit.guerrillaTraction ||
    exposureAudit.platformGlitch ||
    exposureAudit.pivotSnapshot ||
    exposureAudit.hiddenStackCost
  );

  // カテゴリ別のバッジ配色・アイコン判定
  const getCategoryBadge = (category: UniversalObservation['category'], customLabel?: string) => {
    switch (category) {
      case 'INCUMBENT_DILEMMA':
        return {
          label: customLabel || '大企業の弱点',
          border: 'border-term-line',
          bg: '',
          text: 'text-term-danger',
        };
      case 'SAVANNAH_PAIN':
        return {
          label: customLabel || '人間の本音と悩み',
          border: 'border-term-accent-line',
          bg: '',
          text: 'text-term-accent',
        };
      case 'MARKET_DISTORTION':
        return {
          label: customLabel || '市場構造',
          border: 'border-term-line',
          bg: 'bg-transparent',
          text: 'text-zinc-300',
        };
      case 'FOUNDER_HACK':
        return {
          label: customLabel || '創業期の泥臭い工夫',
          border: 'border-term-line',
          bg: '',
          text: 'text-term-fg',
        };
      case 'TECH_VERIFICATION':
        return {
          label: customLabel || 'ツールの利用実態',
          border: 'border-term-line',
          bg: '',
          text: 'text-term-fg',
        };
      case 'FORUM_RAGE':
        return {
          label: customLabel || '顧客の生の声・不満',
          border: 'border-term-accent-line',
          bg: '',
          text: 'text-term-accent',
        };
      case 'RESEARCH_LIMIT':
      default:
        return {
          label: customLabel || '非公開・未確認の情報',
          border: 'border-zinc-700',
          bg: 'bg-zinc-900',
          text: 'text-zinc-400',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 時系列インテリジェンス ＆ 手口の賞味期限（Temporal Radar） */}
      {/* ========================================================= */}
      {entity.temporal && (
        <section className="space-y-2.5 border border-term-line-soft rounded-sm bg-term-bg p-4">
          <div className="flex items-center justify-between border-b border-term-line-soft pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-100">事業の変化と現在の評価</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium px-2 py-1 rounded-sm border ${
                entity.temporal.viabilityStatus === 'ACTIVE_PLAYBOOK' ? ' text-term-positive border-term-line' :
                entity.temporal.viabilityStatus === 'RISING_WAVE' ? ' text-term-fg border-term-line ' :
                entity.temporal.viabilityStatus === 'MATURED_MOAT' ? ' text-term-accent border-term-accent-line' :
                entity.temporal.viabilityStatus === 'HISTORICAL_WINDOW' ? ' text-term-danger border-term-line' :
                entity.temporal.viabilityStatus === 'EVOLVING_BARRIER' ? ' text-term-fg border-term-line' :
                'bg-zinc-900 text-zinc-400 border-zinc-700'
              }`}>
                {entity.temporal.viabilityLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono py-1">
            <div className="bg-transparent border border-term-line-soft p-2 rounded-sm">
              <span className="text-zinc-500 block">創業・ローンチ時期</span>
              <span className="text-zinc-200 font-bold text-xs">
                {entity.temporal.foundedYear > 0 ? `${entity.temporal.foundedYear}年` : '創業年未確認'} ({entity.temporal.initialTractionPeriod})
              </span>
            </div>
            <div className="bg-transparent border border-term-line-soft p-2 rounded-sm">
              <span className="text-zinc-500 block">データ観測基準時期</span>
              <span className="text-zinc-200 font-bold text-xs">{entity.temporal.dataSnapshotPeriod}</span>
            </div>
            <div className="bg-transparent border border-term-line-soft p-2 rounded-sm">
              <span className="text-zinc-500 block">現在の再現性判定</span>
              <span className="text-term-positive font-bold text-xs">{entity.temporal.viabilityLabel}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-xs">
            <div className="bg-transparent border border-term-line-soft p-2.5 rounded-sm space-y-1">
              <span className="font-mono text-xs text-zinc-400 font-bold flex items-center gap-1">
                <History className="w-3 h-3 text-term-fg" />
                なぜその時期・時代に勝てたのか（構造的背景）:
              </span>
              <p className="text-zinc-300 leading-relaxed text-xs">
                {entity.temporal.eraContext}
              </p>
            </div>
            <div className="bg-transparent border border-term-line-soft p-2.5 rounded-sm space-y-1">
              <span className="font-mono text-xs text-zinc-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-term-accent" />
                現在の再現可能性（登録情報）:
              </span>
              <p className="text-zinc-300 leading-relaxed text-xs">
                {entity.temporal.currentViabilityAnalysis}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 重要タイムライン・特異点ログ */}
      {/* ========================================================= */}
      {timelineEvents && timelineEvents.length > 0 && (
        <section className="space-y-2 border border-term-line-soft rounded-sm bg-term-bg p-3.5">
          <div className="flex items-center gap-2 border-b border-term-line-soft pb-1.5">
            <History className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono text-xs font-bold text-zinc-200">
              沿革・主な出来事
            </span>
          </div>
          <div className="space-y-2 pt-1 font-mono text-xs">
            {timelineEvents.filter((evt, index, all) => all.findIndex((item) => item.occurredAt === evt.occurredAt && item.eventType === evt.eventType && item.description === evt.description) === index).map((evt, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-zinc-300 border-l-2 border-zinc-700 pl-2.5 py-0.5">
                <span className="text-xs text-term-fg shrink-0 font-bold">{evt.occurredAt || '時期不詳'}</span>
                <span className="text-zinc-500">|</span>
                <span className="text-xs leading-relaxed text-zinc-300">{evt.eventType && <span className="mr-2 text-zinc-400">{evt.eventType}</span>}{evt.description}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* Layer 2: 【事業構造の特徴・独自の強み】 */}
      {/* データが存在するブロックだけが自動展開・最上位化 */}
      {/* ========================================================= */}
      {hasDynamicMoats && (
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-term-line-soft pb-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100">
                事業構造の特徴
              </h3>
            </div>

          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* ① プラットフォーム連携・プラットフォーム特化構造 */}
            {dynamicMoats?.parasiteHost && (
              <div className="border border-term-line-soft rounded-sm bg-term-bg p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    
                    他社プラットフォームの活用（エコシステム連携）
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-sm bg-term-head text-zinc-300 border border-term-line-soft">
                    プラットフォーム: {dynamicMoats.parasiteHost.hostName}
                  </span>
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed pl-3 border-l border-term-line">
                  {dynamicMoats.parasiteHost.detail}
                </p>
              </div>
            )}

            {/* ② データの監禁度（人質資産） */}
            {dynamicMoats?.dataHostage && (
              <div className="border border-term-line-soft rounded-sm bg-term-bg p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    
                    データの蓄積による解約防止（スイッチングコスト）
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-sm bg-term-head text-zinc-300 border border-term-line-soft">
                    要因: {dynamicMoats.dataHostage.lockInFactor}
                  </span>
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed pl-3 border-l border-term-accent-line">
                  {dynamicMoats.dataHostage.detail}
                </p>
              </div>
            )}

            {/* ③ 共犯者・紹介賄賂網 */}
            {dynamicMoats?.affiliateBribery && (
              <div className="border border-term-line-soft rounded-sm bg-term-bg p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    
                    紹介・アフィリエイト報酬の仕組み
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-sm text-term-fg border border-term-line font-bold">
                    報酬率: {dynamicMoats.affiliateBribery.commissionRate}
                  </span>
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed pl-3 border-l border-term-line">
                  {dynamicMoats.affiliateBribery.detail}
                </p>
              </div>
            )}

            {/* ④ 前金総取り・無元手拡大 */}
            {dynamicMoats?.upfrontCash && (
              <div className="border border-term-line-soft rounded-sm bg-term-bg p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    
                    前受金による資金繰り（キャッシュフロー戦略）
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-sm bg-term-head text-zinc-300 border border-term-line-soft">
                    {dynamicMoats.upfrontCash.cashCycle}
                  </span>
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed pl-3 border-l border-term-line">
                  {dynamicMoats.upfrontCash.detail}
                </p>
              </div>
            )}

            {/* ⑤ 死屍累々のピボット魚拓 */}
            {dynamicMoats?.pivotGraveyard && (
              <div className="border border-term-line-soft rounded-sm bg-term-bg p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-zinc-400" />
                    過去の試行錯誤と事業転換（ピボット）の軌跡
                  </span>
                </div>
                {dynamicMoats.pivotGraveyard.failedAttempts.length > 0 && (
                  <div className="text-xs font-mono text-zinc-400 space-y-1">
                    <span className="text-zinc-500">過去に失敗・撤退したサービス:</span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {dynamicMoats.pivotGraveyard.failedAttempts.map((prod, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded-sm text-term-danger border border-term-line line-through">
                          {prod}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-zinc-200 text-xs leading-relaxed pl-3 border-l border-term-line font-medium">
                  <span className="text-term-positive font-mono font-bold mr-1.5">[ブレイクスルーの要因]</span>
                  {dynamicMoats.pivotGraveyard.breakthroughSecret}
                </p>
              </div>
            )}
          </div>
        </section>
      )}
      {hasExposureAudit && <section className="rounded-sm border border-term-line bg-term-panel overflow-hidden">
        <h3 className="bg-term-head px-4 py-2.5 text-sm font-semibold text-term-fg-strong">初期獲得・事業転換・運営の記録</h3>
        <dl className="divide-y divide-white/10">{([
          ['初期の顧客獲得', exposureAudit?.guerrillaTraction],
          ['プラットフォームの活用', exposureAudit?.platformGlitch],
          ['事業転換', exposureAudit?.pivotSnapshot],
          ['運営構成・費用', exposureAudit?.hiddenStackCost],
        ] as const).filter(([, value]) => value).map(([label, value]) => <div className="px-4 py-3" key={label}><dt className="text-xs font-semibold text-term-fg">{label}</dt><dd className="mt-1 text-sm leading-6 text-zinc-300">{value}</dd></div>)}</dl>
      </section>}
      {/* ========================================================= */}
      {/* Layer 3: 【全量調査ログ・取材メモ】 */}
      {/* 保存済み観測を根拠・権利・公開範囲を保ったまま表示可能な範囲で描画 */}
      {/* ========================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-term-line-soft pb-1.5">
            <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">
              調査メモ
            </h3>
          </div>
            <span className="text-xs text-zinc-400">
            {effectiveObservations.length}件
          </span>
        </div>

        {/* 観測ログカード群 */}
        {effectiveObservations.length > 0 ? (
          <div className="space-y-2.5">
            {effectiveObservations.map((obs, idx) => {
              const badge = getCategoryBadge(obs.category, obs.categoryLabel);
              return (
                <div
                  key={obs.id || idx}
                  className="border border-term-line-soft hover:border-term-line rounded-sm bg-term-bg p-3.5 space-y-2 transition-all shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded-sm font-bold border ${badge.bg} ${badge.border} ${badge.text}`}>
                        {badge.label}
                      </span>
                      {obs.originType && (
                        <span className="text-zinc-500">
                          [{obs.originType === 'observed' ? '観測' : obs.originType === 'inferred' ? '構造推論' : obs.originType}]
                        </span>
                      )}
                    </div>
                    {obs.verificationStatus && (
                      <span className={`text-xs ${obs.verificationStatus === 'SUPPORTED' ? 'text-term-positive' : 'text-zinc-500'}`}>
                        {obs.verificationStatus === 'SUPPORTED' ? '根拠あり' : obs.verificationStatus === 'REFUTED' ? '反証あり' : '未検証'}
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-200 text-xs leading-relaxed font-sans">
                    {obs.text}
                  </p>
                  {(obs.observedAt || obs.author || obs.sourceUrl) && <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
                    {obs.observedAt && <span>{obs.observedAt}</span>}{obs.author && <span>{obs.author}</span>}
                    {obs.sourceUrl && httpUrl(obs.sourceUrl) && <a href={httpUrl(obs.sourceUrl)!} target="_blank" rel="noopener noreferrer" className="text-term-fg underline">出典</a>}
                  </div>}
                  <StructuredObservationPayload observation={obs} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-sm border border-term-line-soft bg-transparent text-center text-zinc-500 text-xs font-mono">
            現在、追加の観測レコードはありません。
          </div>
        )}

        {/* 調査限界・非公開メモ（誠実な金融端末の証） */}
        {unknownsNotes && unknownsNotes.length > 0 && (
          <div className="border border-term-line-soft rounded-sm bg-term-bg p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 font-bold">
              <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
              <span>未確認・非公開情報</span>
            </div>
            <ul className="space-y-1 text-xs font-mono text-zinc-400 pl-4 list-disc">
              {unknownsNotes.map((note, idx) => (
                <li key={idx} className="leading-relaxed">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* カバレッジ監査ログ */}
        {coverageAudit && coverageAudit.length > 0 && (
          <section className="rounded-sm border border-term-line bg-transparent p-3 text-sm text-zinc-300">
            <h4 className="font-semibold text-zinc-100">調査範囲</h4>
            <div className="mt-2.5 pt-2 border-t border-term-line-soft space-y-1.5">
              {coverageAudit.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2 py-0.5 border-b border-term-line-soft">
                  <span className="text-zinc-400 shrink-0">{item.dimension}:</span>
                  <span className="min-w-0 text-right break-words text-zinc-400 font-sans">
                    {item.note || item.status}{item.attempts?.map((attempt, i) => <span className="block" key={i}>{attempt}</span>)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>

    </div>
  );
};
