'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { IDEA_MAX_LENGTH, type IdeaResearchResponse } from '@/shared/idea-research';
import { useIdeaResearch, type IdeaResearchPhase } from '../../hooks/useIdeaResearch';
import { openLedgerEntityUrl } from '../../utils/entityUrl';
import { problemMessage, type BuildProblem, type IdeaResearchProblem } from '../../utils/ideaResearchMessages';
import { formatYen } from '../../utils/moneyDisplay';
import { IdeaResearchCases } from './IdeaResearchCases';
import { IdeaResearchSummary } from './IdeaResearchSummary';

export interface IdeaResearchPanelViewProps {
  text: string;
  onChangeText: (text: string) => void;
  phase: IdeaResearchPhase;
  data: IdeaResearchResponse | null;
  problem: IdeaResearchProblem | null;
  signedIn: boolean;
  building: boolean;
  buildProblem: BuildProblem | null;
  loginFailed: boolean;
  formatMoney: (yen: number) => string;
  onSubmit: () => void;
  onClose: () => void;
  onOpenCase: (id: string) => void;
  onBuild: () => void;
  onLogin: () => void;
}

/** 表示だけを受け持つ部分。状態は useIdeaResearch が持つ（単体テストでは、この部分に状態を直接渡す）。 */
export const IdeaResearchPanelView: React.FC<IdeaResearchPanelViewProps> = ({
  text, onChangeText, phase, data, problem, signedIn, building, buildProblem, loginFailed, formatMoney,
  onSubmit, onClose, onOpenCase, onBuild, onLogin,
}) => {
  const loading = phase === 'loading';
  return (
    <section aria-label="自分のアイデアを調べる" className="shrink-0 border-b border-term-line bg-term-panel">
      <div className="term-panel-title">
        <span className="term-panel-name">自分のアイデアを調べる</span>
        {(data || problem) && (
          <button type="button" onClick={onClose} className="ml-auto min-h-11 px-2 text-xs text-term-sub hover:text-term-fg-strong lg:min-h-6">
            結果を閉じる
          </button>
        )}
      </div>
      <form
        onSubmit={(event) => { event.preventDefault(); onSubmit(); }}
        className="flex flex-col gap-2 px-3 pt-2 sm:flex-row"
      >
        <input
          type="text"
          value={text}
          onChange={(event) => onChangeText(event.target.value)}
          maxLength={IDEA_MAX_LENGTH}
          aria-label="自分のアイデア"
          placeholder="例: 町工場の紙図面をLINEで受け付けてデータ化する月額サービス"
          className="min-h-11 w-full min-w-0 flex-1 rounded-sm border border-term-line bg-term-bg px-3 text-sm text-term-fg-strong placeholder:text-term-dim focus:border-term-accent focus:outline-none lg:min-h-8"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-sm border border-term-accent bg-transparent px-4 text-sm text-term-accent hover:bg-term-head disabled:cursor-not-allowed disabled:opacity-45 lg:min-h-8"
        >
          {loading ? '調べています…' : '調べる'}
        </button>
      </form>
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-term-label">
        <span>誰の何をどう解決するかを書くと、似た事例が見つかりやすくなります</span>
        <span className="term-num shrink-0">{Array.from(text).length} / {IDEA_MAX_LENGTH}</span>
      </div>
      {problem && (
        <div role="alert" className="border-t border-term-line px-3 py-2 text-sm text-term-danger">
          {problemMessage(problem)}
        </div>
      )}
      {data && (
        // 幅が足りない画面は事例→AIのまとめを縦に並べて全体を1か所でスクロール、広い画面（xl 以上）は左右に並べてそれぞれスクロールする。
        <div aria-live="polite" className="max-h-[45vh] overflow-y-auto border-t border-term-line xl:grid xl:max-h-none xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:overflow-visible">
          <div className="xl:max-h-[50vh] xl:overflow-y-auto xl:border-r xl:border-term-line">
            <IdeaResearchCases cases={data.cases} onOpenCase={onOpenCase} />
          </div>
          <div className="xl:max-h-[50vh] xl:overflow-y-auto">
            <IdeaResearchSummary
              ai={data.ai}
              reason={data.aiUnavailableReason}
              cases={data.cases}
              signedIn={signedIn}
              formatMoney={formatMoney}
              building={building}
              buildProblem={buildProblem}
              loginFailed={loginFailed}
              onOpenCase={onOpenCase}
              onBuild={onBuild}
              onLogin={onLogin}
            />
          </div>
        </div>
      )}
    </section>
  );
};

/** 事業検討の上部に置く「自分のアイデアを調べる」。入力 → 似た事例 → AIのまとめ → Builderで作る。 */
export const IdeaResearchPanel: React.FC<{ formatMoney?: (yen: number) => string }> = ({ formatMoney = formatYen }) => {
  const router = useRouter();
  const research = useIdeaResearch((path) => router.push(path));
  return (
    <IdeaResearchPanelView
      text={research.text}
      onChangeText={research.setText}
      phase={research.phase}
      data={research.data}
      problem={research.problem}
      signedIn={research.signedIn}
      building={research.building}
      buildProblem={research.buildProblem}
      loginFailed={research.loginFailed}
      formatMoney={formatMoney}
      onSubmit={() => { void research.submit(); }}
      onClose={research.close}
      onOpenCase={openLedgerEntityUrl}
      onBuild={() => { void research.build(); }}
      onLogin={() => { void research.login(); }}
    />
  );
};
