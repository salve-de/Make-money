import { ArrowRight, Building2, Layers, Route, ShieldAlert, Users } from 'lucide-react';
import React from 'react';

import type { InspectorSectionProps } from '../model/section-props';

const supportedEvidence = new Set(['VERIFIED', 'REPORTED', 'POST_MORTEM']);

function compactText(value: string | undefined, fallback: string): string {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  return normalized.length > 92 ? `${normalized.slice(0, 89)}…` : normalized;
}

export function ValueChainDisruptionSection({
  entity,
  isHazardMode
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  const cards = entity.evidenceCards || [];
  const structuralCards = cards.filter(
    (card) =>
      supportedEvidence.has(card.evidenceStatus) &&
      ['THE_CRIME', 'SMOKING_GUN', 'ASYMMETRIC_LEVERAGE', 'INCUMBENT_TRAP', 'FATAL_BLEED'].includes(card.type)
  );
  const verifiedCount = structuralCards.filter((card) => card.evidenceStatus === 'VERIFIED').length;

  const incumbentFriction = compactText(
    entity.meta?.incumbentDilemma?.cannibalizationBarrier ||
      entity.strategy.incumbentDilemma ||
      entity.strategy.blindspot,
    '既存経路の摩擦は未確認'
  );
  const customerPain = compactText(
    entity.essence?.painRelief || entity.targetPainWallet,
    '顧客側の痛みは未確認'
  );
  const entityMechanism = compactText(
    entity.architecturePattern,
    '提供経路は未確認'
  );
  const targetCustomer = compactText(
    entity.essence?.targetCustomer,
    '対象顧客は未確認'
  );
  const observedOutcome = compactText(
    isHazardMode
      ? structuralCards.find((card) => card.type === 'FATAL_BLEED')?.punchline
      : structuralCards.find((card) => card.type === 'ASYMMETRIC_LEVERAGE')?.punchline ||
          structuralCards.find((card) => card.type === 'THE_CRIME')?.punchline,
    isHazardMode ? '破綻結果は根拠カードで要確認' : '経済効果は根拠カードで要確認'
  );

  if (structuralCards.length === 0) {
    return (
      <section id="section-value-chain" className="rounded-lg border border-white/[0.10] bg-[#11151d] p-4">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">バリューチェーン比較は未確定</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              構造に関係する VERIFIED / REPORTED / POST_MORTEM の根拠がありません。業界別の手数料率や「中抜き率」をテンプレートから自動補完しません。
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="section-value-chain"
      className={`rounded-lg border bg-[#11151d] p-4 sm:p-5 ${isHazardMode ? 'border-red-500/30' : 'border-white/[0.10]'}`}
      aria-labelledby="value-chain-heading"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-start gap-2.5">
          <Layers className={`mt-0.5 h-4 w-4 shrink-0 ${isHazardMode ? 'text-red-400' : 'text-blue-400'}`} />
          <div>
            <h3 id="value-chain-heading" className="text-sm font-semibold text-zinc-100">
              {isHazardMode ? '価値提供経路と破綻点の比較' : '価値提供経路の比較'}
            </h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
              「既存側の摩擦」と「当該事業の経路」を分けて表示。数値根拠のない手数料率・利益転換率は表示しません。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <span className="rounded border border-white/[0.10] bg-white/[0.03] px-2 py-1">構造根拠 {structuralCards.length}件</span>
          <span className="rounded border border-white/[0.10] bg-white/[0.03] px-2 py-1">VERIFIED {verifiedCount}件</span>
        </div>
      </div>

      <div className="space-y-3">
        <PathLane
          label="比較対象：既存経路の摩擦（仮説）"
          tone="neutral"
          steps={[
            {
              icon: <Building2 className="h-4 w-4" />,
              title: '既存の提供経路',
              text: '具体的な仲介者・手数料率は、根拠がない限り固定値を置きません。'
            },
            {
              icon: <Route className="h-4 w-4" />,
              title: '観測された摩擦',
              text: incumbentFriction
            },
            {
              icon: <Users className="h-4 w-4" />,
              title: '顧客側の痛み',
              text: customerPain
            }
          ]}
        />

        <PathLane
          label={isHazardMode ? `${entity.name}：確認された経路と破綻点` : `${entity.name}：確認された提供経路`}
          tone={isHazardMode ? 'red' : 'blue'}
          steps={[
            {
              icon: <Building2 className="h-4 w-4" />,
              title: '提供主体',
              text: entity.name
            },
            {
              icon: <Route className="h-4 w-4" />,
              title: '提供メカニズム',
              text: entityMechanism
            },
            {
              icon: <Users className="h-4 w-4" />,
              title: targetCustomer,
              text: observedOutcome
            }
          ]}
        />
      </div>

      <div className="mt-4 rounded-md border border-white/[0.07] bg-[#0b0f15] px-3 py-2.5 text-[10px] leading-relaxed text-zinc-500">
        <span className="font-medium text-zinc-400">読み方:</span>{' '}
        この図は構造比較であり、「中間マージンを100%排除」「その全額が営業利益になる」といった未検証の因果は置いていません。
      </div>

      <div className="mt-3 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-zinc-500">
        <span className="font-medium text-zinc-400">参照根拠:</span>{' '}
        {structuralCards.slice(0, 4).map((card, index) => (
          <React.Fragment key={`${card.id}-${index}`}>
            {index > 0 && ' / '}
            <span>{card.title} [{card.evidenceStatus}]</span>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

function PathLane({
  label,
  tone,
  steps
}: {
  label: string;
  tone: 'neutral' | 'blue' | 'red';
  steps: Array<{ icon: React.ReactNode; title: string; text: string }>;
}) {
  const labelClass = {
    neutral: 'text-zinc-400',
    blue: 'text-blue-300',
    red: 'text-red-300'
  }[tone];
  const borderClass = {
    neutral: 'border-white/[0.08]',
    blue: 'border-blue-500/20',
    red: 'border-red-500/25'
  }[tone];

  return (
    <div className={`rounded-md border bg-[#0d1118] p-3 ${borderClass}`}>
      <div className={`mb-3 text-[10px] font-semibold ${labelClass}`}>{label}</div>
      <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
        {steps.map((step, index) => (
          <React.Fragment key={`${step.title}-${index}`}>
            <div className="min-w-0 flex-1 rounded-md border border-white/[0.07] bg-[#151a23] p-3">
              <div className="flex items-center gap-2 text-zinc-400">
                {step.icon}
                <span className="text-[10px] font-medium">{step.title}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-300">{step.text}</p>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="mx-auto h-4 w-4 shrink-0 rotate-90 text-zinc-600 md:rotate-0" aria-hidden="true" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
