'use client';

import { FinancialEntity,UniversalObservation } from '@/shared/terminal';
import { httpUrl } from './SourcesSection';
import { cleanDisplayText, confirmedAtLabel, formatDisplayDate, isResearchTimelineEvent, sourceKindLabel, timelineEventLabel } from '@/shared/display-text';
import { StructuredObservationPayload } from './StructuredObservationPayload';
import {
  AlertCircle,
  Clock,
  HelpCircle,
  History,
} from 'lucide-react';
import React from 'react';

/** 句点・空白の違いを無視して本文を比べるための正規化。 */
function proseKey(value: string): string {
  return cleanDisplayText(value).replace(/[\s。、．.,，]/g, '');
}

// 「公式サイト: …」「Indie Hackers（収益ページ）: …」のような接頭辞。
const SUPPLEMENT_PREFIX = /^([^:：。、\n]{1,30})[:：]\s*([\s\S]+)$/u;

// データ取り込み時に機械的に付いた既定の見出し。中身の分類ではないので読者には出さない。
const DEFAULT_CATEGORY_LABELS = new Set(['市場構造', '創業期の泥臭い工夫', 'ツールの利用実態', '補足記録']);

function hostOf(value: string | undefined | null): string | null {
  if (!value) return null;
  const url = httpUrl(value) ?? httpUrl(`https://${value.trim()}`);
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/** 調査メモの見出し。中身の分類ではなく「どこから来た事実か」を出す。出典URLが無ければ null。 */
export function observationSourceHeading(sourceUrl: string | undefined, entityUrl: string | undefined): string | null {
  const host = hostOf(sourceUrl);
  if (!host) return null;
  const own = hostOf(entityUrl);
  if (own && host === own) return '公式サイト';
  if (host === 'indiehackers.com' || host.endsWith('.indiehackers.com')) return 'Indie Hackers';
  return host;
}

export function mergeInspectorObservations(entity: { observationsStream?: UniversalObservation[]; observations?: readonly unknown[] }): UniversalObservation[] {
  const structured = entity.observationsStream || [];
  const texts = new Set(structured.map((item) => item.text.trim()));
  const bodies = structured.map((item) => proseKey(item.text)).filter(Boolean);
  const supplemental: UniversalObservation[] = [];
  for (const [index, value] of (entity.observations || []).entries()) {
    const raw = typeof value === 'string' ? value : value && typeof value === 'object' && 'text' in value && typeof value.text === 'string' ? value.text : '';
    if (!raw.trim() || texts.has(raw.trim())) continue;
    const prefixed = raw.trim().match(SUPPLEMENT_PREFIX);
    const prefix = prefixed ? prefixed[1].trim() : null;
    const text = prefixed ? prefixed[2].trim() : raw;
    const key = proseKey(text);
    // 構造化された調査メモの文を分けて写しただけのものは足さない。
    if (!key || bodies.some((body) => body.includes(key))) continue;
    texts.add(raw.trim());
    bodies.push(key);
    const record: UniversalObservation = { id: `supplemental-${index}`, text };
    if (prefix) record.categoryLabel = prefix;
    // Historical objects may contain private transport payloads. Copy only
    // explicit public text/provenance fields, never spread the source object.
    if (value && typeof value === 'object') {
      if ('sourceUrl' in value && typeof value.sourceUrl === 'string') record.sourceUrl = httpUrl(value.sourceUrl) || undefined;
      if ('observedAt' in value && typeof value.observedAt === 'string') record.observedAt = value.observedAt;
      if ('author' in value && typeof value.author === 'string') record.author = value.author;
      if (!prefix && 'categoryLabel' in value && typeof value.categoryLabel === 'string' && !DEFAULT_CATEGORY_LABELS.has(value.categoryLabel)) record.categoryLabel = value.categoryLabel;
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
  const { dynamicMoats, timelineEvents, unknownsNotes, exposureAudit } = entity;
  const effectiveObservations = mergeInspectorObservations(entity);

  // Layer 2 特異点ブロックの存在判定

  const hasExposureAudit = exposureAudit && (
    exposureAudit.guerrillaTraction ||
    exposureAudit.platformGlitch ||
    exposureAudit.pivotSnapshot ||
    exposureAudit.hiddenStackCost
  );

  // 本文の無い項目は出さない。同じ本文は最初の1つだけ。
  const seenBodies = new Set<string>();
  const shownObservations = effectiveObservations.filter((obs) => {
    const key = proseKey(obs.text);
    if (!key || seenBodies.has(key)) return false;
    seenBodies.add(key);
    return true;
  });
  const observationHeading = (obs: UniversalObservation): string | null => {
    const label = obs.categoryLabel?.trim();
    if (label && !DEFAULT_CATEGORY_LABELS.has(label)) return label;
    return observationSourceHeading(obs.sourceUrl, entity.url);
  };

  // 同じ文を繰り返す特異点カードは最初の1つだけ出す。
  const seenMoatDetails = new Set<string>();
  const firstOf = <T extends { detail: string }>(moat: T | undefined): T | undefined => {
    if (!moat) return undefined;
    const key = proseKey(moat.detail);
    if (key && seenMoatDetails.has(key)) return undefined;
    if (key) seenMoatDetails.add(key);
    return moat;
  };
  const parasiteHost = firstOf(dynamicMoats?.parasiteHost);
  const dataHostage = firstOf(dynamicMoats?.dataHostage);
  const affiliateBribery = firstOf(dynamicMoats?.affiliateBribery);
  const upfrontCash = firstOf(dynamicMoats?.upfrontCash);

  const hasDynamicMoats = Boolean(parasiteHost || dataHostage || affiliateBribery || upfrontCash || dynamicMoats?.pivotGraveyard);
  const shownTimeline = (timelineEvents ?? [])
    .filter((evt) => !isResearchTimelineEvent(evt.eventType))
    .filter((evt, index, all) => all.findIndex((item) => item.occurredAt === evt.occurredAt && item.eventType === evt.eventType && item.description === evt.description) === index);

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono py-1">
            <div className="bg-white/[0.02] border border-white/[0.04] p-2 rounded">
              <span className="text-zinc-500 block">創業・ローンチ時期</span>
              <span className="text-zinc-200 font-bold text-[11px] block">
                創業年: {entity.temporal.foundedYear > 0 ? `${entity.temporal.foundedYear}年` : '未確認'}
              </span>
              <span className="text-zinc-200 font-bold text-[11px] block">
                立ち上げ期: {cleanDisplayText(entity.temporal.initialTractionPeriod) || '未確認'}
              </span>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] p-2 rounded">
              <span className="text-zinc-500 block">確認した時点</span>
              <span className="text-zinc-200 font-bold text-[11px]">{confirmedAtLabel(entity.temporal.dataSnapshotPeriod) || '未確認'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-[11px]">
            <div className="bg-white/[0.01] border border-white/[0.04] p-2.5 rounded space-y-1">
              <span className="font-mono text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                <History className="w-3 h-3 text-cyan-400" />
                その時期に伸びた背景:
              </span>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                {cleanDisplayText(entity.temporal.eraContext) || '未確認'}
              </p>
            </div>
            <div className="bg-white/[0.01] border border-white/[0.04] p-2.5 rounded space-y-1">
              <span className="font-mono text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                現在の状況:
              </span>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                {cleanDisplayText(entity.temporal.currentViabilityAnalysis) || '未確認'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 重要タイムライン・特異点ログ */}
      {/* ========================================================= */}
      {shownTimeline.length > 0 && (
        <section className="space-y-2 border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-1.5">
            <History className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono text-xs font-bold text-zinc-200">
              沿革・主な出来事
            </span>
          </div>
          <div className="space-y-2 pt-1 font-mono text-[11px]">
            {shownTimeline.map((evt, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-zinc-300 border-l-2 border-zinc-700 pl-2.5 py-0.5">
                <span className="text-xs text-term-fg shrink-0 font-bold">{evt.occurredAt || '時期不詳'}</span>
                <span className="text-zinc-500">|</span>
                <span className="text-[11px] leading-relaxed text-zinc-300">{timelineEventLabel(evt.eventType) && <span className="mr-2 text-zinc-400">{timelineEventLabel(evt.eventType)}</span>}{cleanDisplayText(evt.description)}</span>
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
            {parasiteHost && (
              <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    
                    他社プラットフォームの活用（エコシステム連携）
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                    プラットフォーム: {parasiteHost.hostName}
                  </span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed pl-3 border-l border-emerald-500/30">
                  {parasiteHost.detail}
                </p>
              </div>
            )}

            {/* ② データの監禁度（人質資産） */}
            {dataHostage && (
              <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    
                    データの蓄積による解約防止（スイッチングコスト）
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                    要因: {dataHostage.lockInFactor}
                  </span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed pl-3 border-l border-amber-500/30">
                  {dataHostage.detail}
                </p>
              </div>
            )}

            {/* ③ 共犯者・紹介賄賂網 */}
            {affiliateBribery && (
              <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    
                    紹介・アフィリエイト報酬の仕組み
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/30 text-blue-300 border border-blue-500/30 font-bold">
                    報酬率: {affiliateBribery.commissionRate}
                  </span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed pl-3 border-l border-blue-500/30">
                  {affiliateBribery.detail}
                </p>
              </div>
            )}

            {/* ④ 前金総取り・無元手拡大 */}
            {upfrontCash && (
              <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    
                    前受金による資金繰り（キャッシュフロー戦略）
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                    {upfrontCash.cashCycle}
                  </span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed pl-3 border-l border-purple-500/30">
                  {upfrontCash.detail}
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
      {(shownObservations.length > 0 || (unknownsNotes && unknownsNotes.length > 0)) && <section className="space-y-3">
        {shownObservations.length > 0 && <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
            <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">
              調査メモ
            </h3>
          </div>
            <span className="text-xs text-zinc-400">
            {shownObservations.length}件
          </span>
        </div>}

        {/* 観測ログカード群 */}
        {shownObservations.length > 0 && (
          <div className="space-y-2.5">
            {shownObservations.map((obs, idx) => {
              const heading = observationHeading(obs);
              // 出典から確かに言える区分（開示資料・本人申告・記事）だけ出す。判定できなければ出さない
              const kind = sourceKindLabel({ text: obs.sourceUrl, sourceClass: obs.sourceClass });
              return (
                <div
                  key={obs.id || idx}
                  className="border border-term-line-soft hover:border-term-line rounded-sm bg-term-bg p-3.5 space-y-2 transition-all shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      {heading && <span className="px-1.5 py-0.5 rounded font-bold border border-white/[0.12] bg-white/[0.03] text-zinc-300">
                        {heading}
                      </span>}
                      {kind && kind !== heading && (
                        <span className="text-zinc-400">{kind}</span>
                      )}
                    </div>
                    {obs.verificationStatus === 'REFUTED' && (
                      <span className="text-[11px] text-rose-300">反証あり</span>
                    )}
                  </div>
                  <p className="text-zinc-200 text-[11px] leading-relaxed font-sans">
                    {cleanDisplayText(obs.text)}
                  </p>
                  {(obs.observedAt || obs.author || obs.sourceUrl) && <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
                    {obs.observedAt && <span>{formatDisplayDate(obs.observedAt)}</span>}{obs.author && <span>{obs.author}</span>}
                    {obs.sourceUrl && httpUrl(obs.sourceUrl) && <a href={httpUrl(obs.sourceUrl)!} target="_blank" rel="noopener noreferrer" className="text-sky-200 underline">出典</a>}
                  </div>}
                  <StructuredObservationPayload observation={obs} />
                </div>
              );
            })}
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
                  {cleanDisplayText(note)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>}

    </div>
  );
};
