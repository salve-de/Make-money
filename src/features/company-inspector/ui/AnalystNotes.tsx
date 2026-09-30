import {
Edit3
} from 'lucide-react';

import { UI } from '@/shared/ui-strings';
import type { InspectorSectionProps } from '../model/section-props';

export function AnalystNotes({ entity, analystNote, noteSaveStatus, onSaveAnalystNote, onOpenSynthesisWithEntity, isHazardMode }: Pick<InspectorSectionProps, 'entity' | 'analystNote' | 'noteSaveStatus' | 'onSaveAnalystNote' | 'onOpenSynthesisWithEntity' | 'isHazardMode'>) {
  // 読者が自分で書く欄なので、メモが空でも入力欄は出す。事例データの欄ではない。
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
                  <Edit3 className={`w-3.5 h-3.5 ${isHazardMode ? 'text-term-danger' : 'text-term-label'}`} />
                  <h3 className="text-sm font-semibold text-term-fg-strong">
                    {isHazardMode ? UI.NOTE_HAZARD : UI.NOTE}
                  </h3>
                </div>
              </div>
              {noteSaveStatus && (
                <span className={`font-mono text-xs px-2 py-0.5 rounded-sm border ${
                  isHazardMode
                    ? 'text-term-danger  border-term-line'
                    : 'text-term-fg bg-term-head border-term-line'
                }`}>
                  {{ loading: UI.NOTE_STATUS_LOADING, saved: UI.NOTE_STATUS_SAVED, local: UI.NOTE_STATUS_LOCAL, saving: UI.NOTE_STATUS_SAVING, error: UI.NOTE_STATUS_ERROR }[noteSaveStatus]}
                </span>
              )}
            </div>

            <div className="p-3.5 space-y-3 bg-term-panel">
              <textarea
                rows={4}
                value={analystNote}
                onChange={(e) => onSaveAnalystNote && onSaveAnalystNote(entity.id, e.target.value)}
                placeholder={UI.NOTE_PLACEHOLDER}
                aria-label={isHazardMode ? UI.NOTE_HAZARD : UI.NOTE}
                className="w-full bg-term-head border border-term-line focus:border-term-muted rounded-sm p-3 text-xs text-term-fg-strong placeholder:text-term-dim focus:outline-none transition-colors resize-none leading-relaxed font-sans"
              />

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                {onOpenSynthesisWithEntity && (
                  <button
                    onClick={() => onOpenSynthesisWithEntity(entity.id)}
                    className="w-full sm:flex-1 py-2 px-3 rounded-sm bg-term-head hover:bg-term-head border border-term-line text-term-fg-strong text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{isHazardMode ? UI.NOTE_AI_HAZARD : UI.NOTE_AI}</span>
                  </button>
                )}
              </div>

            </div>

          </div>
  </>;
}
