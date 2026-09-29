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
  const tabBtn = (active: boolean) => `min-h-11 border-r border-term-line px-3 text-sm lg:min-h-[28px] lg:text-xs ${active ? 'bg-[var(--surface-overlay)] text-term-fg-strong shadow-[inset_0_-2px_0_var(--term-accent)]' : 'text-term-muted hover:bg-term-head'}`;
  return (
    <div className={`min-h-0 flex-1 flex-col overflow-hidden bg-term-bg ${mobileHidden ? 'hidden md:flex' : 'flex'}`}>
      <div className="flex shrink-0 items-stretch justify-between gap-3 border-b border-term-line bg-term-panel">
        <div className="flex flex-wrap items-stretch">
          <button onClick={() => setActiveConsoleTab('IDEAS')} aria-pressed={activeConsoleTab === 'IDEAS'} className={tabBtn(activeConsoleTab === 'IDEAS')}>
            企画案（<span className="term-num">{synthesizedIdeas.length}</span>）
          </button>
          <button onClick={() => setActiveConsoleTab('CHAT')} aria-pressed={activeConsoleTab === 'CHAT'} className={tabBtn(activeConsoleTab === 'CHAT')}>
            相談
          </button>
        </div>

        {activeEntity && (
          <div className="hidden max-w-[40%] items-center truncate px-3 text-xs text-term-label sm:flex">
            対象事例 <span className="ml-2 truncate text-term-fg-strong">{activeEntity.name}</span>
          </div>
        )}
      </div>

      {requestError && (
        <div role="alert" className="border-b border-term-line px-3 py-2 text-sm text-term-danger">
          {requestError}
        </div>
      )}

      {activeConsoleTab === 'IDEAS' && synthesizedIdeas.length > 0 && <div className="shrink-0 border-b border-term-line bg-term-panel p-2">
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
              className="min-h-11 w-full rounded-sm border border-term-line bg-term-bg px-3 text-sm text-term-fg-strong placeholder:text-term-dim focus:border-term-accent focus:outline-none lg:min-h-8"
            />
          </div>
          <button
            type="submit"
            disabled={!ideaInput.trim() || isChatSending}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm border border-term-accent bg-transparent px-4 text-sm text-term-accent hover:bg-term-head disabled:cursor-not-allowed disabled:opacity-45 lg:min-h-8"
          >
            <span>相談する</span>
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </form>

        <details className="group mt-1">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between text-xs text-term-label hover:text-term-fg lg:min-h-8">
            入力例
            <span className="text-term-dim">収益の根拠・顧客・コストなど</span>
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
                className="min-h-11 rounded-sm border border-term-line px-3 text-sm text-term-fg hover:bg-term-head lg:min-h-8"
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
