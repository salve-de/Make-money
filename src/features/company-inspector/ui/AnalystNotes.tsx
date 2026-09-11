import {
Bot,
Edit3
} from 'lucide-react';

import type { InspectorSectionProps } from '../model/section-props';

export function AnalystNotes({ entity, analystNote, noteSaveStatus, onSaveAnalystNote, onOpenSynthesisWithEntity, isHazardMode }: Pick<InspectorSectionProps, 'entity' | 'analystNote' | 'noteSaveStatus' | 'onSaveAnalystNote' | 'onOpenSynthesisWithEntity' | 'isHazardMode'>) {
  return <>
          {/* ------------------------------------------------------- */}
          {/* #14: アナリスト考察メモ ＆ AI壁打ち (FIELD NOTES) */}
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
                <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
                  isHazardMode
                    ? 'text-red-400 bg-red-950/40 border-red-500/30'
                    : 'text-zinc-100 bg-white/[0.08] border-white/[0.14]'
                }`}>
                  #14
                </span>
                <div className="flex items-center gap-1.5">
                  <Edit3 className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`} />
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                    {isHazardMode ? 'POST_MORTEM_NOTES: 死因検死・地雷回避メモ' : 'ANALYST_FIELD_NOTES: 極秘考察メモ'}
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
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {isHazardMode
                  ? `${entity.name}が爆死・転落した真の死因を記録し、自分が同じ事業や似た構造で参入する際に『絶対に避けるべき地雷』を特定してください。AIとの壁打ちでこの地雷を迂回する防壁を検証できます。`
                  : `${entity.name}の盲点・手口・原価構造から着想を得た独自の転用アイデアや、別市場へのスライド仮説を記録してください。このメモはAIとの壁打ちや独自アイデア創出の着火剤として読み込まれます。`}
              </p>

              <textarea
                rows={4}
                value={analystNote}
                onChange={(e) => onSaveAnalystNote && onSaveAnalystNote(entity.id, e.target.value)}
                placeholder={isHazardMode
                  ? "例: なぜChatGPT登場でJasperは即死したのか？ OpenAIのAPIラッパーに留まらず、自前の独自データセットや業務フローの深い監禁（人質化）があれば生き残れたか？..."
                  : "例: このAPIラッパーの構造を士業の契約書レビューに応用できないか？ 初期の自演集客（Reddit）の代わりにXやnoteを活用し、初期100人を集める..."}
                className="w-full bg-[#141A28] border border-white/[0.12] focus:border-white/[0.28] rounded-md p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors resize-none leading-relaxed font-sans"
              />

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                {onOpenSynthesisWithEntity && (
                  <button
                    onClick={() => onOpenSynthesisWithEntity(entity.id)}
                    className="w-full sm:flex-1 py-2 px-3 rounded-md bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.14] text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-[0.99]"
                  >
                    <Bot className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-zinc-300'}`} />
                    <span>{isHazardMode ? 'この地雷の回避策をAIと壁打ちする' : 'この銘柄のデータでAIと壁打ちする'}</span>
                  </button>
                )}
              </div>

              {/* 銘柄の着眼点サマリー */}
              <div className="border border-white/[0.08] rounded-md bg-[#141A28] p-3 space-y-2">
                <span className="font-mono text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                  考察の武器（この銘柄のキーデータ）
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#0E131F] p-2.5 rounded border border-white/[0.06]">
                    <span className="text-zinc-400 block text-[10px] font-semibold">人質にした財布</span>
                    <span className="text-zinc-100 font-medium">{entity.targetPainWallet || '顧客の恐怖・怠惰'}</span>
                  </div>
                  <div className="bg-[#0E131F] p-2.5 rounded border border-white/[0.06]">
                    <span className="text-zinc-400 block text-[10px] font-semibold">初動集客の泥臭い手口</span>
                    <span className="text-zinc-100 font-medium">{entity.strategy.initialTraction[0]}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
  </>;
}
