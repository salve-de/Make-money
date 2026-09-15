'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  X
} from 'lucide-react';
import type { FinancialEntity } from '@/types/financial-entity';

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
  const rawText = entity.tagline || entity.essence?.whatItDoes || entity.executiveSummary || '';
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

  const rev = entity.pnl?.monthlyRevenue || 0;
  const profit = entity.pnl?.operatingProfit ?? 0;
  const margin = entity.pnl?.operatingMargin ?? (rev > 0 ? Math.round((profit / rev) * 100) : 0);

  const revText = isFinancialUnavailable ? '未確認' : formatMoney(rev);
  const profitText = isFinancialUnavailable ? '未確認' : formatMoney(profit);

  return `${cleaned}

■ 対象: ${entity.name}${entity.country ? ` (${entity.country})` : ''}
■ 財務: 月商${revText} / 純手残り${profitText}（利益率${margin}%）
#KIN_KOROKU #資本主義の裏帳簿`;
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
  const [copiedSection, setCopiedSection] = useState<'TEXT' | 'URL' | 'INSTA' | 'TIKTOK' | null>(null);

  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://make-money.app';
  const shareText = getCleanShareText(entity, formatMoney, isFinancialUnavailable);
  const fullMessageWithUrl = `${shareText}\n${shareUrl}`;

  // 1. X (Twitter)
  const handleShareX = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  };

  // 2. Threads
  const handleShareThreads = () => {
    const threadsUrl = `https://threads.net/intent/post?text=${encodeURIComponent(fullMessageWithUrl)}`;
    window.open(threadsUrl, '_blank', 'noopener,noreferrer');
  };

  // 3. LINE
  const handleShareLine = () => {
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(lineUrl, '_blank', 'noopener,noreferrer');
  };

  // 4. Instagram
  const handleShareInstagram = async () => {
    await safeCopyText(fullMessageWithUrl);
    setCopiedSection('INSTA');
    setTimeout(() => setCopiedSection(null), 2500);
    window.open('https://www.instagram.com', '_blank', 'noopener,noreferrer');
  };

  // 5. TikTok
  const handleShareTikTok = async () => {
    await safeCopyText(fullMessageWithUrl);
    setCopiedSection('TIKTOK');
    setTimeout(() => setCopiedSection(null), 2500);
    window.open('https://www.tiktok.com', '_blank', 'noopener,noreferrer');
  };

  // 6. 文面のみコピー
  const handleCopyText = async () => {
    await safeCopyText(shareText);
    setCopiedSection('TEXT');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // 7. 一番下：URLコピー
  const handleCopyUrl = async () => {
    await safeCopyText(shareUrl);
    setCopiedSection('URL');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#080B10] border border-white/[0.14] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-white relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* モーダルヘッダー */}
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 font-sans">
              <span>裏帳簿を共有</span>
              <span className="text-[10px] font-mono font-normal text-zinc-400">({entity.name})</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="閉じる (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 文面プレビュー（「正体」単語なし） */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>共有テキスト（正体文面）</span>
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer font-bold"
              >
                {copiedSection === 'TEXT' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">文面コピー完了</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>文面をコピー</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-[#040609] border border-white/[0.08] rounded-lg p-2.5 text-[11px] text-zinc-300 font-sans leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap select-all [scrollbar-width:thin]">
              {shareText}
            </div>
          </div>

          {/* SNS共有先グリッド */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">共有先を選択</span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {/* X (Twitter) */}
              <button
                type="button"
                onClick={handleShareX}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] text-white transition-all cursor-pointer text-left group"
              >
                <div className="w-6 h-6 rounded bg-black flex items-center justify-center font-bold text-[13px] border border-white/[0.2] shrink-0">
                  𝕏
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">X (Twitter)</div>
                  <div className="text-[10px] text-zinc-400 truncate">ポスト画面を開く</div>
                </div>
              </button>

              {/* Threads */}
              <button
                type="button"
                onClick={handleShareThreads}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] text-white transition-all cursor-pointer text-left group"
              >
                <div className="w-6 h-6 rounded bg-black flex items-center justify-center font-bold text-[13px] border border-white/[0.2] shrink-0">
                  @
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">Threads</div>
                  <div className="text-[10px] text-zinc-400 truncate">スレッドを投稿</div>
                </div>
              </button>

              {/* Instagram */}
              <button
                type="button"
                onClick={handleShareInstagram}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] text-white transition-all cursor-pointer text-left group"
              >
                <div className="w-6 h-6 rounded bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center font-bold text-[11px] text-white shrink-0">
                  IG
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">
                    {copiedSection === 'INSTA' ? 'コピー完了！' : 'Instagram'}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">文面コピー＆開く</div>
                </div>
              </button>

              {/* TikTok */}
              <button
                type="button"
                onClick={handleShareTikTok}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] text-white transition-all cursor-pointer text-left group"
              >
                <div className="w-6 h-6 rounded bg-black flex items-center justify-center font-bold text-[11px] text-cyan-400 border border-cyan-500/40 shrink-0">
                  TT
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">
                    {copiedSection === 'TIKTOK' ? 'コピー完了！' : 'TikTok'}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">文面コピー＆開く</div>
                </div>
              </button>

              {/* LINE */}
              <button
                type="button"
                onClick={handleShareLine}
                className="col-span-2 flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 text-white transition-all cursor-pointer text-left group"
              >
                <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center font-black text-[10px] text-white shrink-0">
                  LINE
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-emerald-300 truncate">LINE で友だち・グループに送る</div>
                  <div className="text-[10px] text-zinc-400 truncate">公式シェアプラグインを開く</div>
                </div>
              </button>
            </div>
          </div>

          {/* 区切り線 */}
          <div className="h-[1px] bg-white/[0.08]" />

          {/* 最下部：URLをコピー */}
          <div>
            <button
              type="button"
              onClick={handleCopyUrl}
              className={`w-full py-2.5 px-4 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border shadow-md ${
                copiedSection === 'URL'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                  : 'bg-white text-black hover:bg-zinc-200 border-white'
              }`}
            >
              {copiedSection === 'URL' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>URLをコピーしました！</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  <span>URLをコピー</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
