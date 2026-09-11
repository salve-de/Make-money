'use client';

import React,{ useEffect,useRef,useState } from 'react';

import { buildInspectorModel } from './model/inspector-model';
import type { CompanyInspectorPaneProps } from './model/section-props';
import { AnalystNotes } from './ui/AnalystNotes';
import { BusinessSections } from './ui/BusinessSections';
import { CompanyHeader } from './ui/CompanyHeader';
import { EvidenceDeckSection } from './ui/EvidenceDeckSection';
import { EvidenceStream } from './ui/EvidenceStream';
import { FinancialSection } from './ui/FinancialSection';
import { PlaybookSections } from './ui/PlaybookSections';
import { RelatedResearch } from './ui/RelatedResearch';
import { ToolsSection } from './ui/ToolsSection';
export const CompanyInspectorPane: React.FC<CompanyInspectorPaneProps> = ({
  entity,
  onClose,
  currency,
  onPrevEntity,
  onNextEntity,
  onOpenPro,
  onSelectTopic,
  onOpenAnomaly,

  activeTags = [],
  onToggleTag,
  analystNote = '',
  onSaveAnalystNote,
  onOpenSynthesisWithEntity,
  isPro = false,
}) => {

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // セクション直通スクロールジャンプ
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // スクロール追従（固定ヘッダーの立体シャドウ強調）
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollTop > 12);
    }
  };

  // 銘柄切り替え時にスクロールを先頭へリセット
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      // Synchronize the header with the DOM scroll position reset above.
      setIsScrolled(false);
    }
  }, [entity?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === 'j' || e.key === 'J') && onNextEntity) onNextEntity();
      if ((e.key === 'k' || e.key === 'K') && onPrevEntity) onPrevEntity();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNextEntity, onPrevEntity]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const targetSection = params.get('section');
    if (targetSection === 'financial') {
      const timer = setTimeout(() => {
        const el = document.getElementById('section-financial');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [entity?.id]);

  if (!entity) return null;

  const model = buildInspectorModel(entity, currency);
  const sectionProps = { entity, currency, onClose, onPrevEntity, onNextEntity, onOpenPro, onSelectTopic, onOpenAnomaly, activeTags, onToggleTag, analystNote, onSaveAnalystNote, onOpenSynthesisWithEntity, isPro, isScrolled, scrollToSection, ...model };

  return (
    <>
      {/* スマホ時バックドロップ */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
      />

      <aside className="fixed md:static inset-x-0 bottom-0 max-h-[92vh] md:max-h-none h-full w-full md:flex-1 md:min-w-[480px] bg-[#040507] border-t md:border-t-0 md:border-l border-white/[0.08] z-40 flex flex-col shrink-0 md:shrink select-none overflow-hidden shadow-2xl">

        {/* ========================================================= */}
        {/* 【上部固定計器盤（PINNED EXECUTIVE HUD）: 冷徹モノトーン ＆ 高密度金融端末】 */}
        {/* ========================================================= */}
        <CompanyHeader {...sectionProps} />

        {/* ========================================================= */}
        {/* 【コンテンツゾーン: スクロールトレイ ＆ 金融監査ストリーム】 */}
        {/* ========================================================= */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-8 text-xs font-sans bg-[#080B10] relative scroll-smooth [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_rgba(8,11,16,1)]"
        >
          {/* 上端潜り込みグラデーションシャドウ */}
          <div className="sticky top-0 -mt-4 -mx-4 h-4 bg-gradient-to-b from-[#080B10] via-[#080B10]/90 to-transparent pointer-events-none z-10" />

        <RelatedResearch {...sectionProps} />
        <EvidenceDeckSection {...sectionProps} />
        <BusinessSections {...sectionProps} />
        <FinancialSection {...sectionProps} />
        <ToolsSection {...sectionProps} />
        <PlaybookSections {...sectionProps} />
        <EvidenceStream {...sectionProps} />
        <AnalystNotes {...sectionProps} />
        </div>
      </aside>
    </>
  );
};
