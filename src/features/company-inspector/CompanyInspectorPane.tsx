'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { buildInspectorModel } from './model/inspector-model';
import type { CompanyInspectorPaneProps, InspectorMainTab, InspectorViewMode } from './model/section-props';
import { AnalystNotes } from './ui/AnalystNotes';
import { CashAnatomySection } from './ui/CashAnatomySection';
import { CompanyHeader } from './ui/CompanyHeader';
import { EstimatedCashSummary } from './ui/EstimatedCashSummary';
import { EvidenceDeckSection } from './ui/EvidenceDeckSection';
import { EvidenceStream } from './ui/EvidenceStream';
import { ExecutiveIntuitiveSummary } from './ui/ExecutiveIntuitiveSummary';
import { LootBlueprintSection } from './ui/LootBlueprintSection';
import { RelatedResearch } from './ui/RelatedResearch';
import { SourcesSection } from './ui/SourcesSection';
import { ValueChainDisruptionSection } from './ui/ValueChainDisruptionSection';

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
  noteSaveStatus,
  onSaveAnalystNote,
  onOpenSynthesisWithEntity,
  onApproveEntity,
  isPro = false,
  isBookmarked = false,
  onToggleBookmark,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mainTab, setMainTab] = useState<InspectorMainTab>('LEDGER');
  const [viewMode, setViewMode] = useState<InspectorViewMode>('ALL');
  const searchParams = useSearchParams();
  const targetSection = searchParams?.get('section');

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollTop > 12);
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setIsScrolled(false);
    }
  }, [entity?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!targetSection) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`section-${targetSection}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(timer);
  }, [entity?.id, targetSection]);

  if (!entity) return null;

  const model = buildInspectorModel(entity, currency);
  const sectionProps = {
    entity,
    currency,
    onClose,
    onPrevEntity,
    onNextEntity,
    onOpenPro,
    onSelectTopic,
    onOpenAnomaly,
    activeTags,
    onToggleTag,
    analystNote,
    noteSaveStatus,
    onSaveAnalystNote,
    onOpenSynthesisWithEntity,
    onApproveEntity,
    isPro,
    isScrolled,
    scrollToSection,
    viewMode,
    setViewMode,
    mainTab,
    setMainTab,
    isBookmarked,
    onToggleBookmark,
    ...model
  };

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
        aria-label="企業事例インスペクターを閉じる"
      />

      <aside
        aria-label={`${entity.name}の企業事例インスペクター`}
        className="fixed inset-x-0 bottom-0 z-40 flex h-full max-h-[92vh] w-full shrink-0 flex-col overflow-hidden border-t border-white/[0.08] bg-[#090d13] shadow-2xl md:static md:max-h-none md:min-w-[480px] md:flex-1 md:shrink md:border-l md:border-t-0"
      >
        <CompanyHeader {...sectionProps} />

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative flex-1 space-y-5 overflow-y-auto bg-[#0b0f15] p-4 text-xs font-sans scroll-smooth [scrollbar-color:rgba(255,255,255,0.2)_rgba(11,15,21,1)] [scrollbar-gutter:stable] [scrollbar-width:thin] sm:p-5"
        >
          {mainTab === 'LEDGER' ? (
            <>
              <ExecutiveIntuitiveSummary {...sectionProps} />
              <EvidenceDeckSection {...sectionProps} />

              {entity.pnl.financialStatus === 'ESTIMATED' ? (
                <EstimatedCashSummary {...sectionProps} />
              ) : (
                <CashAnatomySection {...sectionProps} />
              )}

              <ValueChainDisruptionSection {...sectionProps} />
              <LootBlueprintSection {...sectionProps} />
            </>
          ) : (
            <>
              <SourcesSection {...sectionProps} />
              <EvidenceStream {...sectionProps} />
              <AnalystNotes {...sectionProps} />
              <RelatedResearch {...sectionProps} />
            </>
          )}
        </div>
      </aside>
    </>
  );
};
