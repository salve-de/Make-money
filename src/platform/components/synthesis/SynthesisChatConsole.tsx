'use client';

import React from 'react';
import { StrategyChatMessage } from '../../types/terminal';
import { 
  Send, 
  Bot, 
  User, 
  Activity,
  Globe,
  ExternalLink,
} from 'lucide-react';

interface SynthesisChatConsoleProps {
  chatMessages: StrategyChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  isChatSending: boolean;
  handleSendMessage: (text?: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const SynthesisChatConsole: React.FC<SynthesisChatConsoleProps> = ({
  chatMessages,
  chatInput,
  setChatInput,
  isChatSending,
  handleSendMessage,
  messagesEndRef,
}) => {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* メッセージスクロール領域 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {chatMessages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'
              }`}
            >
              {/* アバター */}
              <div
                className={`w-7 h-7 rounded shrink-0 flex items-center justify-center font-mono text-xs ${
                  isAssistant
                    ? 'bg-white/[0.06] border border-white/[0.1] text-emerald-400'
                    : 'bg-white/[0.15] border border-white/[0.2] text-white'
                }`}
              >
                {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* 本文吹き出し */}
              <div className="space-y-2 min-w-0 max-w-2xl">
                <div
                  className={`p-3.5 rounded border text-xs leading-relaxed font-sans whitespace-pre-wrap ${
                    isAssistant
                      ? 'bg-[#0A0B0F] border-white/[0.08] text-zinc-200'
                      : 'bg-white/[0.08] border-white/[0.15] text-white'
                  }`}
                >
                  {msg.content}
                </div>

                {/* リアルタイムGoogle検索の参照元（Grounding Sources） */}
                {isAssistant && msg.sources && msg.sources.length > 0 && (
                  <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                      <Globe className="w-3 h-3 text-emerald-400" />
                      <span>リアルタイムWeb検索による参照ソース:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-300 hover:text-emerald-400 bg-white/[0.03] hover:bg-white/[0.08] px-2 py-0.5 rounded border border-white/[0.06] transition-colors truncate max-w-[280px]"
                        >
                          <span className="truncate">{src.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0 text-zinc-500" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* サジェストプロンプト */}
                {isAssistant && msg.suggestedActionPrompts && msg.suggestedActionPrompts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggestedActionPrompts.map((promptText, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleSendMessage(promptText)}
                        className="text-[10px] font-mono text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] px-2.5 py-1 rounded transition-colors text-left cursor-pointer"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isChatSending && (
          <div className="flex gap-3 max-w-3xl mr-auto">
            <div className="w-7 h-7 rounded shrink-0 flex items-center justify-center bg-white/[0.06] border border-white/[0.1] text-emerald-400">
              <Activity className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 rounded bg-[#0A0B0F] border border-white/[0.08] text-xs font-mono text-zinc-400">
              アナリスト推論中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* チャット入力バー */}
      <div className="p-3 md:p-4 border-t border-white/[0.08] bg-[#08090D] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 max-w-3xl mx-auto"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="アイデアの壁打ち・大手の死角・最小固定費について質問（Shift+Enterで改行）..."
            className="flex-1 bg-[#060709] border border-white/[0.1] focus:border-white/[0.25] rounded p-2.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isChatSending}
            className="p-2.5 rounded bg-white/[0.1] hover:bg-white/[0.18] border border-white/[0.15] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
