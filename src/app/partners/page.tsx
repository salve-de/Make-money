'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Handshake,
  Check,
  Copy,
  TrendingUp,
  Clock,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
  BarChart3
} from 'lucide-react';

export default function PartnersPage() {
  const [copied, setCopied] = useState(false);
  const [partnerId, setPartnerId] = useState('usr_partner');
  const [referralCount, setReferralCount] = useState(25);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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
        // ignore local storage error
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://makemoney-app.pages.dev';
  const referralUrl = `${baseUrl}/?ref=${partnerId}`;

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = referralUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const monthlyUnitReward = 1500;
  const estimatedMonthly = referralCount * monthlyUnitReward;
  const estimatedAnnual = estimatedMonthly * 12;

  const faqs = [
    {
      q: 'パートナープログラムには誰でも参加できますか？',
      a: 'はい、MAKEMONEYのアカウントをお持ちの方であれば、個人・法人を問わずどなたでもすぐにご参加いただけます。事前の審査や登録料は一切不要です。'
    },
    {
      q: '報酬の計算方法と還元率はどのようになっていますか？',
      a: 'あなたの紹介リンク経由で有料プランに登録されたユーザーの月額利用料に対し、継続して毎月30%のパートナー報酬をお支払いします。単発ではなく、対象ユーザーが購読を継続している限り毎月発生します。'
    },
    {
      q: 'Cookie（紹介判定）の有効期間はどのくらいですか？',
      a: '紹介リンクをクリックしてから30日間有効です。リンクをクリックした直後に登録しなくても、30日以内に有料登録が行われれば成果としてカウントされます。'
    },
    {
      q: '報酬の支払い時期と受け取り方法は？',
      a: '月末締め、翌月末日のお支払いです。報酬合計額が5,000円を超えた時点で、ご指定の銀行口座またはStripe経由で送金されます。'
    },
    {
      q: 'どのような媒体で紹介・発信できますか？',
      a: 'X（Twitter）、Threads、YouTube、ブログ、メールマガジン、知人・コミュニティへの共有など、公序良俗に反しない限り自由にご活用いただけます。'
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090E] text-zinc-100 font-sans selection:bg-amber-500/20 selection:text-amber-300">
      <header className="border-b border-white/[0.08] bg-[#07090E]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-white hover:opacity-80 transition-opacity">
            <span className="w-6 h-6 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-black text-xs text-amber-400">
              M
            </span>
            <span className="font-bold tracking-tight text-sm">MAKEMONEY</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-400">PARTNERS</span>
          </Link>

          <Link
            href="/"
            className="text-xs font-mono text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <span>ターミナルへ戻る</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-14">
        <section className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MAKEMONEY 公式パートナープログラム</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            記事を紹介して、<br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
              毎月30%の継続パートナー報酬
            </span>
            を受け取る
          </h1>

          <p className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            MAKEMONEYの分析レポートや企業裏帳簿をあなたのSNSやブログでご紹介ください。
            あなたのリンク経由で登録されたユーザーが有料プランを継続する限り、毎月報酬をお支払いします。
          </p>
        </section>

        <section className="rounded-xl border border-amber-500/30 bg-gradient-to-b from-[#101522] to-[#0A0D15] p-5 sm:p-7 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Handshake className="w-4 h-4 text-amber-400" />
                <span>あなた専用の紹介リンク</span>
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                MAKEMONEY全体のすべての企業分析・裏帳簿に有効な公式紹介URLです。
              </p>
            </div>
            <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded shrink-0">
              ● 即時利用可能（審査不要）
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralUrl}
                className="flex-1 bg-black/50 border border-white/[0.12] rounded-lg px-3.5 py-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500/50"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-4 py-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md ${
                  copied
                    ? 'bg-emerald-500 text-black border border-emerald-400'
                    : 'bg-amber-400 hover:bg-amber-300 text-black border border-amber-300'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>コピー完了</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>リンクをコピー</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              ※ このリンクを踏んだ読者には30日間の追跡Cookieが付与され、期間内の登録が自動集計されます。
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0A0D14] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">30% 継続レベニューシェア</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              初回のみの単発報酬ではありません。紹介したユーザーが利用を継続している限り、毎月継続して売上の30%が還元されます。
            </p>
          </div>

          <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0A0D14] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">30日間のCookie有効期間</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              リンクを踏んだ訪問者がその場で課金しなくても安心。30日以内に再訪して有料登録した場合でも、確実にあなたの紹介として記録されます。
            </p>
          </div>

          <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0A0D14] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">透明な成果集計</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              クリック数、有料転換数、確定報酬額はリアルタイムでシステム集計。月末締めの翌月払いで確実にお振込みいたします。
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-[#090C12] p-5 sm:p-7 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              月額報酬シミュレーター
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-zinc-300 font-mono">紹介有料会員数（継続中）:</span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={referralCount}
                  onChange={(e) => setReferralCount(Number(e.target.value))}
                  className="w-48 sm:w-64 accent-amber-400 cursor-pointer"
                />
                <span className="text-base font-bold font-mono text-white min-w-[3rem] text-right">
                  {referralCount} 名
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-white/[0.03] p-4 rounded-lg border border-white/[0.06] text-center">
                <div className="text-[11px] font-mono text-zinc-400">毎月の想定報酬（月額）</div>
                <div className="text-lg sm:text-2xl font-black font-mono text-amber-300 mt-1">
                  ¥{estimatedMonthly.toLocaleString()}
                </div>
              </div>
              <div className="bg-white/[0.03] p-4 rounded-lg border border-white/[0.06] text-center">
                <div className="text-[11px] font-mono text-zinc-400">年間想定報酬（年換算）</div>
                <div className="text-lg sm:text-2xl font-black font-mono text-emerald-400 mt-1">
                  ¥{estimatedAnnual.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 text-center font-mono">
              ※ 月額5,000円プラン（還元率30% = 1名あたり月1,500円）で試算。解約されない限り毎月継続して発生します。
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-center">
            ご参加の流れ（最短1分）
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-amber-400">STEP 01</div>
              <div className="text-xs font-bold text-white">専用リンクをコピー</div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                本ページまたは各企業の共有モーダルから、あなた専用の紹介リンクを取得します。
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-amber-400">STEP 02</div>
              <div className="text-xs font-bold text-white">SNSやブログで紹介</div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                X、Threads、note、ニュースレターなどで、興味深い企業の裏帳簿や分析を共有します。
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-amber-400">STEP 03</div>
              <div className="text-xs font-bold text-white">毎月継続して報酬受取</div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                紹介経由で登録されたユーザーが継続する限り、毎月自動的にパートナー報酬が発生します。
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <HelpCircle className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              よくある質問
            </h2>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-zinc-200 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-zinc-400 leading-relaxed border-t border-white/[0.04] pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <footer className="pt-8 border-t border-white/[0.08] text-center space-y-3 pb-8">
          <div className="flex items-center justify-center gap-4 text-xs font-mono text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">ホーム</Link>
            <span>•</span>
            <Link href="/" className="hover:text-white transition-colors">利用規約</Link>
            <span>•</span>
            <Link href="/" className="hover:text-white transition-colors">プライバシーポリシー</Link>
          </div>
          <p className="text-[11px] text-zinc-400 font-mono">
            © 2026 MAKEMONEY. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
