'use client';

import React from 'react';
import { FinancialEntity, SynthesizedIdea, StrategyChatMessage } from '../../types/terminal';
import { ArrowUpRight } from 'lucide-react';
import { SynthesisIdeasDossier } from './SynthesisIdeasDossier';
import { SynthesisChatConsole } from './SynthesisChatConsole';

interface SynthesisConsolePaneProps {
  mobileHidden?: boolean;
  entities: FinancialEntity[];
  selectedEntityIds: Set<string>;
  activeConsoleTab: 'IDEAS' | 'CHAT';
  setActiveConsoleTab: (tab: 'IDEAS' | 'CHAT') => void;
  synthesizedIdeas: SynthesizedIdea[];
  activeEntity?: FinancialEntity;
  ideaInput: string;
  setIdeaInput: (input: string) => void;
  isChatSending: boolean;
  handleSendMessage: (text?: string) => void;
  handleSynthesize: () => void;
  isSynthesizing: boolean;
  formatMoney: (yen: number) => string;
  handleDrilldownIdea: (idea: SynthesizedIdea) => void;
  chatMessages: StrategyChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  requestError?: string | null;
}

export const SynthesisConsolePane: React.FC<SynthesisConsolePaneProps> = ({
  mobileHidden = false,
  entities,
  selectedEntityIds,
  activeConsoleTab,
  setActiveConsoleTab,
  synthesizedIdeas,
  activeEntity,
  ideaInput,
  setIdeaInput,
  isChatSending,
  handleSendMessage,
  handleSynthesize,
  isSynthesizing,
  formatMoney,
  handleDrilldownIdea,
  chatMessages,
  chatInput,
  setChatInput,
  messagesEndRef,
  requestError,
}) => {
  return (
    <div className={`min-h-0 flex-1 flex-col overflow-hidden bg-[#060709] ${mobileHidden ? 'hidden md:flex' : 'flex'}`}>
      {/* コンソール上部バー */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.1] bg-[#171e25] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveConsoleTab('IDEAS')}
            className={`min-h-11 rounded-md px-3 text-sm font-medium transition-colors ${
              activeConsoleTab === 'IDEAS'
                ? 'border border-white/[0.2] bg-white/[0.1] text-zinc-50'
                : 'border border-transparent text-zinc-300 hover:bg-white/[0.05]'
            }`}
          >
            企画案（{synthesizedIdeas.length}）
          </button>
          <button
            onClick={() => setActiveConsoleTab('CHAT')}
            className={`min-h-11 rounded-md px-3 text-sm font-medium transition-colors ${
              activeConsoleTab === 'CHAT'
                ? 'border border-white/[0.2] bg-white/[0.1] text-zinc-50'
                : 'border border-transparent text-zinc-300 hover:bg-white/[0.05]'
            }`}
          >
            相談
          </button>
        </div>

        {activeEntity && (
          <div className="hidden max-w-[40%] truncate rounded border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300 sm:block">
            対象事例: <span className="font-medium text-zinc-100">{activeEntity.name}</span>
          </div>
        )}
      </div>

      {requestError && (
        <div
          role="alert"
          className="border-b border-rose-400/25 bg-rose-950/30 px-4 py-3 text-sm text-rose-100"
        >
          {requestError}
        </div>
      )}

      {/* 事業アイデア即時検証バー（全タブ共通フロントドア） */}
      {activeConsoleTab === 'IDEAS' && synthesizedIdeas.length > 0 && <div className="shrink-0 border-b border-white/[0.1] bg-[#10151a] p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (ideaInput.trim()) {
              setActiveConsoleTab('CHAT');
              handleSendMessage(ideaInput.trim());
              setIdeaInput('');
            }
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={ideaInput}
              onChange={(e) => setIdeaInput(e.target.value)}
              aria-label="アイデアについて相談する"
              placeholder="企画案の疑問や、追加で見たい根拠を入力"
              className="min-h-11 w-full rounded-md border border-white/[0.16] bg-[#0d1217] px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-300/60 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!ideaInput.trim() || isChatSending}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-sky-200 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span>相談する</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </form>

        <details className="group mt-2">
          <summary className="flex min-h-9 cursor-pointer items-center justify-between text-xs text-zinc-400 hover:text-zinc-200">
            入力例
            <span className="text-zinc-500">収益の根拠・顧客・コストなど</span>
          </summary>
          <div className="flex flex-wrap gap-2 pb-1">
            {[
              'この案の利益仮説は何を根拠にしている？',
              '最初に確認すべき顧客と価格は？',
              '必要な費用と失敗条件を整理して',
            ].map((pText, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => {
                  setActiveConsoleTab('CHAT');
                  setChatInput(pText);
                }}
                className="min-h-10 rounded border border-white/[0.12] bg-white/[0.03] px-3 text-sm text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                {pText}
              </button>
            ))}
          </div>
        </details>
      </div>}

      {/* タブコンテンツ */}
      <div className="flex-1 overflow-hidden relative">
        {activeConsoleTab === 'IDEAS' && (
          <SynthesisIdeasDossier
            entities={entities}
            selectedEntityIds={selectedEntityIds}
            synthesizedIdeas={synthesizedIdeas}
            handleSynthesize={handleSynthesize}
            isSynthesizing={isSynthesizing}
            formatMoney={formatMoney}
            handleDrilldownIdea={handleDrilldownIdea}
          />
        )}

        {activeConsoleTab === 'CHAT' && (
          <SynthesisChatConsole
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            isChatSending={isChatSending}
            handleSendMessage={handleSendMessage}
            messagesEndRef={messagesEndRef}
          />
        )}
      </div>
    </div>
  );
};
