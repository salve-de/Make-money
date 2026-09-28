import {
Edit3
} from 'lucide-react';

import type { InspectorSectionProps } from '../model/section-props';

export function AnalystNotes({ entity, analystNote, noteSaveStatus, onSaveAnalystNote, onOpenSynthesisWithEntity, isHazardMode }: Pick<InspectorSectionProps, 'entity' | 'analystNote' | 'noteSaveStatus' | 'onSaveAnalystNote' | 'onOpenSynthesisWithEntity' | 'isHazardMode'>) {
  return <>
          {/* ------------------------------------------------------- */}
          {/* 分析メモ */}
          {/* ------------------------------------------------------- */}
          <div
            id="section-notes"
            className={`rounded-sm overflow-hidden border  ${
              isHazardMode ? 'border-term-line bg-term-panel' : 'border-term-line bg-term-panel'
            } scroll-mt-4`}
          >
            <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
              isHazardMode ? ' border-term-line' : 'bg-term-head border-term-line-soft'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-0.5 h-3.5 bg-term-accent`} />
                <div className="flex items-center gap-1.5">
                  <Edit3 className={`w-3.5 h-3.5 ${isHazardMode ? 'text-term-danger' : 'text-zinc-400'}`} />
                  <h3 className="text-sm font-semibold text-term-fg-strong">
                    {isHazardMode ? '撤退事例のメモ' : '分析メモ'}
                  </h3>
                </div>
              </div>
              {noteSaveStatus ? (
                <span className={`font-mono text-xs px-2 py-0.5 rounded-sm border ${
                  isHazardMode
                    ? 'text-term-danger  border-term-line'
                    : 'text-zinc-300 bg-term-head border-term-line'
                }`}>
                  {{ loading: '読み込み中', saved: 'アカウントに保存済み', local: 'このブラウザだけに保存', saving: '保存中', error: '未保存・再入力で再試行' }[noteSaveStatus]}
                </span>
              ) : (
                <span className="font-mono text-xs text-zinc-400 bg-term-head px-2 py-0.5 rounded-sm border border-term-line-soft">
                  未記録
                </span>
              )}
            </div>

            <div className="p-3.5 space-y-3 bg-term-panel">
              <textarea
                rows={4}
                value={analystNote}
                onChange={(e) => onSaveAnalystNote && onSaveAnalystNote(entity.id, e.target.value)}
                placeholder={isHazardMode
                  ? '例: 公開資料に記載された撤退時期と要因。因果関係は資料で確認できる範囲に限る。'
                  : '例: 公開情報で確認できた顧客層、販売経路、費用。分からない点は「未確認」と記録する。'}
                className="w-full bg-term-head border border-term-line focus:border-term-line rounded-sm p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors resize-none leading-relaxed font-sans"
              />

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                {onOpenSynthesisWithEntity && (
                  <button
                    onClick={() => onOpenSynthesisWithEntity(entity.id)}
                    className="w-full sm:flex-1 py-2 px-3 rounded-sm bg-term-head hover:bg-term-head border border-term-line text-term-fg-strong text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{isHazardMode ? 'この事例をAIで分析する' : '事例データをAIで分析する'}</span>
                  </button>
                )}
              </div>

            </div>

          </div>
  </>;
}
