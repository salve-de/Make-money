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
            className={`rounded-lg overflow-hidden border shadow-xl ${
              isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
            } scroll-mt-4`}
          >
            <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
              isHazardMode ? 'bg-red-950/40 border-red-500/30' : 'bg-[#141A29] border-white/[0.08]'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-1 h-3.5 rounded-full ${isHazardMode ? 'bg-red-500' : 'bg-zinc-300'}`} />
                <div className="flex items-center gap-1.5">
                  <Edit3 className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`} />
                  <h3 className="text-sm font-semibold text-white">
                    {isHazardMode ? '撤退事例のメモ' : '分析メモ'}
                  </h3>
                </div>
              </div>
              {noteSaveStatus ? (
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                  isHazardMode
                    ? 'text-red-300 bg-red-950/60 border-red-800/40'
                    : 'text-zinc-300 bg-white/[0.06] border-white/[0.10]'
                }`}>
                  {{ loading: '読み込み中', saved: 'アカウントに保存済み', local: 'このブラウザだけに保存', saving: '保存中', error: '未保存・再入力で再試行' }[noteSaveStatus]}
                </span>
              ) : (
                <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                  未記録
                </span>
              )}
            </div>

            <div className="p-3.5 space-y-3 bg-[#0E131F]">
              <textarea
                rows={4}
                value={analystNote}
                onChange={(e) => onSaveAnalystNote && onSaveAnalystNote(entity.id, e.target.value)}
                placeholder={isHazardMode
                  ? '例: 公開資料に記載された撤退時期と要因。因果関係は資料で確認できる範囲に限る。'
                  : '例: 公開情報で確認できた顧客層、販売経路、費用。分からない点は「未確認」と記録する。'}
                className="w-full bg-[#141A28] border border-white/[0.12] focus:border-white/[0.28] rounded-md p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors resize-none leading-relaxed font-sans"
              />

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                {onOpenSynthesisWithEntity && (
                  <button
                    onClick={() => onOpenSynthesisWithEntity(entity.id)}
                    className="w-full sm:flex-1 py-2 px-3 rounded-md bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.14] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{isHazardMode ? 'この事例をAIで分析する' : '事例データをAIで分析する'}</span>
                  </button>
                )}
              </div>

            </div>

          </div>
  </>;
}
