'use client';

import React from 'react';
import { Database, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 text-xs pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* ブランド */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
                <Database className="w-4 h-4 text-slate-950 font-black" />
              </div>
              <span className="text-base font-extrabold tracking-tight">金鉱録. 一次情報金庫</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              煽りや誇大広告を完全排除し、個人の生々しい決算書・ツール・初期集客手順を公開する日本初のオープンインサイトデータベース。
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
              <ShieldCheck className="w-4 h-4" />
              <span>全件財務エビデンス確認ポリシー</span>
            </div>
          </div>

          {/* 業態別インデックス */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">業態カテゴリ</h4>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li className="hover:text-amber-300 transition cursor-pointer">継続課金型ツール（SaaS）</li>
              <li className="hover:text-amber-300 transition cursor-pointer">定期手紙（ニュースレター）</li>
              <li className="hover:text-amber-300 transition cursor-pointer">業務自動化受託（AI受託）</li>
              <li className="hover:text-amber-300 transition cursor-pointer">特化型実業・通販（Sweaty）</li>
              <li className="hover:text-amber-300 transition cursor-pointer">知識・様式販売（Notion等）</li>
              <li className="hover:text-amber-300 transition cursor-pointer">顔出しなし動画広告（TikTok）</li>
            </ul>
          </div>

          {/* 創業者・投資家向け */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">創業者・投資家</h4>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li className="hover:text-amber-300 transition cursor-pointer">公認ビジネス掲載申請（無料 / 特急）</li>
              <li className="hover:text-amber-300 transition cursor-pointer">スモール事業買収・売却相談（M&A）</li>
              <li className="hover:text-amber-300 transition cursor-pointer">法人協賛スポンサーシップのご案内</li>
              <li className="hover:text-amber-300 transition cursor-pointer">PRO特別会員マスターキー</li>
            </ul>
          </div>

          {/* 理念と免責 */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">倫理憲章・免責</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              掲載されている財務数値は創業者本人からのエビデンス提供に基づいて検証していますが、将来の収益を保証するものではありません。投資・事業立ち上げは自己の責任において行ってください。
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © 2026 金鉱録（KIN-KOROKU） - All Rights Reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-300 cursor-pointer">利用規約</span>
            <span className="hover:text-slate-300 cursor-pointer">プライバシーポリシー</span>
            <span className="hover:text-slate-300 cursor-pointer">特定商取引法に基づく表記</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
