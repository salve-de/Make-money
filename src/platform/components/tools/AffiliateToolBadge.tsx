'use client';

import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { findToolAffiliate } from '../../config/toolAffiliates';

interface AffiliateToolBadgeProps {
  toolName: string;
  className?: string;
  showPrBadge?: boolean;
}

/**
 * ツール名をクリック可能なアフィリエイト/公式リンクとしてレンダリングするコンポーネント
 * 景表法（ステマ規制）に準拠し、提携リンクにはPRバッジおよびrel="sponsored"を付与
 */
export const AffiliateToolBadge: React.FC<AffiliateToolBadgeProps> = ({
  toolName,
  className = '',
  showPrBadge = true,
}) => {
  const affiliate = findToolAffiliate(toolName);

  if (!affiliate) {
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] border border-white/[0.06] text-zinc-300 ${className}`}>
        {toolName}
      </span>
    );
  }

  return (
    <a
      href={affiliate.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      title={`${affiliate.name}: ${affiliate.description || '公式サイトへ'}（提携リンク）`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-300 hover:text-emerald-200 transition-colors group cursor-pointer ${className}`}
    >
      <span>{toolName}</span>
      <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100 transition-opacity" />
      {showPrBadge && (
        <span className="text-[8px] font-sans font-bold px-1 py-0.1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          PR
        </span>
      )}
    </a>
  );
};

interface AffiliateToolListProps {
  tools: string[];
  className?: string;
  showDisclosure?: boolean;
}

/**
 * ツールリスト一括表示 ＆ 景品表示法ステマ規制注記コンポーネント
 */
export const AffiliateToolList: React.FC<AffiliateToolListProps> = ({
  tools,
  className = '',
  showDisclosure = true,
}) => {
  if (!tools || tools.length === 0) return null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex flex-wrap gap-1.5 items-center">
        {tools.map((tool, idx) => (
          <AffiliateToolBadge key={idx} toolName={tool} />
        ))}
      </div>
      {showDisclosure && (
        <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500 pt-0.5">
          <ShieldCheck className="w-2.5 h-2.5 text-zinc-400" />
          <span>※掲載ツールリンクにはアフィリエイト広告（提携リンク）が含まれており、紹介料が発生する場合があります。</span>
        </div>
      )}
    </div>
  );
};
