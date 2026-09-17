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
      className={`scroll-mt-4 overflow-hidden rounded-xl border bg-[#0c1017] shadow-sm transition-colors ${
        isHazardMode ? 'border-red-500/25 bg-[#0d090b]' : 'border-white/[0.09]'
      } ${className}`}
    >
      {/* 統一セクションヘッダー */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.015] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* 連番インデックスバッジ */}
          <span
            className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border shrink-0 ${
              isHazardMode
                ? 'bg-red-950/60 text-red-400 border-red-500/30'
                : 'bg-cyan-950/60 text-cyan-400 border-cyan-500/30'
            }`}
          >
            {index}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {categoryEn}
              </span>
            </div>
            <h3 className="text-sm font-bold text-zinc-100 truncate">
              {titleJa}
            </h3>
          </div>
        </div>

        {badge && (
          <div className="flex items-center gap-2 text-xs font-mono shrink-0">
            {badge}
          </div>
        )}
      </div>

      {/* セクション本体 */}
      <div>{children}</div>
    </section>
  );
};
