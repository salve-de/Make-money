'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, Copy, ArrowLeft } from 'lucide-react';

export default function PartnersPage() {
  const [copied, setCopied] = useState(false);
  const [partnerId, setPartnerId] = useState('usr_partner');

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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const keyBenefits = [
    {
      stat: '30%',
      label: 'MONTHLY REVENUE SHARE',
      title: '毎月継続レベニューシェア',
      desc: '初月限りの単発ではありません。紹介経由で登録した有料会員が継続する限り、毎月利用料の30%が自動還元されます。'
    },
    {
      stat: '30 DAYS',
      label: 'COOKIE TRACKING WINDOW',
      title: '30日間のCookie有効期間',
      desc: '初回到問時に即課金されなくても安心。30日以内に再訪して有料登録した場合、漏れなくあなたの成果として集計されます。'
    },
    {
      stat: 'NEXT MONTH',
      label: 'AUTOMATIC SETTLEMENT',
      title: '月末締め・翌月末日払い',
      desc: '月末締め集計で確定し、翌月末日にご指定の国内銀行口座またはStripe経由で送金されます（最低¥5,000〜）。'
    }
  ];

  const specs = [
    { label: '報酬体系', value: '月額継続レベニューシェア（有料購読が続く限り毎月発生）' },
    { label: '還元率', value: '有料プラン月額利用料の 30%' },
    { label: '判定Cookie', value: '30日間有効（初回訪問から30日以内の登録を追跡）' },
    { label: '成果確定・支払', value: '月末締め / 翌月末日払い' },
    { label: '最低支払額', value: '¥5,000 以上（未達分は翌月以降へ無期限繰り越し）' },
    { label: '受取方法', value: '国内銀行振込 または Stripe送金' },
    { label: '参加審査', value: 'なし（全ユーザーに即時解放）' },
    { label: '対象媒体', value: 'X（Twitter）、Threads、YouTube、ブログ、note、メルマガ、コミュニティ等' }
  ];

  const steps = [
    {
      num: '01',
      title: '専用リンクを取得',
      desc: '本ページの発行リンク、または各企業の共有モーダルから固有の紹介URLを取得します。'
    },
    {
      num: '02',
      title: '分析レポートを共有',
      desc: '興味深い企業の裏帳簿やP&L分析の要点とともに、紹介URLをSNSやメディアへ投稿します。'
    },
    {
      num: '03',
      title: '毎月継続して報酬受取',
      desc: '紹介経由のユーザーが継続する限り、毎月30%が自動集計され、翌月末日に指定口座へ着金します。'
    }
  ];

  const faqs = [
    {
      q: 'パートナープログラムへの参加に審査や費用はありますか？',
      a: '事前の審査や登録費用は一切ありません。MAKEMONEYのアカウントがあれば、今すぐ固有リンクを発行して紹介活動を開始できます。'
    },
    {
      q: '「継続30%」とは具体的にどのような仕組みですか？',
      a: '初月だけでなく、紹介経由で有料登録したユーザーがプランを解約するまで、毎月の月額料金の30%が毎月継続して還元されます。'
    },
    {
      q: 'リンクを踏んだユーザーがその場で登録しなかった場合は？',
      a: '30日間の追跡Cookieが保持されます。初回到問時に登録しなくても、30日以内に再訪して有料登録を完了すれば、あなたの紹介成果として自動計上されます。'
    },
    {
      q: '自己アフィリエイト（自分で自分のリンクを踏んで登録）は可能ですか？',
      a: '自己紹介・自作自演アカウントによる不正な報酬獲得は規約上禁止されており、検知された場合は成果取り消しおよびアカウント停止の対象となります。'
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090E] text-zinc-100 font-sans selection:bg-white/[0.15] selection:text-white pb-20">
      {/* ターミナル風ミニマルヘッダー */}
      <header className="border-b border-white/[0.08] bg-[#07090E]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-black tracking-widest text-white text-sm">MAKEMONEY</span>
            <span className="text-zinc-600">{'//'}</span>
            <span className="text-zinc-400 tracking-wider text-[11px] font-medium">PARTNER_PROTOCOL</span>
          </div>

          <Link
            href="/"
            className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>ターミナルへ戻る</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 space-y-16">
        {/* ヒーローセクション */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Official Revenue Sharing Protocol</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            記事を紹介して、<br />
            毎月30%の継続パートナー報酬を受け取る。
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-2xl">
            MAKEMONEYの企業裏帳簿・財務分析レポートを紹介してください。
            あなたのリンク経由で登録された読者が有料プランを継続する限り、毎月利用料の30%を自動還元します。
          </p>
        </section>

        {/* あなた専用の紹介URL発行パネル（Stripe/Vercel風の重厚なコントロールバー） */}
        <section className="rounded-xl border border-white/[0.12] bg-gradient-to-b from-[#111622] to-[#0A0D14] p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <div className="text-sm font-bold text-white tracking-wide">
                あなた専用の紹介リンク
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                MAKEMONEY全体のすべての企業分析・裏帳簿に有効な公式紹介URLです。
              </div>
            </div>
            <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded shrink-0 font-bold self-start sm:self-auto">
              ● 即時有効（審査不要）
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex-1 bg-black/70 border border-white/[0.15] rounded-lg px-4 py-3 text-xs sm:text-sm font-mono text-zinc-100 overflow-x-auto select-all whitespace-nowrap focus-within:border-emerald-500/50">
                {referralUrl}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`px-6 py-3 rounded-lg font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 border shadow-lg ${
                  copied
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : 'bg-white text-black hover:bg-zinc-200 border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-black" />
                    <span>コピー完了！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-black" />
                    <span>リンクをコピー</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs font-mono text-zinc-500">
              ※ 各企業分析画面の「共有」モーダルからも、この固有コードが付与された「文面＋紹介URL」をワンクリックで一括コピーできます。
            </p>
          </div>
        </section>

        {/* 01 // プログラムの3大特長（分割パネル・グリッド） */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono border-b border-white/[0.08] pb-2 text-zinc-400">
            <span className="font-bold text-white tracking-wider">01 {'//'} プログラムの特長</span>
            <span className="text-[11px] text-zinc-500">KEY BENEFITS</span>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] grid grid-cols-1 sm:grid-cols-3 overflow-hidden shadow-xl">
            {keyBenefits.map((item, idx) => (
              <div key={idx} className="p-6 space-y-3">
                <div className="space-y-1">
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400">
                    {item.stat}
                  </div>
                  <div className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
                    {item.label}
                  </div>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="font-bold text-white text-sm">{item.title}</div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 02 // プログラム仕様（高密度スペックテーブル） */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono border-b border-white/[0.08] pb-2 text-zinc-400">
            <span className="font-bold text-white tracking-wider">02 {'//'} プログラム仕様</span>
            <span className="text-[11px] text-zinc-500">SPECIFICATIONS</span>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] overflow-hidden shadow-xl">
            <table className="w-full text-left font-mono text-xs sm:text-sm">
              <thead className="bg-white/[0.04] border-b border-white/[0.08] text-zinc-400 text-xs">
                <tr>
                  <th className="py-3 px-5 font-bold w-40 sm:w-52">項目</th>
                  <th className="py-3 px-5 font-bold">規定内容</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {specs.map((spec, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-white/[0.015]' : 'bg-transparent'}>
                    <td className="py-3.5 px-5 text-zinc-400 font-medium whitespace-nowrap align-top text-xs">{spec.label}</td>
                    <td className="py-3.5 px-5 text-zinc-100 font-semibold align-top text-xs sm:text-sm">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 03 // 運用の流れ（水平ステップフロー） */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono border-b border-white/[0.08] pb-2 text-zinc-400">
            <span className="font-bold text-white tracking-wider">03 {'//'} 運用の流れ</span>
            <span className="text-[11px] text-zinc-500">WORKFLOW</span>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] grid grid-cols-1 sm:grid-cols-3 overflow-hidden shadow-xl font-mono">
            {steps.map((step) => (
              <div key={step.num} className="p-6 space-y-2">
                <div className="text-xs font-bold text-emerald-400">STEP {step.num}</div>
                <div className="font-bold text-white text-sm">{step.title}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 04 // よくある質問（FAQ） */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono border-b border-white/[0.08] pb-2 text-zinc-400">
            <span className="font-bold text-white tracking-wider">04 {'//'} よくある質問</span>
            <span className="text-[11px] text-zinc-500">FAQ</span>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] divide-y divide-white/[0.06] overflow-hidden shadow-xl font-mono text-xs sm:text-sm">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-5 sm:p-6 space-y-2">
                <div className="text-zinc-100 font-bold flex items-start gap-2.5 text-sm sm:text-base">
                  <span className="text-emerald-400 font-black">Q.</span>
                  <span>{faq.q}</span>
                </div>
                <div className="text-xs sm:text-sm text-zinc-400 leading-relaxed pl-6">
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* フッター */}
        <footer className="pt-10 border-t border-white/[0.08] text-center space-y-3 pb-8 font-mono text-xs text-zinc-500">
          <div className="flex items-center justify-center gap-4">
            <Link href="/" className="hover:text-zinc-300 transition-colors">ターミナル</Link>
            <span>/</span>
            <span>利用規約</span>
            <span>/</span>
            <span>プライバシーポリシー</span>
          </div>
          <div>© 2026 MAKEMONEY. All rights reserved.</div>
        </footer>
      </main>
    </div>
  );
}
