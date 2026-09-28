'use client';

import React from 'react';
import { FinancialEntity } from '../../types/terminal';
import { useStrategySynthesis } from '../../hooks/useStrategySynthesis';
import { SynthesisEntitiesSidebar } from './SynthesisEntitiesSidebar';
import { SynthesisConsolePane } from './SynthesisConsolePane';

interface StrategySynthesisViewProps {
  allEntities: FinancialEntity[];
  bookmarkedIds: Set<string>;
  notes: Record<string, { entityId: string; content: string; updatedAt: string }>;
  onSaveNote: (entityId: string, content: string) => void;
  currency: 'JPY' | 'USD';
  initialContextEntityId?: string | null;
  onLoadEntity?: (id: string) => Promise<void>;
}

export const StrategySynthesisView: React.FC<StrategySynthesisViewProps> = ({
  allEntities,
  bookmarkedIds,
  notes,
  onSaveNote,
  currency,
  initialContextEntityId,
  onLoadEntity,
}) => {
  const [mobilePane, setMobilePane] = React.useState<'SOURCES' | 'WORKSPACE'>('SOURCES');
  const requestedDetails = React.useRef(new Set<string>());
  const detailIds = [...new Set([
    ...bookmarkedIds,
    ...(initialContextEntityId ? [initialContextEntityId] : []),
    ...(bookmarkedIds.size === 0 ? allEntities.slice(0, 3).map((entity) => entity.id) : []),
  ])].join('\n');

  React.useEffect(() => {
    if (!onLoadEntity) return;
    let cancelled = false;
    void (async () => {
      for (const id of detailIds.split('\n').filter(Boolean)) {
        if (cancelled) break;
        if (requestedDetails.current.has(id)) continue;
        requestedDetails.current.add(id);
        await onLoadEntity(id);
      }
    })();
    return () => { cancelled = true; };
  }, [detailIds, onLoadEntity]);
  const {
    savedEntities,
    selectedEntityIds,
    toggleSelectEntity,
    activeEditingEntityId,
    setActiveEditingEntityId,
    synthesizedIdeas,
    isSynthesizing,
    activeConsoleTab,
    setActiveConsoleTab,
    chatMessages,
    chatInput,
    setChatInput,
    ideaInput,
    setIdeaInput,
    isChatSending,
    messagesEndRef,
    formatMoney,
    handleSynthesize,
    handleSendMessage,
    handleDrilldownIdea,
    activeEntity,
    requestError,
  } = useStrategySynthesis({
    allEntities,
    bookmarkedIds,
    notes,
    currency,
    initialContextEntityId,
  });

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full min-h-0 overflow-hidden bg-[#060709] text-zinc-300 font-sans">
      <nav className="grid shrink-0 grid-cols-2 border-b border-white/[0.16] bg-surface md:hidden" aria-label="事業検討の作業面">
        <button type="button" onClick={() => setMobilePane('SOURCES')} aria-pressed={mobilePane === 'SOURCES'} className={`min-h-11 border-b-2 px-2 text-sm font-medium ${mobilePane === 'SOURCES' ? 'border-accent text-accent-strong' : 'border-transparent text-zinc-300'}`}>保存した事例</button>
        <button type="button" onClick={() => setMobilePane('WORKSPACE')} aria-pressed={mobilePane === 'WORKSPACE'} className={`min-h-11 border-b-2 px-2 text-sm font-medium ${mobilePane === 'WORKSPACE' ? 'border-accent text-accent-strong' : 'border-transparent text-zinc-300'}`}>企画案・相談</button>
      </nav>
      {/* 左ペイン: 保存銘柄 ＆ アナリスト極秘メモ（インプット資材） */}
      <SynthesisEntitiesSidebar
        mobileHidden={mobilePane !== 'SOURCES'}
        savedEntities={savedEntities}
        selectedEntityIds={selectedEntityIds}
        toggleSelectEntity={toggleSelectEntity}
        activeEditingEntityId={activeEditingEntityId}
        setActiveEditingEntityId={setActiveEditingEntityId}
        notes={notes}
        onSaveNote={onSaveNote}
        formatMoney={formatMoney}
        handleSynthesize={() => { handleSynthesize(); setMobilePane('WORKSPACE'); }}
        isSynthesizing={isSynthesizing}
      />

      {/* 右ペイン: メインコンソール（アイデア調書 ＆ 冷徹な壁打ちチャット） */}
      <SynthesisConsolePane
        mobileHidden={mobilePane !== 'WORKSPACE'}
        entities={allEntities}
        selectedEntityIds={selectedEntityIds}
        activeConsoleTab={activeConsoleTab}
        setActiveConsoleTab={setActiveConsoleTab}
        synthesizedIdeas={synthesizedIdeas}
        activeEntity={activeEntity}
        ideaInput={ideaInput}
        setIdeaInput={setIdeaInput}
        isChatSending={isChatSending}
        handleSendMessage={handleSendMessage}
        handleSynthesize={handleSynthesize}
        isSynthesizing={isSynthesizing}
        formatMoney={formatMoney}
        handleDrilldownIdea={handleDrilldownIdea}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        messagesEndRef={messagesEndRef}
        requestError={requestError}
      />
    </div>
  );
};
