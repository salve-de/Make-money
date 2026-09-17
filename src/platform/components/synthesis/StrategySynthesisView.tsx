'use client';

import React from 'react';
import { FinancialEntity } from '../../types/terminal';
import { useStrategySynthesis } from '../../hooks/useStrategySynthesis';
import { SynthesisEntitiesSidebar } from './SynthesisEntitiesSidebar';
import { SynthesisConsolePane } from './SynthesisConsolePane';

interface StrategySynthesisViewProps {
  allEntities: FinancialEntity[];
  bookmarkedIds: Set<string>;
  viewedEntityIds?: string[];
  notes: Record<string, { entityId: string; content: string; updatedAt: string }>;
  onSaveNote: (entityId: string, content: string) => void;
  currency: 'JPY' | 'USD';
  initialContextEntityId?: string | null;
}

export const StrategySynthesisView: React.FC<StrategySynthesisViewProps> = ({
  allEntities,
  bookmarkedIds,
  viewedEntityIds = [],
  notes,
  onSaveNote,
  currency,
  initialContextEntityId,
}) => {
  const {
    userProfile,
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
  } = useStrategySynthesis({
    allEntities,
    bookmarkedIds,
    viewedEntityIds,
    notes,
    currency,
    initialContextEntityId,
  });

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#060709] text-zinc-300 font-sans">
      {/* 左ペイン: 保存銘柄 ＆ アナリスト極秘メモ（インプット資材） */}
      <SynthesisEntitiesSidebar
        savedEntities={savedEntities}
        selectedEntityIds={selectedEntityIds}
        toggleSelectEntity={toggleSelectEntity}
        activeEditingEntityId={activeEditingEntityId}
        setActiveEditingEntityId={setActiveEditingEntityId}
        userProfile={userProfile}
        notes={notes}
        onSaveNote={onSaveNote}
        formatMoney={formatMoney}
        handleSynthesize={handleSynthesize}
        isSynthesizing={isSynthesizing}
      />

      {/* 右ペイン: メインコンソール（アイデア調書 ＆ 冷徹な壁打ちチャット） */}
      <SynthesisConsolePane
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
      />
    </div>
  );
};
