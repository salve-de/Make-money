import React from 'react';

interface InspectorSectionCardProps {
  id: string;
  index: string;
  categoryEn: string;
  titleJa: string;
  badge?: React.ReactNode;
  isHazardMode?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** 詳細の1区画。24pxの見出し行（橙の項目名）＋罫線区切りの本文。枠や角丸は持たない。 */
export const InspectorSectionCard: React.FC<InspectorSectionCardProps> = ({
  id,
  index,
  categoryEn,
  titleJa,
  badge,
  isHazardMode = false,
  children,
  className = '',
}) => {
  return (
    <section
      id={id}
      data-section-index={index}
      data-hazard={isHazardMode ? 'true' : undefined}
      className={`scroll-mt-8 border-b border-term-line ${className}`}
    >
      <div className="term-panel-title sticky top-0 z-10 justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="sr-only">{categoryEn}</span>
          <h3 className="term-panel-name truncate">{titleJa}</h3>
        </div>
        {badge && <div className="flex shrink-0 items-center gap-2 text-xs text-term-muted">{badge}</div>}
      </div>

      <div className="px-2.5 text-[13px] text-term-fg sm:px-3">{children}</div>
    </section>
  );
};
