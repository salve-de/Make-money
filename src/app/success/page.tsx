'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';

export default function SuccessPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kin_pro_unlocked', 'true');
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#07080B] text-zinc-100 font-sans flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md rounded-lg border border-white/[0.1] bg-[#0C0E14] p-6 text-center shadow-2xl space-y-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>PAYMENT_CONFIRMED: 解錠完了</span>
        </div>
        <h1 className="text-lg font-bold text-white font-sans">
          金鉱録 PRO ライセンスを解放しました
        </h1>
        <p className="text-xs leading-relaxed text-zinc-400 font-sans">
          創刊版（永久アクセス権）の決済が完了しました。全銘柄の「独占と暴利を生む4つの裏構造」および詳細損益計算書のすりガラスが即時解除されています。
        </p>

        <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2">
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center gap-2 rounded bg-white hover:bg-zinc-200 px-5 text-xs font-mono font-bold text-zinc-950 shadow-sm transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-zinc-900" />
            <span>全解錠された台帳へ戻る</span>
            <ArrowRight className="w-3 h-3 text-zinc-900" />
          </Link>
        </div>
      </div>
    </main>
  );
}
