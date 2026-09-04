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

interface PostMortemSectionProps {
  onOpenArchive?: () => void;
}

export const PostMortemSection: React.FC<PostMortemSectionProps> = ({ onOpenArchive }) => {
  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-3">
        <div 
          onClick={onOpenArchive}
          className={`flex items-center gap-2 ${onOpenArchive ? 'cursor-pointer group' : ''}`}
        >
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
            THE POST-MORTEM ARCHIVE
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white group-hover:text-zinc-300 transition-colors flex items-center gap-1.5">
            <span>失敗の墓場：これに手を出した奴らは全員散った「参入禁止地雷市場」</span>
            {onOpenArchive && <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300">→</span>}
          </h2>
        </div>
        {onOpenArchive ? (
          <button
            onClick={onOpenArchive}
            className="text-xs text-zinc-400 hover:text-white font-mono flex items-center gap-1 self-start sm:self-auto"
          >
            <span>地雷市場アーカイブ全件 →</span>
          </button>
        ) : (
          <span className="text-xs text-zinc-500 font-mono">
            ※ 表面的な儲け話に騙されないための防衛データ
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {TRAP_REPORTS.map((t) => (
          <div
            key={t.id}
            className="p-4 sm:p-5 rounded-lg bg-[#0E1015] border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-zinc-300 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                  {t.badge}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">{t.lossMetric}</span>
              </div>

              <h3 className="font-bold text-sm text-white leading-snug">
                {t.trapName}
              </h3>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-md bg-zinc-900/60 border border-zinc-800/60 space-y-1">
                  <span className="text-zinc-400 font-mono text-[10px] font-bold block">
                    【表面的な甘い罠】
                  </span>
                  <p className="text-zinc-400 leading-relaxed font-normal">
                    {t.allure}
                  </p>
                </div>

                <div className="p-2.5 rounded-md bg-zinc-900/90 border border-zinc-800/80 space-y-1">
                  <span className="text-zinc-300 font-mono text-[10px] font-bold block">
                    【現実の死因（なぜ即死するのか）】
                  </span>
                  <p className="text-zinc-300 leading-relaxed font-normal">
                    {t.fatalCause}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-zinc-800/60 text-xs">
              <span className="text-zinc-400 font-mono text-[10px] font-bold block">
                【生き残りの反転戦略】
              </span>
              <p className="text-zinc-200 text-[11px] leading-relaxed mt-0.5 font-normal">
                {t.counterStrategy}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
