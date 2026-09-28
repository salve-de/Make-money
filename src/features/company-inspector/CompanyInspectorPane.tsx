'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { buildInspectorModel } from './model/inspector-model';
import type { CompanyInspectorPaneProps, InspectorMainTab, InspectorViewMode } from './model/section-props';
import { BusinessAnalysisSections } from './ui/BusinessAnalysisSections';
import { FinancialOperationsSupplement } from './ui/FinancialOperationsSupplement';
import { BusinessVisualSummary } from './ui/BusinessVisualSummary';
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
  mobileOpen = true,
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
        className={mobileOpen ? 'fixed inset-0 z-30 bg-black/60 backdrop-blur-xs xl:hidden' : 'hidden'}
        aria-label="企業事例インスペクターを閉じる"
      />

      <aside
        aria-label={`${entity.name}の企業事例インスペクター`}
        className={`fixed inset-x-0 bottom-0 z-40 h-full max-h-[92dvh] w-full shrink-0 flex-col overflow-hidden border-t border-white/[0.08] bg-[#10161f] shadow-2xl xl:static xl:max-h-none xl:min-w-[520px] xl:flex-1 xl:shrink xl:border-l xl:border-t-0 ${mobileOpen ? 'flex' : 'hidden xl:flex'}`}
      >
        <CompanyHeader {...sectionProps} />

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative flex-1 space-y-5 overflow-y-auto bg-[#0c1016] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 text-sm font-sans scroll-smooth [scrollbar-color:rgba(255,255,255,0.2)_rgba(12,16,22,1)] [scrollbar-gutter:stable] [scrollbar-width:thin] sm:p-5"
        >
          {mainTab === 'LEDGER' ? (
            <>
              <ExecutiveIntuitiveSummary {...sectionProps} />

              {entity.pnl.financialStatus === 'ESTIMATED' ? (
                <EstimatedCashSummary {...sectionProps} />
              ) : (
                <CashAnatomySection {...sectionProps} />
              )}

              <EvidenceDeckSection {...sectionProps} />
              <LootBlueprintSection {...sectionProps} />
              <BusinessAnalysisSections {...sectionProps} />
              <FinancialOperationsSupplement {...sectionProps} />
              <BusinessVisualSummary {...sectionProps} />
              <RelatedResearch {...sectionProps} />
            </>
          ) : (
            <>
              <SourcesSection {...sectionProps} />
              <EvidenceStream {...sectionProps} />
              <AnalystNotes {...sectionProps} />
            </>
          )}
        </div>
      </aside>
    </>
  );
};
