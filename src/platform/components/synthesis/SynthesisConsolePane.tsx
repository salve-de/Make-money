'use client';

import React from 'react';
import { FinancialEntity, SynthesizedIdea, StrategyChatMessage } from '../../types/terminal';
import { Cpu } from 'lucide-react';
import { SynthesisIdeasDossier } from './SynthesisIdeasDossier';
import { SynthesisChatConsole } from './SynthesisChatConsole';

interface SynthesisConsolePaneProps {
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
}

export const SynthesisConsolePane: React.FC<SynthesisConsolePaneProps> = ({
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
}) => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#060709]">
      {/* コンソール上部バー */}
      <div className="border-b border-white/[0.08] bg-[#08090D] p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveConsoleTab('IDEAS')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              activeConsoleTab === 'IDEAS'
                ? 'bg-white/[0.12] text-white border border-white/[0.2]'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            独自アイデア調書 ({synthesizedIdeas.length}件)
          </button>
          <button
            onClick={() => setActiveConsoleTab('CHAT')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              activeConsoleTab === 'CHAT'
                ? 'bg-white/[0.12] text-white border border-white/[0.2]'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            事業デューデリジェンス＆戦略壁打ち
          </button>
        </div>

        {activeEntity && (
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-zinc-500 bg-white/[0.03] px-2.5 py-1 rounded border border-white/[0.06]">
            <span className="text-zinc-400">連動銘柄:</span>
            <span className="text-white font-bold">{activeEntity.name}</span>
          </div>
        )}
      </div>

      {/* 事業アイデア即時検証バー（全タブ共通フロントドア） */}
      <div className="bg-[#090A0F] border-b border-white/[0.08] p-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (ideaInput.trim()) {
              setActiveConsoleTab('CHAT');
              handleSendMessage(ideaInput.trim());
              setIdeaInput('');
            }
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={ideaInput}
              onChange={(e) => setIdeaInput(e.target.value)}
              placeholder="事業アイデアを1行で投げる（例: 町工場の受発注をLINE自動化、士業向け契約書チェッカー）..."
              className="w-full bg-[#060709] border border-white/[0.12] focus:border-white/[0.3] rounded py-2 pl-3 pr-3 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!ideaInput.trim() || isChatSending}
            className="py-2 px-4 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>事業性を冷徹に精査</span>
          </button>
        </form>

        {/* クイック着火プロンプト */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 scrollbar-none text-[10px] font-mono text-zinc-400">
          <span className="shrink-0 text-zinc-500">クイック検証:</span>
          {[
            '町工場の受発注・紙図面をLINEとOCRで自動化する受託モデル',
            '士業向けに契約書の定型チェックをAPIラッピングで提供するマイクロSaaS',
            '不動産会社向けに図面をノーコードで自動補正する特化ツール',
          ].map((pText, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => {
                setActiveConsoleTab('CHAT');
                handleSendMessage(pText);
              }}
              className="shrink-0 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.15] px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer truncate max-w-[240px]"
            >
              {pText}
            </button>
          ))}
        </div>
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1 overflow-hidden relative">
        {activeConsoleTab === 'IDEAS' && (
          <SynthesisIdeasDossier
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
