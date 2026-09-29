'use client';

import React from 'react';
import { FinancialEntity } from '../../types/terminal';
import { useStrategySynthesis } from '../../hooks/useStrategySynthesis';
import { formatYen } from '../../utils/moneyDisplay';
import { SynthesisEntitiesSidebar } from './SynthesisEntitiesSidebar';
import { SynthesisConsolePane } from './SynthesisConsolePane';
import { IdeaResearchPanel } from './IdeaResearchPanel';

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
    formatMoney: hookFormatMoney,
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

  // 円表示は共通の moneyDisplay に統一する。USD 表示のときだけフック側の書式を使う。
  const formatMoney = (yen: number) => (currency === 'USD' ? hookFormatMoney(yen) : formatYen(yen));

  const workspace = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-term-bg font-sans text-term-fg md:flex-row">
      <nav className="grid shrink-0 grid-cols-2 border-b border-term-line bg-term-panel md:hidden" aria-label="事業検討の作業面">
        <button type="button" onClick={() => setMobilePane('SOURCES')} aria-pressed={mobilePane === 'SOURCES'} className={`min-h-11 border-r border-term-line px-2 text-sm ${mobilePane === 'SOURCES' ? 'bg-[var(--surface-overlay)] text-term-fg-strong shadow-[inset_0_-2px_0_var(--term-accent)]' : 'text-term-muted'}`}>事例とメモ</button>
        <button type="button" onClick={() => setMobilePane('WORKSPACE')} aria-pressed={mobilePane === 'WORKSPACE'} className={`min-h-11 px-2 text-sm ${mobilePane === 'WORKSPACE' ? 'bg-[var(--surface-overlay)] text-term-fg-strong shadow-[inset_0_-2px_0_var(--term-accent)]' : 'text-term-muted'}`}>企画案・相談</button>
      </nav>
      {/* 左ペイン: 保存銘柄 ＆ アナリスト極秘メモ（インプット資材） */}
      <SynthesisEntitiesSidebar
        mobileHidden={mobilePane !== 'SOURCES'}
        savedEntities={savedEntities}
        bookmarkedIds={bookmarkedIds}
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

  // 上部に「自分のアイデアを調べる」を置き、その下に従来の事例・メモ／企画案・相談の作業面をそのまま並べる。
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-term-bg">
      <IdeaResearchPanel formatMoney={formatMoney} />
      {workspace}
    </div>
  );
};
