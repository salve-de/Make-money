'use client';

import React from 'react';
import { Hammer } from 'lucide-react';
import type { IdeaResearchCase, IdeaResearchUnavailableReason } from '@/shared/idea-research';
import type { SynthesizedIdea } from '@/shared/terminal';
import { aiUnavailableNotice, buildProblemMessage, type BuildProblem } from '../../utils/ideaResearchMessages';

interface IdeaResearchSummaryProps {
  ai: SynthesizedIdea | null;
  reason?: IdeaResearchUnavailableReason;
  cases: IdeaResearchCase[];
  signedIn: boolean;
  formatMoney: (yen: number) => string;
  building: boolean;
  buildProblem: BuildProblem | null;
  loginFailed: boolean;
  onOpenCase: (id: string) => void;
  onBuild: () => void;
  onLogin: () => void;
}

const BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border bg-transparent px-3 text-sm hover:bg-term-head disabled:cursor-not-allowed disabled:opacity-45 lg:min-h-8';

function LoginButton({ onLogin }: { onLogin: () => void }) {
  return (
    <button type="button" onClick={onLogin} className={`${BUTTON} shrink-0 border-term-line text-term-fg`}>
      Googleでログイン
    </button>
  );
}

/** 推定の数字。数字が無い（根拠が足りず 0 のまま）ときは「未確認」とだけ出し、0円とは書かない。 */
function EstimatedValue({ value, text }: { value: number; text: string }) {
  return value > 0
    ? <span className="term-num text-base text-term-accent">{text}</span>
    : <span className="term-num text-base text-term-dim">未確認</span>;
}

/**
 * AI のまとめ。AI が使えないときは、理由に応じた案内を出す（似た事例だけ表示している、ログインすると出る、など）。
 * 数字は AI の推定なので「AIの推定」「推定」と明記し、根拠が無いものは数字を出さない。
 */
export const IdeaResearchSummary: React.FC<IdeaResearchSummaryProps> = ({
  ai, reason, cases, signedIn, formatMoney, building, buildProblem, loginFailed, onOpenCase, onBuild, onLogin,
}) => {
  const failedLogin = loginFailed && (
    <p role="alert" className="px-3 pb-2 text-sm text-term-danger">ログインできませんでした。もう一度お試しください。</p>
  );

  if (!ai) {
    const notice = aiUnavailableNotice(reason, signedIn);
    return (
      <section aria-label="AIのまとめ">
        <div className="term-panel-title"><span className="term-panel-name">AIのまとめ</span></div>
        <div className="flex flex-col gap-2 px-3 py-2 text-sm sm:flex-row sm:items-center">
          <p className="text-term-sub">{notice.text}</p>
          {notice.offerLogin && <LoginButton onLogin={onLogin} />}
        </div>
        {failedLogin}
      </section>
    );
  }

  const caseById = new Map(cases.map((item) => [item.id, item]));
  const sources = ai.sourceEntityIds.flatMap((id) => {
    const found = caseById.get(id);
    return found ? [found] : [];
  });
  const margin = Math.round(ai.operatingMargin);

  return (
    <section aria-label="AIのまとめ">
      <div className="term-panel-title">
        <span className="term-panel-name">AIのまとめ</span>
        <span className="text-term-accent">AIの推定</span>
      </div>
      <article>
        <p className="border-b border-term-line-soft px-3 py-1.5 text-xs text-term-label">実績ではなく、上の事例の記録から出した目安です。</p>
        <header className="border-b border-term-line-soft">
          <div className="px-3 py-2">
            <h4 className="text-base font-semibold text-term-fg-strong">{ai.title}</h4>
            {sources.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs">
                <span className="text-term-label">着想元</span>
                {sources.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenCase(item.id)}
                    className="min-h-11 text-term-select-fg underline underline-offset-2 hover:text-term-fg-strong lg:min-h-6"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <dl className="grid grid-cols-2 border-t border-term-line-soft">
            <div className="border-r border-term-line-soft px-3 py-1">
              <dt className="text-xs text-term-label">月間利益の目安{ai.projectedMonthlyProfitJpy > 0 && <span className="ml-1 text-term-accent">推定</span>}</dt>
              <dd><EstimatedValue value={ai.projectedMonthlyProfitJpy} text={`約${formatMoney(ai.projectedMonthlyProfitJpy)}`} /></dd>
            </div>
            <div className="px-3 py-1">
              <dt className="text-xs text-term-label">利益率の目安{margin > 0 && <span className="ml-1 text-term-accent">推定</span>}</dt>
              <dd><EstimatedValue value={margin} text={`約${margin}%`} /></dd>
            </div>
          </dl>
        </header>

        <dl className="border-b border-term-line-soft text-sm">
          <div className="border-b border-term-line-soft px-3 py-2">
            <dt className="text-xs text-term-label">対象の痛み</dt>
            <dd className="leading-relaxed text-term-fg">{ai.targetPainWallet}</dd>
          </div>
          <div className="px-3 py-2">
            <dt className="text-xs text-term-label">突く歪み</dt>
            <dd className="leading-relaxed text-term-fg">{ai.structuralArbitrage}</dd>
          </div>
        </dl>

        {ai.requiredTools.length > 0 && (
          <section aria-label="必要ツール">
            <h5 className="border-b border-term-line-soft bg-term-head px-3 py-1 text-xs text-term-label">必要ツール（月額はAIの推定）</h5>
            {ai.requiredTools.map((tool, index) => (
              <div
                key={`${tool.name}-${index}`}
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-term-line-soft px-3 py-1.5 text-sm ${index % 2 ? 'bg-term-row-alt' : ''}`}
              >
                <div className="min-w-0">
                  <span className="font-semibold text-term-fg-strong">{tool.name}</span>
                  {tool.purpose && <span className="block text-xs text-term-sub">{tool.purpose}</span>}
                </div>
                {tool.monthlyCostJpy > 0
                  ? <span className="term-num text-term-accent"><span className="text-xs">推定 </span>月約{formatMoney(tool.monthlyCostJpy)}</span>
                  : <span className="term-num text-term-dim">—</span>}
              </div>
            ))}
          </section>
        )}

        {ai.first100TractionPlaybook.length > 0 && (
          <section aria-label="初動の手順">
            <h5 className="border-b border-term-line-soft bg-term-head px-3 py-1 text-xs text-term-label">初動の手順（案）</h5>
            <ol className="text-sm text-term-fg">
              {ai.first100TractionPlaybook.map((step, index) => (
                <li key={index} className="flex items-start gap-2 border-b border-term-line-soft px-3 py-1.5">
                  <span className="term-num shrink-0 text-xs text-term-label">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-term-label">この内容を保存して、Builderの作成画面へ進みます。</span>
          <button type="button" onClick={onBuild} disabled={building} className={`${BUTTON} shrink-0 border-term-accent text-term-accent`}>
            <Hammer aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{building ? '準備しています…' : 'Builderで作る'}</span>
          </button>
        </div>
        {buildProblem && (
          <div role="alert" className="flex flex-col gap-2 border-t border-term-line-soft px-3 py-2 text-sm text-term-danger sm:flex-row sm:items-center">
            <p>{buildProblemMessage(buildProblem)}</p>
            {buildProblem === 'LOGIN_REQUIRED' && <LoginButton onLogin={onLogin} />}
          </div>
        )}
        {failedLogin}
      </article>
    </section>
  );
};
