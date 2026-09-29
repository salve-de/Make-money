'use client';

import React from 'react';
import { StrategyChatMessage } from '../../types/terminal';
import { Send, LoaderCircle, Globe, ExternalLink } from 'lucide-react';

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
    <div className="flex h-full flex-col overflow-hidden">
      <div aria-live="polite" className={`${chatMessages.length === 0 ? 'shrink-0' : 'min-h-0 flex-1'} overflow-y-auto`}>
        {chatMessages.length === 0 && (
          <section className="border-b border-term-line">
            <div className="term-panel-title"><span className="term-panel-name">事例について相談</span></div>
            <p className="px-3 py-2 text-sm text-term-sub">選んだ事例について質問できます。下の候補を押すと入力欄に入ります。</p>
            <div className="flex flex-wrap gap-2 px-3 pb-3">
              {[
                ['収益の仕組み', '選択した事例は、誰に何を提供して収益を得ていますか？'],
                ['必要な費用', '選択した事例の立ち上げと運営に必要な費用を整理して'],
                ['事業への応用', '選択した事例の仕組みを、別の事業に応用する案を考えて'],
              ].map(([label, prompt]) => (
                <button key={label} type="button" onClick={() => setChatInput(prompt)} className="min-h-11 rounded-sm border border-term-line px-3 text-sm text-term-fg hover:bg-term-head lg:min-h-8">{label}</button>
              ))}
            </div>
          </section>
        )}
        {chatMessages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          return (
            <div key={msg.id} className={`border-b border-term-line-soft px-3 py-2 ${isAssistant ? '' : 'bg-term-row-alt'}`}>
              <div className="min-w-0 max-w-3xl space-y-1.5">
                <div className={`text-xs ${isAssistant ? 'text-term-accent' : 'text-term-label'}`}>
                  {isAssistant ? '回答' : 'あなた'}
                </div>
                <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-term-fg">
                  {msg.content}
                </div>

                {isAssistant && msg.sources && msg.sources.length > 0 && (
                  <div className="space-y-1 border-t border-term-line-soft pt-1.5">
                    <div className="flex items-center gap-2 text-xs text-term-label">
                      <Globe aria-hidden="true" className="h-3.5 w-3.5" />
                      <span>回答で参照したページ</span>
                    </div>
                    <div className="flex flex-col">
                      {msg.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-2 text-sm text-term-select-fg underline underline-offset-2 hover:text-term-fg-strong lg:min-h-8"
                        >
                          <span className="break-words">{src.title}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-term-label" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {isAssistant && msg.suggestedActionPrompts && msg.suggestedActionPrompts.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {msg.suggestedActionPrompts.map((promptText, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => setChatInput(promptText)}
                        className="min-h-11 cursor-pointer rounded-sm border border-term-line px-3 py-1.5 text-left text-sm text-term-fg hover:bg-term-head lg:min-h-8"
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
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-term-sub" role="status">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>回答を作成しています</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`${chatMessages.length === 0 ? 'px-3 py-2' : 'border-t border-term-line bg-term-panel p-2'} shrink-0`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex max-w-3xl items-end gap-2"
        >
          <textarea
            rows={2}
            aria-label="相談内容"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="質問や追加条件を入力"
            className="max-h-48 min-h-11 min-w-0 flex-1 resize-y rounded-sm border border-term-line bg-term-bg px-3 py-2 text-sm leading-relaxed text-term-fg-strong placeholder:text-term-dim focus:border-term-accent focus:outline-none"
          />
          <button
            type="submit"
            aria-label="相談を送信"
            disabled={!chatInput.trim() || isChatSending}
            className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-term-accent bg-transparent px-3 text-term-accent hover:bg-term-head disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">送信</span>
          </button>
        </form>
      </div>
    </div>
  );
};
