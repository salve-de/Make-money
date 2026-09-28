'use client';

import { useModalFocus } from '@/platform/hooks/useModalFocus';

import { legacyText } from '../model/legacy-fields';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Link2,
  X
} from 'lucide-react';
import type { FinancialEntity } from '@/shared/terminal';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: FinancialEntity;
  formatMoney: (amount: number) => string;
  isFinancialUnavailable: boolean;
}

export function getCleanShareText(
  entity: FinancialEntity,
  formatMoney: (n: number) => string,
  isFinancialUnavailable: boolean
): string {
  // 正体の文章を抽出（「正体」「【正体】」という単語は含めない）
  const rawText = entity.tagline || entity.essence?.whatItDoes || legacyText(entity, 'executiveSummary') || '';
  let cleaned = rawText
    .replace(/【(.*?正体.*?)】/g, '')
    .replace(/^正体[:：]\s*/g, '')
    .trim();

  // 先頭の社名重複（「キーエンスは、」等）を切除
  const names = [entity.name, entity.legalEntity].filter(Boolean) as string[];
  for (const n of names) {
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp('^' + escaped + '[は|が|の|による]?\\s*[、,]?\\s*', 'u'), '');
  }
  cleaned = cleaned.trim();

  if (cleaned && !cleaned.startsWith('『') && !cleaned.startsWith('「')) {
    cleaned = `『${cleaned}』`;
  }

  const revenueKnown = !isFinancialUnavailable && entity.pnl?.financialStatus !== 'UNAVAILABLE' && !entity.pnl?.isRevenueUnconfirmed;
  const profitKnown = !isFinancialUnavailable && entity.pnl?.financialStatus !== 'UNAVAILABLE' && !entity.pnl?.isOperatingProfitUnconfirmed;
  const marginKnown = !isFinancialUnavailable && entity.pnl?.financialStatus !== 'UNAVAILABLE' && !entity.pnl?.isMarginUnconfirmed && Number.isFinite(entity.pnl?.operatingMargin) && (entity.pnl?.monthlyRevenue ?? 0) > 0;
  const financials = [
    revenueKnown ? `売上（月額換算）${formatMoney(entity.pnl.monthlyRevenue)}` : null,
    profitKnown ? `営業利益（月額換算）${formatMoney(entity.pnl.operatingProfit)}` : null,
    marginKnown ? `利益率 ${entity.pnl.operatingMargin}%` : null,
  ].filter(Boolean);

  return [entity.name, cleaned, financials.join(' / ')].filter(Boolean).join('\n\n');
}

async function safeCopyText(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  entity,
  formatMoney,
  isFinancialUnavailable
}) => {
  const [copiedSection, setCopiedSection] = useState<'FULL' | 'TEXT' | 'URL' | 'INSTA' | 'TIKTOK' | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const { dialogRef, onKeyDown } = useModalFocus(isOpen, onClose);

  if (!isOpen) return null;

  // 台帳側で解釈されるentityパラメーターを使い、未実装の紹介追跡IDは付与しない。
  const getShareUrl = () => {
    if (typeof window === 'undefined') return `https://make-money.app/?entity=${encodeURIComponent(entity.id)}`;
    return `${window.location.origin}/?entity=${encodeURIComponent(entity.id)}`;
  };

  const shareUrl = getShareUrl();
  const shareText = getCleanShareText(entity, formatMoney, isFinancialUnavailable);
  
  // SNS投稿用の文面と事例リンク
  const fullMessageWithUrl = `${shareText}\n\n事例の詳細はこちら\n${shareUrl}`;

  const copyAndReport = async (
    text: string,
    section: NonNullable<typeof copiedSection>,
    resetAfterMs: number
  ) => {
    const success = await safeCopyText(text);
    setCopyFailed(!success);
    setCopiedSection(success ? section : null);
    if (success) setTimeout(() => setCopiedSection(null), resetAfterMs);
    return success;
  };

  // 1. X (Twitter) - 文面と事例リンクを下書きに渡す
  const handleShareX = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  };

  // 2. Threads - 完全体メッセージを直通
  const handleShareThreads = () => {
    const threadsUrl = `https://threads.net/intent/post?text=${encodeURIComponent(fullMessageWithUrl)}`;
    window.open(threadsUrl, '_blank', 'noopener,noreferrer');
  };

  // 3. LINE - 公式シェア直通
  const handleShareLine = () => {
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(lineUrl, '_blank', 'noopener,noreferrer');
  };

  // 4. Instagram - 文面と事例リンクをコピーして開く
  const handleShareInstagram = async () => {
    await copyAndReport(fullMessageWithUrl, 'INSTA', 2500);
    window.open('https://www.instagram.com', '_blank', 'noopener,noreferrer');
  };

  // 5. TikTok - 文面と事例リンクをコピーして開く
  const handleShareTikTok = async () => {
    await copyAndReport(fullMessageWithUrl, 'TIKTOK', 2500);
    window.open('https://www.tiktok.com', '_blank', 'noopener,noreferrer');
  };

  // 6. 文面のみコピー
  const handleCopyTextOnly = async () => {
    await copyAndReport(shareText, 'TEXT', 2000);
  };

  // 7. 文面と事例リンクを一括コピー
  const handleCopyFullBundle = async () => {
    await copyAndReport(fullMessageWithUrl, 'FULL', 2500);
  };

  // 8. URLのみコピー
  const handleCopyUrlOnly = async () => {
    await copyAndReport(shareUrl, 'URL', 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-term-bg/80 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" ref={dialogRef} onKeyDown={onKeyDown}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-sm border border-term-line bg-term-panel text-term-fg-strong" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 border-b border-term-line bg-term-head px-4 py-2">
          <div className="min-w-0"><h2 id="share-title" className="text-sm font-semibold">事例を共有</h2><p className="truncate text-xs text-zinc-400">{entity.name}</p></div>
          <button type="button" onClick={onClose} aria-label="共有を閉じる" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm hover:bg-term-line"><X className="h-4 w-4" /></button>
        </header>
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-2 rounded-sm border border-term-line bg-term-bg/80 p-2">
            <input aria-label="共有リンク" readOnly value={shareUrl} className="min-w-0 flex-1 bg-transparent text-xs text-zinc-300 outline-none" />
            <button type="button" onClick={handleCopyUrlOnly} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-sm border border-term-accent px-3 text-sm text-term-accent hover:bg-term-accent-bg">
              {copiedSection === 'URL' ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}{copiedSection === 'URL' ? 'コピー済み' : 'コピー'}
            </button>
          </div>
          <details className="rounded-sm border border-term-line">
            <summary className="cursor-pointer px-3 py-3 text-sm text-zinc-200">紹介文もコピー</summary>
            <div className="space-y-3 border-t border-term-line p-3">
              <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-zinc-300">{shareText}</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={handleCopyTextOnly} className="min-h-10 rounded-sm border border-term-line px-2 text-xs">{copiedSection === 'TEXT' ? 'コピー済み' : '文面のみ'}</button>
                <button type="button" onClick={handleCopyFullBundle} className="min-h-10 rounded-sm border border-term-line px-2 text-xs">{copiedSection === 'FULL' ? 'コピー済み' : '文面＋リンク'}</button>
              </div>
            </div>
          </details>
          <div className="grid grid-cols-3 gap-2 border-t border-term-line pt-3">
            {[
              {name: 'X', action: handleShareX},
              {name: 'Threads', action: handleShareThreads},
              {name: 'LINE', action: handleShareLine},
              {name: copiedSection === 'INSTA' ? 'コピー済み' : 'Instagram', action: handleShareInstagram},
              {name: copiedSection === 'TIKTOK' ? 'コピー済み' : 'TikTok', action: handleShareTikTok},
            ].map((item, index) => <button key={index} type="button" onClick={item.action} className="min-h-10 rounded-sm border border-term-line px-2 text-xs text-zinc-200 hover:bg-term-head">{item.name}</button>)}
          </div>
          {copyFailed && <p role="status" className="text-xs text-term-accent">コピーできませんでした。共有リンクを選択してコピーしてください。</p>}
        </div>
      </div>
    </div>,
    document.body
  );
};
