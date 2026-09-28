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
      className={`scroll-mt-4 overflow-hidden rounded-md border bg-[#0e151d] transition-colors ${
        isHazardMode ? 'border-rose-300/30' : 'border-white/[0.16]'
      } ${className}`}
    >
      <div className={`flex min-h-11 flex-wrap items-center justify-between gap-2 border-b px-3 py-2 sm:px-4 ${
        isHazardMode ? 'border-rose-300/20 bg-rose-950/30' : 'border-white/[0.12] bg-[#192632]'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span aria-hidden="true" className={`h-4 w-0.5 shrink-0 ${isHazardMode ? 'bg-rose-300' : 'bg-sky-300'}`} />
          <div className="min-w-0">
            <span aria-hidden="true" className="sr-only">{categoryEn}</span>
            <h3 className="text-sm font-semibold text-zinc-50 sm:text-[15px]">
              {titleJa}
            </h3>
          </div>
        </div>

        {badge && (
          <div className="flex shrink-0 items-center gap-2 text-xs">
            {badge}
          </div>
        )}
      </div>

      {/* セクション本体 */}
      <div className="px-3 sm:px-4">{children}</div>
    </section>
  );
};
