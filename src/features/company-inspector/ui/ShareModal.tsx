'use client';

import React, { useState, useEffect } from 'react';
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
  const [copiedSection, setCopiedSection] = useState<'FULL' | 'TEXT' | 'URL' | 'INSTA' | 'TIKTOK' | null>(null);
  const [partnerId, setPartnerId] = useState<string>('p_guest');

  // パートナーIDの取得・生成
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem('makemoney_partner_id');
        if (stored) {
          setPartnerId(stored);
        } else {
          const generated = 'p_' + Math.random().toString(36).substring(2, 9);
          localStorage.setItem('makemoney_partner_id', generated);
          setPartnerId(generated);
        }
      } catch {
        // ignore local storage restriction
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isOpen) return null;

  // 招待コード（ref）を最初から自動結合したURLを生成
  const getReferralUrl = () => {
    if (typeof window === 'undefined') return `https://make-money.app/?company=${encodeURIComponent(entity.id)}&ref=${partnerId}`;
    const base = window.location.origin;
    return `${base}/?company=${encodeURIComponent(entity.id)}&ref=${partnerId}`;
  };

  const shareUrl = getReferralUrl();
  const shareText = getCleanShareText(entity, formatMoney, isFinancialUnavailable);
  
  // SNS投稿用の完全体メッセージ（文面 ＋ 紹介URL）
  const fullMessageWithUrl = `${shareText}\n\n👇 詳細な裏帳簿・P&Lはこちら\n${shareUrl}`;

  // 1. X (Twitter) - 文面と紹介URLを最初から完全合体して下書き直通
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

  // 4. Instagram - 文面＋紹介URLを一括コピーして開く
  const handleShareInstagram = async () => {
    await safeCopyText(fullMessageWithUrl);
    setCopiedSection('INSTA');
    setTimeout(() => setCopiedSection(null), 2500);
    window.open('https://www.instagram.com', '_blank', 'noopener,noreferrer');
  };

  // 5. TikTok - 文面＋紹介URLを一括コピーして開く
  const handleShareTikTok = async () => {
    await safeCopyText(fullMessageWithUrl);
    setCopiedSection('TIKTOK');
    setTimeout(() => setCopiedSection(null), 2500);
    window.open('https://www.tiktok.com', '_blank', 'noopener,noreferrer');
  };

  // 6. 文面のみコピー
  const handleCopyTextOnly = async () => {
    await safeCopyText(shareText);
    setCopiedSection('TEXT');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // 7. 最重要：文面と紹介URLを一括コピー（そのままSNSやブログに貼れる）
  const handleCopyFullBundle = async () => {
    await safeCopyText(fullMessageWithUrl);
    setCopiedSection('FULL');
    setTimeout(() => setCopiedSection(null), 2500);
  };

  // 8. URLのみコピー
  const handleCopyUrlOnly = async () => {
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
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 font-sans">
              <span>裏帳簿を共有</span>
              <span className="text-[10px] font-mono font-normal text-zinc-400">({entity.name})</span>
            </h3>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
              ● 30%還元URL自動適用中
            </span>
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
                onClick={handleCopyTextOnly}
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
                    <span>文面のみコピー</span>
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
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">共有先を選択（文面＋紹介URL直通）</span>
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
                  <div className="text-[10px] text-zinc-400 truncate">文面＋URLでポスト直通</div>
                </div>
              </button>

              {/* Threads */}
              <button
                type="button"
                onClick={handleShareThreads}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] text-white transition-all cursor-pointer text-left group"
              >
                <div className="w-6 h-6 rounded bg-black flex items-center justify-center font-bold text-[11px] border border-white/[0.2] shrink-0">
                  @
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">Threads</div>
                  <div className="text-[10px] text-zinc-400 truncate">文面＋URLでスレッド直通</div>
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
                  <div className="text-[10px] text-zinc-400 truncate">文面＋URLコピー＆開く</div>
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
                  <div className="text-[10px] text-zinc-400 truncate">文面＋URLコピー＆開く</div>
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
                  <div className="text-[10px] text-zinc-400 truncate">文面＋紹介URLプラグインを開く</div>
                </div>
              </button>
            </div>
          </div>

          {/* 区切り線 */}
          <div className="h-[1px] bg-white/[0.08]" />

          {/* 最下部アクション */}
          <div className="space-y-2">
            {/* メインアクション：文面と紹介URLを一括コピー */}
            <button
              type="button"
              onClick={handleCopyFullBundle}
              className={`w-full py-2.5 px-4 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border shadow-lg ${
                copiedSection === 'FULL'
                  ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-white text-black hover:bg-zinc-200 border-white'
              }`}
            >
              {copiedSection === 'FULL' ? (
                <>
                  <Check className="w-4 h-4 text-black" />
                  <span>文面と紹介URLを一括コピーしました！</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-black" />
                  <span>文面と紹介URLを一括コピー（SNSに貼るだけ）</span>
                </>
              )}
            </button>

            {/* サブアクション：紹介URLのみコピー */}
            <button
              type="button"
              onClick={handleCopyUrlOnly}
              className={`w-full py-2 px-3 rounded-lg font-mono text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                copiedSection === 'URL'
                  ? 'bg-white/[0.1] text-emerald-300 border-emerald-500/40'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.07] border-white/[0.08]'
              }`}
            >
              {copiedSection === 'URL' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>紹介URLをコピーしました</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  <span>紹介URLのみコピー</span>
                </>
              )}
            </button>
          </div>

          {/* パートナー紹介還元プログラム詳細案内 */}
          <div className="pt-1 pb-0.5 text-center">
            <a
              href={`/partners?company=${encodeURIComponent(entity.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-amber-300 transition-colors group cursor-pointer py-1 px-2 rounded hover:bg-white/[0.04]"
            >
              <span>🎁 毎月30%の継続パートナー報酬について詳しく見る</span>
              <span className="group-hover:translate-x-0.5 transition-transform text-amber-400">➔</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
