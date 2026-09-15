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

  const specs = [
    { label: '報酬体系', value: '月額継続レベニューシェア（解約まで永続発生）' },
    { label: '還元率', value: '有料プラン月額利用料の 30%' },
    { label: '判定Cookie', value: '30日間有効（初回クリックから30日以内の登録を自動紐付け）' },
    { label: '成果確定・支払', value: '月末締め / 翌月末日払い' },
    { label: '最低支払額', value: '¥5,000 以上（未達分は翌月以降へ無期限繰り越し）' },
    { label: '受取方法', value: '国内銀行振込 または Stripe送金' },
    { label: '参加審査', value: 'なし（全登録ユーザーに即時解放）' },
    { label: '対象媒体', value: 'X、Threads、YouTube、ブログ、note、メルマガ、コミュニティ等' }
  ];

  const steps = [
    {
      num: '01',
      title: '固有リンクの取得',
      desc: '本ページの発行リンク、または各企業分析ページの共有モーダルから固有の紹介URLを取得します。'
    },
    {
      num: '02',
      title: '事実の共有・発信',
      desc: '企業の裏帳簿やP&L分析の要点とともに、紹介URLをSNSやメディアへ投稿します。'
    },
    {
      num: '03',
      title: '継続報酬の受取',
      desc: '登録ユーザーが購読を継続する限り、毎月30%が自動集計され、翌月末日に指定口座へ着金します。'
    }
  ];

  const faqs = [
    {
      q: 'パートナープログラムへの参加に審査や費用はありますか？',
      a: '事前の審査や登録費用は一切ありません。MAKEMONEYの利用ユーザーであれば、即座に固有リンクを発行して紹介活動を開始できます。'
    },
    {
      q: '「継続30%」とは具体的にどのような仕組みですか？',
      a: '初月だけでなく、紹介経由で有料登録したユーザーがプランを解約するまで、毎月の月額料金の30%が継続して毎月還元されます。'
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

  const keyBenefits = [
    {
      badge: '30% REVENUE SHARE',
      title: '毎月30%の継続レベニューシェア',
      desc: '初月限りの単発ではありません。紹介経由で有料登録したユーザーが購読を継続している限り、毎月継続して売上の30%が還元されます。'
    },
    {
      badge: '30-DAY COOKIE',
      title: '30日間のCookie追跡期間',
      desc: 'リンクを踏んだ読者がその場で課金しなくても、30日以内に再訪して有料登録を完了すれば、あなたの紹介成果として自動集計されます。'
    },
    {
      badge: 'MONTH-END SETTLEMENT',
      title: '透明な成果集計と翌月末日払い',
      desc: '成果は月末締めで確定し、翌月末日にご指定の国内銀行口座またはStripe経由で確実にお振込みいたします。'
    }
  ];

  return (
    <div className="min-h-screen bg-[#080A0F] text-zinc-100 font-sans selection:bg-white/[0.15] selection:text-white">
      {/* ターミナル風ミニマルヘッダー */}
      <header className="border-b border-white/[0.08] bg-[#080A0F]/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black tracking-widest text-white">MAKEMONEY</span>
            <span className="text-zinc-600">{'//'}</span>
            <span className="text-zinc-400 tracking-wider text-[11px]">PARTNER_PROTOCOL</span>
          </div>

          <Link
            href="/"
            className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>ターミナルへ戻る</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* ヒーロー＆紹介URL発行（高視認性パネル） */}
        <section className="space-y-6 pb-8 border-b border-white/[0.08]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-emerald-400 uppercase">
              <span>●</span>
              <span>Official Revenue Sharing Protocol</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              MAKEMONEY 公式パートナープログラム規程
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl">
              MAKEMONEYの企業裏帳簿・財務分析レポートを紹介し、紹介経由の有料登録者が継続する限り、毎月利用料の30%を継続還元する公式プログラムです。
            </p>
          </div>

          {/* 専用URLバー */}
          <div className="bg-[#0D1117] border border-white/[0.12] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-300 font-bold">あなた専用の紹介URL（全銘柄・全分析に有効）</span>
              <span className="text-emerald-400 text-[10px]">即時有効 / 審査不要</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 bg-black/80 border border-white/[0.10] rounded px-3.5 py-2.5 text-xs font-mono text-zinc-100 overflow-x-auto select-all whitespace-nowrap">
                {referralUrl}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`px-5 py-2.5 rounded font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 border shadow-md ${
                  copied
                    ? 'bg-emerald-500 text-black border-emerald-400'
                    : 'bg-white text-black hover:bg-zinc-200 border-white'
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
                    <span>URLをコピー</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] font-mono text-zinc-500">
              ※ 各企業詳細画面の「共有」モーダルからも、この固有コードが付与された文面＋URLをワンクリックで取得できます。
            </p>
          </div>
        </section>

        {/* 01 // プログラムの特長（視認性の高い3行ブロック） */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono border-b border-white/[0.08] pb-2">
            <span className="font-bold text-white tracking-wider">01 {'//'} プログラムの特長</span>
            <span className="text-[10px] text-zinc-500">KEY BENEFITS</span>
          </div>

          <div className="divide-y divide-white/[0.06] font-mono text-xs">
            {keyBenefits.map((item, idx) => (
              <div key={idx} className="py-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-baseline">
                <div className="sm:col-span-4">
                  <div className="text-[10px] text-emerald-400/80 mb-0.5">{item.badge}</div>
                  <div className="text-zinc-100 font-bold text-sm">{item.title}</div>
                </div>
                <div className="sm:col-span-8 text-xs text-zinc-400 leading-relaxed">
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 02 // プログラム仕様（高密度スペックテーブル） */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono border-b border-white/[0.08] pb-2">
            <span className="font-bold text-white tracking-wider">02 {'//'} プログラム仕様</span>
            <span className="text-[10px] text-zinc-500">SPECIFICATIONS</span>
          </div>

          <div className="border border-white/[0.08] rounded-lg overflow-hidden bg-[#0A0D14]">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-white/[0.04] border-b border-white/[0.08] text-zinc-400 text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-bold w-36 sm:w-44">項目</th>
                  <th className="py-2.5 px-4 font-bold">規定内容</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {specs.map((spec, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-white/[0.015]' : 'bg-transparent'}>
                    <td className="py-3 px-4 text-zinc-400 font-medium whitespace-nowrap align-top">{spec.label}</td>
                    <td className="py-3 px-4 text-zinc-100 font-semibold align-top">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 03 // 運用の流れ（水平ステップフロー） */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono border-b border-white/[0.08] pb-2">
            <span className="font-bold text-white tracking-wider">03 {'//'} 運用の流れ</span>
            <span className="text-[10px] text-zinc-500">WORKFLOW</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            {steps.map((step) => (
              <div key={step.num} className="border-t-2 border-emerald-500/50 pt-3 space-y-1.5">
                <div className="text-[10px] text-emerald-400 font-bold">STEP {step.num}</div>
                <div className="text-zinc-100 font-bold text-xs">{step.title}</div>
                <div className="text-[11px] text-zinc-400 leading-relaxed">{step.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 04 // よくある質問（視認性の高いQ&Aリスト） */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono border-b border-white/[0.08] pb-2">
            <span className="font-bold text-white tracking-wider">04 {'//'} よくある質問</span>
            <span className="text-[10px] text-zinc-500">FAQ</span>
          </div>

          <div className="space-y-5 font-mono text-xs">
            {faqs.map((faq, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="text-zinc-100 font-bold flex items-start gap-2 text-xs sm:text-sm">
                  <span className="text-emerald-400 font-black">Q.</span>
                  <span>{faq.q}</span>
                </div>
                <div className="text-xs text-zinc-400 leading-relaxed pl-5">
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* フッター */}
        <footer className="pt-8 border-t border-white/[0.08] text-center space-y-2 pb-8 font-mono text-[11px] text-zinc-500">
          <div className="flex items-center justify-center gap-3">
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
