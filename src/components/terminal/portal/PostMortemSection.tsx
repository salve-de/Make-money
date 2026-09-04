'use client';

import React from 'react';

interface TrapReport {
  id: string;
  trapName: string;
  badge: string;
  allure: string;
  fatalCause: string;
  lossMetric: string;
  counterStrategy: string;
}

const TRAP_REPORTS: TrapReport[] = [
  {
    id: 'trap-ai-prompt',
    trapName: 'AI無断生成画像・プロンプト直売モデル',
    badge: '即死確率 95%',
    allure: '「Midjourneyで美女を生成してBOOTHやNoteで売れば、完全不労で月100万円」という甘い幻想。',
    fatalCause: '参入障壁が完全にゼロなため、3日後に何千人もの模倣者が同じ画像を無料配布して価格崩壊。さらにプラットフォーム側が「AI生成物の販売禁止」へ規約改定を一斉に行い、アカウント即凍結・売上ゼロへ転落。',
    lossMetric: '平均赤字額: 30万〜100万円（スクール代・ツール代が全損）',
    counterStrategy: '「画像そのもの」ではなく、「企業の業務ワークフロー（例: 採用サイトの宣材自動化）」としてB2Bパッケージ化して売る。',
  },
  {
    id: 'trap-sedori',
    trapName: 'Amazon・楽天せどり・無在庫中国輸入転売',
    badge: '破産確率 80%',
    allure: '「スマホ1台、店舗を回ってバーコードをスキャンするだけで月商1,000万円」という売上自慢。',
    fatalCause: '利益率がわずか5〜8%しかないため、月商1,000万でも利益は数十万円。そこに仕入れのクレカ引き落としと売上入金サイクルのズレ（黒字倒産）が発生。さらに知的財産権の申し立てで売上金が半年間凍結され資金ショート。',
    lossMetric: '平均負債額: 200万〜1,000万円（売れない在庫の山とクレカ借金）',
    counterStrategy: '他人の商品を右から左へ流す転売は即刻やめ、粗利80%以上の自社デジタル権利（ソフトウェア・テンプレ）に移行せよ。',
  },
  {
    id: 'trap-blind-saas',
    trapName: '集客動線なき「一人開発・無差別マイクロSaaS」',
    badge: '孤独死確率 90%',
    allure: '「良いプロダクトを作れば、海外のアーリーアダプターが自然と課金してくれる」というエンジニアの傲慢。',
    fatalCause: '6ヶ月かけて完璧なコードと美麗なUIを構築したものの、公開当日のアクセス数はわずか「3PV」。見込み客リストもSNSフォロワーもゼロの状態で立ち上げたため、毎月Supabaseとサーバー代だけが引き落とされる。',
    lossMetric: '投下時間損失: 500時間以上（時給換算で200万円以上の機会損失）',
    counterStrategy: '1行もコードを書く前に、LPを作って事前予約（Pre-order）やメール登録を最低100件集めてから開発に着手せよ。',
  },
];

export const PostMortemSection: React.FC = () => {
  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-rose-500/20 pb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            THE POST-MORTEM ARCHIVE
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            失敗の墓場：これに手を出した奴らは全員散った「参入禁止地雷市場」
          </h2>
        </div>
        <span className="text-xs text-rose-400/80 font-mono">
          ※ 表面的な儲け話に騙されないための防衛データ
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TRAP_REPORTS.map((t) => (
          <div
            key={t.id}
            className="p-5 rounded-xl bg-[#140F12] border border-rose-500/20 hover:border-rose-500/40 transition-colors space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                  {t.badge}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">{t.lossMetric}</span>
              </div>

              <h3 className="font-bold text-sm text-white leading-snug">
                {t.trapName}
              </h3>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-amber-400/90 font-mono text-[10px] font-bold block">
                    【表面的な甘い罠】
                  </span>
                  <p className="text-zinc-400 leading-relaxed">
                    {t.allure}
                  </p>
                </div>

                <div className="p-2.5 rounded bg-rose-950/20 border border-rose-500/20 space-y-1">
                  <span className="text-rose-400 font-mono text-[10px] font-bold block">
                    【現実の死因（なぜ即死するのか）】
                  </span>
                  <p className="text-zinc-300 leading-relaxed font-normal">
                    {t.fatalCause}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 text-xs">
              <span className="text-emerald-400 font-mono text-[10px] font-bold block">
                【生き残りの反転戦略】
              </span>
              <p className="text-zinc-300 text-[11px] leading-relaxed mt-0.5 font-sans">
                {t.counterStrategy}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
