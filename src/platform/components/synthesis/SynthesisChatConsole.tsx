'use client';

import React from 'react';
import { StrategyChatMessage } from '../../types/terminal';
import { 
  Send, 
  User, 
  LoaderCircle,
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
      <div aria-live="polite" className={`${chatMessages.length === 0 ? 'shrink-0 pb-0 md:pb-0' : 'min-h-0 flex-1'} overflow-y-auto p-4 md:p-6 space-y-5 scrollbar-thin scrollbar-thumb-white/10`}>
        {chatMessages.length === 0 && (
          <section className="mx-auto max-w-3xl rounded-md border border-white/[0.16] bg-[#101721] p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-100">事例について相談</h2>
            <div className="flex flex-wrap gap-2">
              {[
                ['収益の仕組み', '選択した事例は、誰に何を提供して収益を得ていますか？'],
                ['必要な費用', '選択した事例の立ち上げと運営に必要な費用を整理して'],
                ['事業への応用', '選択した事例の仕組みを、別の事業に応用する案を考えて'],
              ].map(([label, prompt]) => (
                <button key={label} type="button" onClick={() => setChatInput(prompt)} className="min-h-10 rounded border border-white/[0.14] px-3 text-sm text-sky-100 hover:bg-white/[0.06]">{label}</button>
              ))}
            </div>
          </section>
        )}
        {chatMessages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'
              }`}
            >
              <div
                className={`w-7 h-7 rounded shrink-0 flex items-center justify-center font-mono text-xs ${
                  isAssistant
                    ? 'hidden'
                    : 'bg-slate-700 border border-slate-600 text-white'
                }`}
              >
                {!isAssistant && <User className="w-4 h-4" aria-hidden="true" />}
              </div>

              {/* 本文吹き出し */}
              <div className="space-y-2 min-w-0 max-w-2xl">
                <div className={`text-xs font-medium ${isAssistant ? 'text-slate-300' : 'text-slate-400 text-right'}`}>
                  {isAssistant ? '回答' : 'あなた'}
                </div>
                <div
                  className={`p-4 rounded-lg border text-sm leading-relaxed font-sans whitespace-pre-wrap ${
                    isAssistant
                      ? 'bg-slate-900 border-slate-700 text-slate-100'
                      : 'bg-slate-800 border-slate-600 text-white'
                  }`}
                >
                  {msg.content}
                </div>

                {/* リアルタイムGoogle検索の参照元（Grounding Sources） */}
                {isAssistant && msg.sources && msg.sources.length > 0 && (
                  <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                      <Globe className="w-4 h-4 text-slate-300" />
                      <span>回答で参照したページ</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {msg.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-2 text-sm text-cyan-200 hover:text-white bg-slate-950/50 hover:bg-slate-800 px-3 py-2 rounded border border-slate-700 transition-colors"
                        >
                          <span className="break-words">{src.title}</span>
                          <ExternalLink className="w-4 h-4 shrink-0 text-slate-400" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* サジェストプロンプト */}
                {isAssistant && msg.suggestedActionPrompts && msg.suggestedActionPrompts.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {msg.suggestedActionPrompts.map((promptText, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => setChatInput(promptText)}
                        className="min-h-11 text-sm text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer"
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
          <div className="flex items-center gap-2 max-w-3xl mr-auto text-sm text-slate-300" role="status">
            <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>回答を作成しています</span>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* チャット入力バー */}
      <div className={`${chatMessages.length === 0 ? 'px-4 py-3 md:px-6' : 'p-3 md:p-4 border-t border-slate-700 bg-slate-950'} shrink-0`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2 max-w-3xl mx-auto"
        >
          <textarea
            rows={2}
            aria-label="相談内容"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="質問や追加条件を入力"
            className="min-w-0 flex-1 min-h-11 max-h-48 resize-y bg-slate-900 border border-slate-600 focus:border-cyan-400 rounded-lg px-3 py-2 text-sm leading-relaxed text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-colors"
          />
          <button
            type="submit"
            aria-label="相談を送信"
            disabled={!chatInput.trim() || isChatSending}
            className="min-h-11 min-w-11 px-3 rounded-lg bg-cyan-700 hover:bg-cyan-600 border border-cyan-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0 flex items-center justify-center"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">送信</span>
          </button>
        </form>
      </div>
    </div>
  );
};
