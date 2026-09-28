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
      <span className={`inline-flex items-center rounded-sm border border-term-line px-1.5 py-0.5 text-xs text-term-fg ${className}`}>
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
      className={`group inline-flex cursor-pointer items-center gap-1 rounded-sm border border-term-line px-1.5 py-0.5 text-xs text-term-select-fg hover:bg-term-head hover:text-term-fg-strong ${className}`}
    >
      <span>{toolName}</span>
      <ExternalLink aria-hidden="true" className="h-3 w-3" />
      {showPrBadge && (
        <span className="text-xs text-term-accent">
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
        <div className="flex items-center gap-1 pt-0.5 text-xs text-term-label">
          <ShieldCheck aria-hidden="true" className="h-3 w-3" />
          <span>※掲載ツールリンクにはアフィリエイト広告（提携リンク）が含まれており、紹介料が発生する場合があります。</span>
        </div>
      )}
    </div>
  );
};
