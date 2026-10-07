'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { UI, uiFormat } from '@/shared/ui-strings';
import { buildInspectorModel } from './model/inspector-model';
import type { CompanyInspectorPaneProps, InspectorMainTab, InspectorViewMode } from './model/section-props';
import { AnalystNotes } from './ui/AnalystNotes';
import { CompanyHeader } from './ui/CompanyHeader';
import { EntityMediaGallery } from './ui/EntityMediaGallery';
import { ReaderLedger } from './ui/ReaderDetail';
import { VerifiedRevenueSection } from './ui/VerifiedRevenueSection';

export const CompanyInspectorPane: React.FC<CompanyInspectorPaneProps> = ({
  entity,
  onClose,
  currency,
  onPrevEntity,
  onNextEntity,
  onOpenPro,
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
  positionLabel,
  detailState,
  onRetryDetail,
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
    positionLabel,
    ...model
  };

  return (
    <aside
      aria-label={uiFormat(UI.INSPECTOR_ARIA, entity.name)}
      className={`fixed inset-0 z-40 h-full w-full shrink-0 flex-col overflow-hidden bg-term-panel lg:static lg:inset-auto lg:z-auto lg:min-w-0 lg:flex-1 lg:border-l lg:border-term-line ${mobileOpen ? 'flex' : 'hidden lg:flex'}`}
    >
      <CompanyHeader {...sectionProps} />

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto bg-term-bg pb-[env(safe-area-inset-bottom)] font-sans text-[13px] scroll-smooth [scrollbar-gutter:stable] [scrollbar-width:thin]"
      >
        {/* entity.reader の事実・数値・出典と、推測の印つきの推論、運営者が決済確認した売上を描く */}
        {mainTab === 'LEDGER' ? (
          <>
            <ReaderLedger
              reader={entity.reader}
              detailState={detailState}
              onRetry={onRetryDetail}
              media={<EntityMediaGallery entityId={entity.id} entityName={entity.name} isHazardMode={Boolean(sectionProps.isHazardMode)} />}
            />
            <VerifiedRevenueSection entityId={entity.id} />
          </>
        ) : (
          <AnalystNotes {...sectionProps} />
        )}
      </div>

    </aside>
  );
};
