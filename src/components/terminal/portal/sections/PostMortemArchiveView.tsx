'use client';

import React from 'react';

interface PostMortemArchiveViewProps {
  onBackToPortal: () => void;
  onNavigateToSimulator: () => void;
}

export const PostMortemArchiveView: React.FC<PostMortemArchiveViewProps> = ({
  onBackToPortal,
  onNavigateToSimulator,
}) => {
  const traps = [
    {
      id: 'trap-ai-prompt',
      trapName: 'AI無断生成画像・プロンプト直売モデル',
      badge: '即死確率 95%',
      lossMetric: '平均赤字額: 30万〜100万円（スクール代・ツール代が全損）',
      allure: '「Midjourneyで美女を生成してBOOTHやNoteで売れば、完全不労で月100万円」という甘い幻想。',
      fatalCause: '参入障壁が完全にゼロなため、3日後に何千人もの模倣者が同じ画像を無料配布して価格崩壊。さらにプラットフォーム側が「AI生成物の販売禁止」へ規約改定を一斉に行い、アカウント即凍結・売上ゼロへ転落。',
      counterStrategy: '「画像そのもの」ではなく、「企業の業務ワークフロー（例: 採用サイトの宣材自動化）」としてB2Bパッケージ化して売る。',
      anatomy: {
        mechanism: 'デジタルデータのコピー容易性と参入コストゼロが生み出す価格競争の地獄。誰でもできる作業は、誰でもやるため限界利益はゼロに収束する。',
        salvationPoint: 'ツールオペレーターではなく、「クライアントの工数削減請負人」として契約すること。',
      },
    },
    {
      id: 'trap-sedori',
      trapName: 'Amazon・楽天せどり・無在庫中国輸入転売',
      badge: '破産確率 80%',
      lossMetric: '平均負債額: 200万〜1,000万円（売れない在庫の山とクレカ借金）',
      allure: '「スマホ1台、店舗を回ってバーコードをスキャンするだけで月商1,000万円」という売上自慢。',
      fatalCause: '利益率がわずか5〜8%しかないため、月商1,000万でも利益は数十万円。そこに仕入れのクレカ引き落としと売上入金サイクルのズレ（黒字倒産）が発生。さらに知的財産権の申し立てで売上金が半年間凍結され資金ショート。',
      counterStrategy: '他人の商品を右から左へ流す転売は即刻やめ、粗利80%以上の自社デジタル権利（ソフトウェア・テンプレ）に移行せよ。',
      anatomy: {
        mechanism: '運転資金（Working Capital）の罠。売上が増えれば増えるほど仕入れ立替金が膨張し、1回のミス（アカウント停止・返品）で即座に連鎖倒産する。',
        salvationPoint: '「在庫を持つ物販」から「在庫ゼロのデジタル権利・仲介」へ事業モデルをピボットすること。',
      },
    },
    {
      id: 'trap-blind-saas',
      trapName: '集客動線なき「一人開発・無差別マイクロSaaS」',
      badge: '孤独死確率 90%',
      lossMetric: '投下時間損失: 500時間以上（時給換算で200万円以上の機会損失）',
      allure: '「良いプロダクトを作れば、海外のアーリーアダプターが自然と課金してくれる」というエンジニアの傲慢。',
      fatalCause: '6ヶ月かけて完璧なコードと美麗なUIを構築したものの、公開当日のアクセス数はわずか「3PV」。見込み客リストもSNSフォロワーもゼロの状態で立ち上げたため、毎月Supabaseとサーバー代だけが引き落とされる。',
      counterStrategy: '1行もコードを書く前に、LPを作って事前予約（Pre-order）やメール登録を最低100件集めてから開発に着手せよ。',
      anatomy: {
        mechanism: 'プロダクト・アウトの死。市場に需要のないものを作っても誰も買わない。「集客チャネル」を先に確保してから「製品」を作るのが鉄則。',
        salvationPoint: 'Build in Public（開発過程の全公開）または既存の顧客コミュニティへの入り込み。',
      },
    },
  ];

  return (
    <div className="flex-1 bg-[#090A0D] overflow-y-auto font-sans text-zinc-100">
      {/* ヘッダー */}
      <div className="border-b border-zinc-800/80 bg-[#0D0E12] px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <button
              onClick={onBackToPortal}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>←</span>
              <span>ポータル・トップに戻る</span>
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300 font-medium">参入禁止地雷市場アーカイブ</span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              POST-MORTEM DOSSIERS
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              失敗の墓場：これに手を出した奴らは全員散った「参入禁止地雷市場」
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed font-normal">
              世の中の「月収100万円」「スマホ1台で不労所得」という甘言の裏に潜む、構造的な敗北メカニズムを徹底解剖。
              他人の破滅と赤字データから学び、無駄な資金と時間の消耗を完全防御。
            </p>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {traps.map((t) => (
          <div
            key={t.id}
            className="p-6 sm:p-7 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-800/80 pb-4">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {t.badge}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  {t.trapName}
                </h2>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {t.lossMetric}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-md bg-zinc-900/60 border border-zinc-800/60 space-y-1.5">
                <span className="text-[10px] font-mono text-zinc-400 font-bold block">
                  【表面的な甘い幻想（初心者が釣られる誘い文句）】
                </span>
                <p className="text-zinc-300 leading-relaxed font-normal">
                  {t.allure}
                </p>
              </div>

              <div className="p-4 rounded-md bg-zinc-900/90 border border-zinc-800/80 space-y-1.5">
                <span className="text-[10px] font-mono text-zinc-300 font-bold block">
                  【現実の死因（なぜ100%即死するのか）】
                </span>
                <p className="text-zinc-200 leading-relaxed font-normal">
                  {t.fatalCause}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-md bg-[#12151D] border border-zinc-800/80 space-y-2 text-xs">
              <span className="text-[10px] font-mono text-zinc-400 font-bold block">
                【病理の解剖：なぜこのビジネスモデルは成立しないのか】
              </span>
              <p className="text-zinc-300 leading-relaxed font-normal">
                {t.anatomy.mechanism}
              </p>
            </div>

            <div className="pt-3 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                  【生き残りの反転戦略（プロはどう回避するか）】
                </span>
                <p className="text-zinc-200 font-normal">
                  {t.counterStrategy}
                </p>
              </div>

              <button
                onClick={onNavigateToSimulator}
                className="px-3.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium font-mono shrink-0 transition-colors"
              >
                勝率診断で代替案を探す →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
