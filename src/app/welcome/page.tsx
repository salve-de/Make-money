'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  ShieldAlert, 
  TrendingUp, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Database,
  Lock
} from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/context/AuthContext';

export default function WelcomePage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#060709] text-zinc-100 font-sans selection:bg-zinc-800 selection:text-zinc-100">
      {/* 1. 最上部コントロールバー */}
      <header className="sticky top-0 z-40 h-12 bg-[#07080B]/90 backdrop-blur-md border-b border-white/[0.06] px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-white hover:text-zinc-300 transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            KIN-ROKOKU
          </Link>
          <span className="text-[10px] font-mono text-zinc-600 hidden sm:inline">
            CAPITAL ARBITRAGE TERMINAL v2.5
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <span className="text-xs font-mono text-zinc-400 truncate max-w-[120px] sm:max-w-none">
              {user.email}
            </span>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs font-mono text-zinc-400 hover:text-white px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              ログインしてみる
            </button>
          )}

          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-zinc-200 text-black font-medium text-xs transition-colors cursor-pointer shadow-sm"
          >
            <span>端末を起動する</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 2. HERO セクション */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 px-4 md:px-8 max-w-5xl mx-auto text-center">
        {/* H1 見出し（主砲のみ） */}
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-medium tracking-tight text-white mb-4 leading-tight">
          誰が、どんな手口でいくら抜いたかを暴く。
        </h1>

        {/* サブリード（1行で道具の正体を定義） */}
        <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto mb-8 font-sans">
          儲かっている会社の「裏帳簿（売上・粗利・手口）」を検索し、そのまま真似るだけの台帳。
        </p>

        {/* 検索バー（端末直結） */}
        <div className="max-w-xl mx-auto mb-6">
          <Link
            href="/?q=Photo+AI"
            className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-lg bg-zinc-900/90 border border-white/[0.12] hover:border-white/[0.25] text-left transition-all shadow-xl group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 pl-2 text-xs sm:text-sm text-zinc-400">
              <span className="text-zinc-500 font-mono">🔍</span>
              <span className="text-zinc-300 truncate">
                例: <span className="text-white font-medium">Photo AI</span>、<span className="text-white font-medium">粗利80%</span>、<span className="text-white font-medium">1人</span> ...
              </span>
            </div>
            <div className="flex items-center gap-1 px-3.5 py-1.5 rounded bg-white text-black font-semibold text-xs group-hover:bg-zinc-200 transition-colors shrink-0">
              <span>検索する</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>

        {/* CTA ボタングループ */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer shadow-md"
          >
            <span>端末を起動する (無料)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {!user && (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white font-medium text-xs transition-colors border border-white/[0.08] cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>ログインしてみる</span>
            </button>
          )}
        </div>

        {/* 端末プレビュー・高精細フレーム */}
        <div className="relative rounded-lg border border-white/[0.08] bg-[#07080B] p-2 shadow-2xl overflow-hidden text-left">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] text-[10px] font-mono text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-700" />
              <div className="w-2 h-2 rounded-full bg-zinc-700" />
              <div className="w-2 h-2 rounded-full bg-zinc-700" />
              <span className="ml-2 text-zinc-400 font-medium">実機プレビュー（損益・手口台帳）</span>
            </div>
            <span className="text-zinc-600">3-PANE FINANCIAL LEDGER</span>
          </div>

          {/* プレビューの中身（高密度ティッカー ＋ サンプル行） */}
          <div className="p-4 bg-[#060709] font-mono text-xs overflow-x-auto">
            <div className="grid grid-cols-6 gap-4 pb-2 border-b border-white/[0.06] text-[10px] text-zinc-500 uppercase tracking-wider">
              <span>企業 / 事業名</span>
              <span className="text-right">推定売上</span>
              <span className="text-right">営業利益率</span>
              <span>組織規模</span>
              <span className="col-span-2">突いた隙間（アービトラージの手口）</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              <div className="grid grid-cols-6 gap-4 py-2.5 items-center">
                <span className="font-semibold text-white">Photo AI</span>
                <span className="text-right text-zinc-300">¥1,800万/月</span>
                <span className="text-right text-emerald-400 font-medium">84.0%</span>
                <span className="text-zinc-500">1人 (SOLO)</span>
                <span className="col-span-2 text-zinc-400 truncate text-[11px]">写真館に行くのが恥ずかしい人間の見栄とコンプレックスの即時換金</span>
              </div>

              <div className="grid grid-cols-6 gap-4 py-2.5 items-center">
                <span className="font-semibold text-white">KEYENCE</span>
                <span className="text-right text-zinc-300">¥800億/月</span>
                <span className="text-right text-emerald-400 font-medium">54.0%</span>
                <span className="text-zinc-500">直販組織</span>
                <span className="col-span-2 text-zinc-400 truncate text-[11px]">ライン停止の巨額損失を握ることで相見積もりを無力化し定価販売</span>
              </div>

              <div className="grid grid-cols-6 gap-4 py-2.5 items-center">
                <span className="font-semibold text-white">Clay×AI Outbound</span>
                <span className="text-right text-zinc-300">¥800万/月</span>
                <span className="text-right text-emerald-400 font-medium">65.0%</span>
                <span className="text-zinc-500">2人 (API自動)</span>
                <span className="col-span-2 text-zinc-400 truncate text-[11px]">営業採用できないVC調達企業のCAC麻痺を成果報酬型で掠め取る</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. コア・インサイト：「儲けの正体は、ただのアービトラージである」 */}
      <section className="border-t border-white/[0.06] bg-[#07080B] py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
            THE ANATOMY OF PROFIT
          </div>
          <h2 className="text-xl md:text-3xl font-medium text-white mb-4 leading-snug">
            儲けている人間は、ただ「隙間」を見つけただけだ。
          </h2>
          <p className="text-xs md:text-sm text-zinc-400 leading-relaxed mb-12">
            朝から晩まで汗水垂らして働く99%の人間が手取り数十万円に甘んじる一方、なぜ1人・週10時間の作業で年商数千万円〜数億円を抜くプレイヤーが存在するのか？<br />
            答えは極めてシンプルである。彼らは「努力」をしたのではない。市場に生じた<strong className="text-zinc-200 font-medium">3つの構造的アービトラージ（価格差・情報の歪み・制度のバグ）</strong>を冷静に突いただけなのだ。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 隙間 1: 情報のアービトラージ */}
            <div className="p-5 rounded bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="w-7 h-7 rounded bg-white/[0.06] flex items-center justify-center text-zinc-300">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                隙間 01 : 【情報の歪み】
              </div>
              <h3 className="text-sm font-medium text-white">
                大手の「コンプラ麻痺」を突く
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                大企業の法務部門が生成AIのリスクを検証するのに1年費やしている間、オープンモデルのAPIを薄く包んだアプリを72時間で公開。比較記事アフィリエイターを30%還元でカルテル化し、市場の現金を独占する。
              </p>
            </div>

            {/* 隙間 2: 価格のアービトラージ */}
            <div className="p-5 rounded bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="w-7 h-7 rounded bg-white/[0.06] flex items-center justify-center text-zinc-300">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                隙間 02 : 【価格の歪み】
              </div>
              <h3 className="text-sm font-medium text-white">
                原価数十円を「虚栄心」に換金する
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                APIの推論原価は1枚あたり数円に過ぎない。しかし「写真館に行くのが恥ずかしい人間の見栄」という感情の急所を突くことで、数千円〜数万円のサブスクとして売り抜け、粗利率84%を叩き出す。
              </p>
            </div>

            {/* 隙間 3: 構造のアービトラージ */}
            <div className="p-5 rounded bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="w-7 h-7 rounded bg-white/[0.06] flex items-center justify-center text-zinc-300">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                隙間 03 : 【構造の歪み】
              </div>
              <h3 className="text-sm font-medium text-white">
                VC調達企業の「コスト麻痺」を突く
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                数億円調達して商談数を増やせと投資家に詰められるSaaS企業に対し、「成果報酬型」でアポ獲得代行を提案。裏側はAPIとスクレイピングによる自動メール工場で回し、利益率65%を抜き去る。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 読者への想起：「じゃあ、自分もこの隙間データを使えばそうなれる」 */}
      <section className="py-16 md:py-24 px-4 md:px-8 max-w-4xl mx-auto">
        <div className="p-6 md:p-10 rounded-lg bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400">
            <span>● 誰でも明日から再現可能な理由</span>
          </div>

          <h2 className="text-xl md:text-3xl font-medium text-white tracking-tight leading-snug">
            ゼロから悩むな。<br />
            先行者が血を流して見つけた「型紙（隙間）」をそのまま使え。
          </h2>

          <p className="text-xs md:text-sm text-zinc-300 leading-relaxed max-w-2xl mx-auto">
            あなたがやるべきことは、新しいアイデアを発明することではありません。<br className="hidden sm:inline" />
            世界中のトッププレイヤーがすでに検証し、現実に現金を吐き出している<strong className="text-white font-medium">「他人の財布のレントゲン写真（損益計算書・ツール構成・集客DM文面）」</strong>をカンニングし、同じ仕組みを自分の得意な分野へスライド適用するだけです。
          </p>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer shadow-md"
            >
              <span>端末を開いて「儲かる型紙」を検索する (無料)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. フッターセクション */}
      <footer className="border-t border-white/[0.06] py-10 px-4 md:px-8 text-center text-zinc-600 font-mono text-[11px]">
        <div className="flex flex-wrap items-center justify-center gap-4 mb-3">
          <Link href="/" className="hover:text-zinc-400 transition-colors">
            TERMINAL
          </Link>
          <span>•</span>
          <button onClick={() => setIsAuthModalOpen(true)} className="hover:text-zinc-400 transition-colors cursor-pointer">
            LOG IN
          </button>
        </div>
        <p>© 2026 KIN-ROKOKU. ALL CAPITAL ARBITRAGE RIGHTS RESERVED.</p>
      </footer>

      {/* 認証モーダル */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode="signin"
      />
    </div>
  );
}
