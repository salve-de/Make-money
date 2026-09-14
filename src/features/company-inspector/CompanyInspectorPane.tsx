'use client';

import { useSearchParams } from 'next/navigation';
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
import { SourcesSection } from './ui/SourcesSection';
import { ToolsSection } from './ui/ToolsSection';
import { ExecutiveIntuitiveSummary } from './ui/ExecutiveIntuitiveSummary';
import { VisualPipelineSection } from './ui/VisualPipelineSection';
import type { InspectorViewMode } from './model/section-props';

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
}) => {

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [viewMode, setViewMode] = useState<InspectorViewMode>('ALL');
  const searchParams = useSearchParams();
  const targetSection = searchParams?.get('section');

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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (targetSection) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`section-${targetSection}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(timer);
    }
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
    ...model
  };

  // 表示モードに応じたセクション表示判定
  const showEvidence = true; // 儲けのウラ側は全モードで表示
  const showBusiness = viewMode === 'ALL' || viewMode === 'ESSENCE';
  const showFinancial = viewMode === 'ALL' || viewMode === 'FINANCIAL';
  const showTools = viewMode === 'ALL' || viewMode === 'FINANCIAL';
  const showPlaybook = viewMode === 'ALL' || viewMode === 'PLAYBOOK';
  const showStream = viewMode === 'ALL';
  const showSources = true; // 情報源は常に最下部に配置

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

          {/* 1. 【最上段】直感サマリー（表の顔 / 裏の正体 / 儲けのツボ） */}
          <ExecutiveIntuitiveSummary {...sectionProps} />

          {/* 2. 【第2段】お金の配管図（誰の弱み ➔ どう現金を吸い上げるか ➔ 通帳手残り） */}
          <VisualPipelineSection {...sectionProps} />

          {/* 3. 【第3段】全体像・ビジネスの正体 */}
          {showBusiness && <BusinessSections {...sectionProps} />}

          {/* 4. 【第4段】現金のレントゲン（P&L損益計算書・原価構造） */}
          {showFinancial && <FinancialSection {...sectionProps} />}

          {/* 5. 【第5段】動かぬ証拠（儲けのウラ側 4大急所カード） */}
          {showEvidence && <EvidenceDeckSection {...sectionProps} />}

          {/* 6. 使っているツール・インフラ */}
          {showTools && <ToolsSection {...sectionProps} />}

          {/* 7. 実践ステップ（略奪転用） */}
          {showPlaybook && <PlaybookSections {...sectionProps} />}

          {/* 8. 全量調査ログ */}
          {showStream && <EvidenceStream {...sectionProps} />}

          {/* ========================================================= */}
          {/* 【最下部集約: 一次情報源 ＆ エビデンス原本アーカイブ (#14)】 */}
          {/* ========================================================= */}
          {showSources && <SourcesSection {...sectionProps} />}

          <AnalystNotes {...sectionProps} />
        </div>
      </aside>
    </>
  );
};
