'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export const WeeklyNewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSample, setShowSample] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('有効なメールアドレスを入力してください');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'web_portal' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '購読処理に失敗しました');
      }

      setSubscribed(true);
      setShowSample(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : '通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="p-6 sm:p-8 rounded bg-[#0D1117] text-white border border-white/[0.08] space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-emerald-950/70 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-800/60">
              WEEKLY DISPATCH
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              毎週月曜 朝8:00 定期配信（完全無料）
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            週刊事業財務インサイト速報
          </h2>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            世界中で「先週もっとも高収益を達成したスモールビジネス」と「日本未上陸の構造的機会」を、公的決算書・決済実査データに基づいて1通だけお届けします。推測や煽りを排除した一次情報速報です。
          </p>

          <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-500 pt-1 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>購読者数 1,420名（起業家・投資家）</span>
            </span>
            <span>•</span>
            <span>常時解約可能</span>
          </div>
        </div>

        {/* 購読フォーム */}
        <div className="lg:w-96 shrink-0">
          {!subscribed ? (
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="space-y-1.5">
                <div className="flex rounded overflow-hidden border border-white/[0.1] bg-[#161B22] focus-within:border-emerald-400 transition-colors">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden font-mono"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-black shrink-0 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? '登録中...' : '無料で購読'}
                  </button>
                </div>
                {errorMsg && (
                  <p className="text-[11px] text-rose-400 font-sans">{errorMsg}</p>
                )}
              </div>
            </form>
          ) : (
            <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 space-y-2 font-sans text-xs">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>購読登録が完了しました</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                毎週月曜朝8時に最新の事業財務インサイト速報が届きます。下部に最新号のサンプルレポートを開封しました。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 最新号サンプル速報のプレビューアコーディオン */}
      <div className="border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => setShowSample(!showSample)}
          className="flex items-center justify-between w-full text-left text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">SAMPLE:</span>
            <span>【直近速報サンプル】米29歳開発者が48時間で2,000万円の売上を達成した入札型サービスの収益解剖</span>
          </span>
          <span className="text-slate-500 text-[11px] flex items-center gap-1">
            {showSample ? (
              <>
                <ChevronUp size={13} />
                <span>レポートを閉じる</span>
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                <span>サンプルを開封して読む</span>
              </>
            )}
          </span>
        </button>

        {showSample && (
          <div className="mt-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3.5 text-xs font-sans text-slate-300 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                ISSUE #48 / 配信実例（抜粋）
              </span>
              <span className="text-[10px] font-mono text-slate-500">公的照合済</span>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-white">
                「ProductHuntの自作自演に激怒した男が作った、金で順位を買うオークションサイト」
              </h4>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                ドイツの29歳ソフトウェア開発者ジョナサン・ヴィルケ氏は、無料プロダクト投票サイトの不正票に嫌気が差し、1.8ドルのドメインを取得。「一番金を払った奴を1位にする」という露骨なオークションサイト（outbid.lol）を3時間で実装。Xに1行動画を投稿したところ、起業家同士の虚栄心と負けず嫌いが着火し、開始48時間で入札額が2,000万円（利益率97%）を突破した。
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[9px]">初週着金総額</span>
                <span className="text-white font-black">¥20,000,000</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[9px]">初期開発原価</span>
                <span className="text-emerald-400 font-black">¥280 (ドメイン代のみ)</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[9px]">捉えた中核ニーズ</span>
                <span className="text-amber-400 font-sans font-bold">事業者の認知・比較優位性の証明</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between">
              <span className="font-mono text-slate-500">WEEKLY MONDAY 08:00 JST</span>
              <span className="font-mono text-slate-500">NO SPAM GUARANTEE</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
