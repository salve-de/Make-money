'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Copy } from 'lucide-react';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { MarketTickerStrip } from '@/platform/components/ticker/MarketTickerStrip';
import type { FinancialEntity } from '@/platform/types/terminal';

interface PartnersClientProps {
  entities: FinancialEntity[];
}

export function PartnersClient({ entities }: PartnersClientProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [partnerId, setPartnerId] = useState('usr_partner');
  // The server and first client render must agree. Resolve the actual host after hydration.
  const [baseUrl, setBaseUrl] = useState('https://makemoney-app.pages.dev');

  useEffect(() => {
    const timer = setTimeout(() => {
      setBaseUrl(window.location.origin);
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
      desc: '初回訪問時に即課金されなくても安心。30日以内に再訪して有料登録した場合、漏れなくあなたの成果として集計されます。'
    },
    {
      stat: 'NEXT MONTH',
      label: 'AUTOMATIC SETTLEMENT',
      title: '月末締め・翌月末日払い',
      desc: '月末締め集計で確定し、翌月末日にご指定の国内銀行口座またはStripe経由で送金されます（最低¥5,000〜）。'
    }
  ];

  const specifications = [
    { label: '報酬体系', value: '月額継続レベニューシェア（有料購読が続く限り毎月発生）' },
    { label: '還元率', value: '有料プラン月額利用料の 30%' },
    { label: '判定Cookie', value: '30日間有効（初回訪問から30日以内の登録を追跡）' },
    { label: '成果確定・支払', value: '月末締め ／ 翌月末日払い' },
    { label: '最低支払額', value: '¥5,000 以上（未達分は翌月以降へ無期限繰り越し）' },
    { label: '受取方法', value: '国内銀行振込 または Stripe送金' },
    { label: '参加審査', value: 'なし（全ユーザーに即時解放）' },
    { label: '対象媒体', value: 'X (Twitter)、Threads、YouTube、ブログ、note、メルマガ、コミュニティ等' }
  ];

  const steps = [
    {
      step: '01',
      title: '専用リンクを取得',
      desc: '本ページの専用リンク、または各企業の共有モーダルから固有の紹介URLを取得します。'
    },
    {
      step: '02',
      title: '分析レポートを共有',
      desc: '興味深い企業の裏帳簿やP&L分析の要点とともに、紹介URLをSNSやメディアへ投稿します。'
    },
    {
      step: '03',
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
      a: '30日間の追跡Cookieが保持されます。初回訪問時に登録しなくても、30日以内に再訪して有料登録を完了すれば、あなたの紹介成果として自動計上されます。'
    },
    {
      q: '自己アフィリエイト（自分で自分のリンクを踏んで登録）は可能ですか？',
      a: '自己紹介・自作自演アカウントによる不正な報酬獲得は規約上禁止されており、検知された場合は成果取り消しおよびアカウント停止の対象となります。'
    }
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#07090E] text-zinc-100 overflow-hidden font-sans selection:bg-white/[0.15] selection:text-white">
      {/* 1. 統合グローバルナビゲーションヘッダー */}
      <GlobalHeader currentSection="PARTNERS" />

      {/* 2. リアルタイム市況ティッカーストリップ（全画面完全共通） */}
      <MarketTickerStrip
        entities={entities}
        sourceLabel="パートナー連動"
        onSelectEntity={(id) => {
          router.push(`/?entity=${id}&mode=LEDGER`);
        }}
      />

      {/* 3. メインスクロールエリア */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-10 space-y-16">
        <div className="max-w-5xl mx-auto space-y-16">
          {/* ヒーローセクション */}
          <section className="space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              OFFICIAL REVENUE SHARING PROTOCOL
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              記事を紹介して、<br />毎月30%の継続パートナー報酬を受け取る。
            </h1>
            
            <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
              MAKEMONEYの企業裏帳簿・財務分析レポートを紹介してください。あなたのリンク経由で登録された読者が有料プランを継続する限り、毎月利用料の30%を自動還元します。
            </p>
          </section>

          {/* 専用紹介リンク パネル */}
          <section className="p-6 sm:p-7 rounded-xl border border-white/[0.1] bg-gradient-to-b from-[#111622] to-[#0A0D14] shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-zinc-200 tracking-wider">
                  あなた専用の紹介リンク
                </span>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  MAKEMONEY全体のすべての企業分析・裏帳簿に有効な公式紹介URLです。
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                即時有効（審査不要）
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="flex-1 bg-black/60 border border-white/[0.1] rounded-lg px-4 py-3 font-mono text-xs text-zinc-200 truncate select-all flex items-center shadow-inner">
                {referralUrl}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="px-6 py-3 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 font-mono text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98]"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>コピー完了</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-zinc-800" />
                    <span>リンクをコピー</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 font-mono mt-3">
              ※ 各企業分析画面の「共有」モーダルからも、この固有コードが付与された「文面+紹介URL」をワンクリックで一括コピーできます。
            </p>
          </section>

          {/* 01 // 特長（大文字指標 Bento Grid） */}
          <section className="space-y-4">
            <div className="flex items-center justify-between font-mono text-xs border-b border-white/[0.08] pb-2">
              <span className="font-bold text-white tracking-wider">01 // プログラムの特長</span>
              <span className="text-zinc-500 text-[11px]">KEY BENEFITS</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 rounded-xl border border-white/[0.08] bg-[#0A0D14] divide-y md:divide-y-0 md:divide-x divide-white/[0.08] overflow-hidden">
              {keyBenefits.map((b, idx) => (
                <div key={idx} className="p-6 sm:p-7 flex flex-col justify-between space-y-4 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-400 block mb-1">
                      {b.stat}
                    </span>
                    <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase block mb-3">
                      {b.label}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-100 mb-2">
                      {b.title}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 02 // プログラム仕様（金融端末スペックテーブル） */}
          <section className="space-y-4">
            <div className="flex items-center justify-between font-mono text-xs border-b border-white/[0.08] pb-2">
              <span className="font-bold text-white tracking-wider">02 // プログラム仕様</span>
              <span className="text-zinc-500 text-[11px]">SPECIFICATIONS</span>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] overflow-hidden">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-500 text-[11px]">
                    <th className="py-3 px-5 font-semibold w-1/3">項目</th>
                    <th className="py-3 px-5 font-semibold">規定内容</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {specifications.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-5 text-zinc-400 font-medium">
                        {row.label}
                      </td>
                      <td className="py-3.5 px-5 text-zinc-200 font-bold">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 03 // 運用の流れ（水平ステップパイプライン） */}
          <section className="space-y-4">
            <div className="flex items-center justify-between font-mono text-xs border-b border-white/[0.08] pb-2">
              <span className="font-bold text-white tracking-wider">03 // 運用の流れ</span>
              <span className="text-zinc-500 text-[11px]">WORKFLOW</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 rounded-xl border border-white/[0.08] bg-[#0A0D14] divide-y md:divide-y-0 md:divide-x divide-white/[0.08] overflow-hidden">
              {steps.map((s, idx) => (
                <div key={idx} className="p-6 sm:p-7 space-y-3 hover:bg-white/[0.02] transition-colors">
                  <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider block">
                    STEP {s.step}
                  </span>
                  <h3 className="text-sm font-bold text-zinc-100">
                    {s.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 04 // よくある質問（統合Q&A） */}
          <section className="space-y-4">
            <div className="flex items-center justify-between font-mono text-xs border-b border-white/[0.08] pb-2">
              <span className="font-bold text-white tracking-wider">04 // よくある質問</span>
              <span className="text-zinc-500 text-[11px]">FAQ</span>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] divide-y divide-white/[0.06] overflow-hidden">
              {faqs.map((f, idx) => (
                <div key={idx} className="p-6 sm:p-7 space-y-2.5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-2.5">
                    <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5">Q.</span>
                    <h3 className="text-sm font-bold text-zinc-100">
                      {f.q}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed pl-5">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* フッター */}
          <footer className="pt-12 pb-6 border-t border-white/[0.06] text-center font-mono text-xs text-zinc-600 space-y-2">
            <div className="flex items-center justify-center gap-4 text-[11px]">
              <Link href="/" className="hover:text-zinc-400 transition-colors">ターミナル</Link>
              <span>/</span>
              <Link href="/welcome" className="hover:text-zinc-400 transition-colors">利用案内</Link>
              <span>/</span>
              <Link href="/playbook" className="hover:text-zinc-400 transition-colors">動的攻略本</Link>
            </div>
            <p className="text-[10px] text-zinc-700">© 2026 MAKEMONEY. All rights reserved.</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
