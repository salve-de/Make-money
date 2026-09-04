'use client';

import React, { useState } from 'react';
import { CompanyRecord } from '@/types/terminal';

interface BusinessBattleViewProps {
  companies: CompanyRecord[];
  onSelectCompany: (id: string) => void;
  onBackToPortal: () => void;
  onOpenProModal: () => void;
}

interface PresetBattle {
  id: string;
  title: string;
  theme: string;
  companyAId: string;
  companyBId: string;
  keyDisputePoint: string;
}

const PRESET_BATTLES: PresetBattle[] = [
  {
    id: 'battle-ai-photos',
    title: 'AI写真生成の頂上決戦',
    theme: 'アフィリエイト網 vs Build in Public（X実況）の集客直接対決',
    companyAId: 'solo-headshotpro',
    companyBId: 'solo-photoai',
    keyDisputePoint: '同じReplicate等のAI推論APIを使いながら、売上還元アフィリエイト網を敷いたHeadshotProが後発ながら月商4,500万円に到達。一方、Xでの個人開発実況で集客するPhoto AIが月商3,800万円で追随。どちらの堀（Moat）が堅牢か？',
  },
  {
    id: 'battle-monopoly-giants',
    title: '営業利益率モンスター激突',
    theme: '代理店排除の超直販 vs 素材・製造プロセスの完全独占',
    companyAId: 'keyence-6861',
    companyBId: 'shinetsu-4063',
    keyDisputePoint: '人件費を惜しまず直販部隊で利益率54%を叩き出すキーエンスと、半導体シリコンウェハーで世界シェア首位を守る信越化学。資本主義の頂点に君臨する2大巨頭の損益レントゲン比較。',
  },
  {
    id: 'battle-instant-speed',
    title: '初期0円・爆速ソロプレナー対決',
    theme: 'ネタ入札リーダーボード vs Notionテンプレート独占販売',
    companyAId: 'outbid-lol',
    companyBId: 'solo-easlo',
    keyDisputePoint: '3時間の開発で48時間2,000万円を抜いた瞬間爆発型と、Notionテンプレートを1本作って年商1.1億円・純利益95%を維持する安定ストック型。手札ゼロの個人が真似すべきはどちらか？',
  },
];

export const BusinessBattleView: React.FC<BusinessBattleViewProps> = ({
  companies,
  onSelectCompany,
  onBackToPortal,
  onOpenProModal,
}) => {
  const [selectedBattleId, setSelectedBattleId] = useState<string>('battle-ai-photos');
  const activePreset = PRESET_BATTLES.find((b) => b.id === selectedBattleId) || PRESET_BATTLES[0];

  const [companyAId, setCompanyAId] = useState<string>(activePreset.companyAId);
  const [companyBId, setCompanyBId] = useState<string>(activePreset.companyBId);

  const handleSelectPreset = (p: PresetBattle) => {
    setSelectedBattleId(p.id);
    setCompanyAId(p.companyAId);
    setCompanyBId(p.companyBId);
  };

  const compA = companies.find((c) => c.id === companyAId) || companies[0];
  const compB = companies.find((c) => c.id === companyBId) || companies[1];

  const finA = compA.financials[compA.financials.length - 1];
  const finB = compB.financials[compB.financials.length - 1];

  const revA = finA?.revenueJpy || 0;
  const revB = finB?.revenueJpy || 0;

  const marginA = finA?.operatingMarginPercent ? Math.round(finA.operatingMarginPercent) : 80;
  const marginB = finB?.operatingMarginPercent ? Math.round(finB.operatingMarginPercent) : 80;

  const takeHomeA = compA.passbookDetails?.founderTakeHomeJpy || Math.round((finA?.operatingProfitJpy || 0) / 12);
  const takeHomeB = compB.passbookDetails?.founderTakeHomeJpy || Math.round((finB?.operatingProfitJpy || 0) / 12);

  const formatShortAmount = (valJpy: number) => {
    if (valJpy >= 1000000000000) return `¥${(valJpy / 1000000000000).toFixed(1)}兆`;
    if (valJpy >= 100000000) return `¥${Math.round(valJpy / 100000000).toLocaleString()}億円`;
    if (valJpy >= 10000) return `¥${Math.round(valJpy / 10000).toLocaleString()}万円`;
    return `¥${valJpy.toLocaleString()}`;
  };

  return (
    <div className="flex-1 bg-[#090A0D] overflow-y-auto font-sans text-zinc-100 select-none">
      {/* ヘッダー */}
      <div className="border-b border-zinc-800/80 bg-[#0D0E12] px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <button
              onClick={onBackToPortal}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>←</span>
              <span>ポータル・トップに戻る</span>
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300 font-medium">2社レントゲン直接対決</span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              HEAD-TO-HEAD BATTLE
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              2社レントゲン直接対決：どっちが儲かり、どこで差がついたか
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed font-normal">
              1社ずつ見るだけでは分からない「利益率の格差」「集客チャネルの勝敗」「原価の分かれ目」を横並びで直接激突。
              黄金カードを選択するか、自由に対決相手を選んでビジネス構造を丸裸にせよ。
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* 黄金カード選択バー */}
        <div className="space-y-2">
          <span className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider block">
            注目の黄金カード対決プリセット:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PRESET_BATTLES.map((battle) => (
              <div
                key={battle.id}
                onClick={() => handleSelectPreset(battle)}
                className={`p-4 rounded-lg border transition-all cursor-pointer space-y-1.5 ${
                  selectedBattleId === battle.id
                    ? 'bg-[#12151E] border-zinc-500 shadow-md ring-1 ring-zinc-500/50'
                    : 'bg-[#0E1015] border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{battle.title}</span>
                  {selectedBattleId === battle.id && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400">選択中</span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed font-normal">
                  {battle.theme}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 2社選択セレクター */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-[#0E1015] border border-zinc-800">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-zinc-400 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-300" />
              <span>プレイヤー A (左側):</span>
            </label>
            <select
              value={companyAId}
              onChange={(e) => {
                setCompanyAId(e.target.value);
                setSelectedBattleId('');
              }}
              className="w-full h-9 bg-zinc-900 border border-zinc-700 rounded px-3 text-xs text-white font-sans focus:outline-none focus:border-zinc-500"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.japaneseName} ({c.scaleTier === 'SOLO_MICRO' ? '完全1人' : '組織'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-zinc-400 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>プレイヤー B (右側):</span>
            </label>
            <select
              value={companyBId}
              onChange={(e) => {
                setCompanyBId(e.target.value);
                setSelectedBattleId('');
              }}
              className="w-full h-9 bg-zinc-900 border border-zinc-700 rounded px-3 text-xs text-white font-sans focus:outline-none focus:border-zinc-500"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.japaneseName} ({c.scaleTier === 'SOLO_MICRO' ? '完全1人' : '組織'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 対決論点サマリー */}
        {activePreset && selectedBattleId && (
          <div className="p-4 rounded-lg bg-[#11131A] border border-zinc-800 space-y-1.5 text-xs font-sans">
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">
              アナリスト対決論点（勝敗の分かれ目）:
            </span>
            <p className="text-zinc-300 leading-relaxed font-normal">
              {activePreset.keyDisputePoint}
            </p>
          </div>
        )}

        {/* 横並び対決比較テーブル */}
        <div className="p-5 sm:p-6 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-6">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-zinc-800">
            {/* プレイヤーAヘッダー */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                  PLAYER A
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  {compA.teamSize === 1 ? '完全1人' : `${compA.teamSize}名運営`}
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-bold text-white leading-tight">
                {compA.japaneseName}
              </h2>
              <p className="text-xs text-zinc-400 line-clamp-2 font-normal">
                {compA.tagline}
              </p>
              <button
                onClick={() => onSelectCompany(compA.id)}
                className="text-xs font-mono text-zinc-300 hover:text-white underline underline-offset-4"
              >
                詳細台帳を見る →
              </button>
            </div>

            {/* プレイヤーBヘッダー */}
            <div className="space-y-2 border-l border-zinc-800 pl-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                  PLAYER B
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  {compB.teamSize === 1 ? '完全1人' : `${compB.teamSize}名運営`}
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-bold text-white leading-tight">
                {compB.japaneseName}
              </h2>
              <p className="text-xs text-zinc-400 line-clamp-2 font-normal">
                {compB.tagline}
              </p>
              <button
                onClick={() => onSelectCompany(compB.id)}
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
              >
                詳細台帳を見る →
              </button>
            </div>
          </div>

          {/* 項目別比較行 */}
          <div className="space-y-4 text-xs font-mono divide-y divide-zinc-800/60">
            {/* 1. 直近年間売上 */}
            <div className="pt-3 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-zinc-500 block">直近売上高 (年商)</span>
                <span className="text-base sm:text-lg font-bold text-white tabular-nums">
                  {formatShortAmount(revA)}
                </span>
              </div>
              <div className="border-l border-zinc-800 pl-4">
                <span className="text-[10px] text-zinc-500 block">直近売上高 (年商)</span>
                <span className="text-base sm:text-lg font-bold text-emerald-400 tabular-nums">
                  {formatShortAmount(revB)}
                </span>
              </div>
            </div>

            {/* 2. 営業利益率 */}
            <div className="pt-3 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-zinc-500 block">純利益率 (原価・販管費控除後)</span>
                <span className="text-base sm:text-lg font-bold text-white tabular-nums">
                  {marginA}%
                </span>
              </div>
              <div className="border-l border-zinc-800 pl-4">
                <span className="text-[10px] text-zinc-500 block">純利益率 (原価・販管費控除後)</span>
                <span className="text-base sm:text-lg font-bold text-emerald-400 tabular-nums">
                  {marginB}%
                </span>
              </div>
            </div>

            {/* 3. 創業者純手取り額 (月換算) */}
            <div className="pt-3 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-zinc-500 block">創業者純手取り (月次推計)</span>
                <span className="text-base sm:text-lg font-bold text-white tabular-nums">
                  {formatShortAmount(takeHomeA)}
                </span>
              </div>
              <div className="border-l border-zinc-800 pl-4">
                <span className="text-[10px] text-zinc-500 block">創業者純手取り (月次推計)</span>
                <span className="text-base sm:text-lg font-bold text-emerald-400 tabular-nums">
                  {formatShortAmount(takeHomeB)}
                </span>
              </div>
            </div>

            {/* 4. 初期投資額 */}
            <div className="pt-3 grid grid-cols-2 gap-4 font-sans">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 block">初期投下資本</span>
                <span className="text-xs sm:text-sm font-bold text-zinc-200">
                  {compA.initialInvestmentJpy === 0 ? '0円 (元手ゼロ)' : `¥${compA.initialInvestmentJpy.toLocaleString()}円`}
                </span>
              </div>
              <div className="border-l border-zinc-800 pl-4">
                <span className="text-[10px] font-mono text-zinc-500 block">初期投下資本</span>
                <span className="text-xs sm:text-sm font-bold text-zinc-200">
                  {compB.initialInvestmentJpy === 0 ? '0円 (元手ゼロ)' : `¥${compB.initialInvestmentJpy.toLocaleString()}円`}
                </span>
              </div>
            </div>

            {/* 5. 集客突破口（最初の100人） */}
            <div className="pt-3 grid grid-cols-2 gap-4 font-sans">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 block">最初の集客突破口</span>
                <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                  {compA.initialTractionStrategy || compA.first100CustomersStrategy?.exactAction || '直接営業・SNS実況'}
                </p>
              </div>
              <div className="border-l border-zinc-800 pl-4 space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 block">最初の集客突破口</span>
                <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                  {compB.initialTractionStrategy || compB.first100CustomersStrategy?.exactAction || 'アフィリエイト網・直接営業'}
                </p>
              </div>
            </div>

            {/* 6. 参入障壁 (Moat) の正体 */}
            <div className="pt-3 grid grid-cols-2 gap-4 font-sans">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 block">防御壁 (Moat) の正体</span>
                <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                  {compA.coreMoatDescription}
                </p>
              </div>
              <div className="border-l border-zinc-800 pl-4 space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 block">防御壁 (Moat) の正体</span>
                <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                  {compB.coreMoatDescription}
                </p>
              </div>
            </div>

            {/* 7. 使用ツールスタック数 */}
            <div className="pt-3 grid grid-cols-2 gap-4 font-mono">
              <div>
                <span className="text-[10px] text-zinc-500 block">主要稼働ツール数</span>
                <span className="text-xs font-bold text-zinc-300">{compA.tools.length}個のツールで運用</span>
              </div>
              <div className="border-l border-zinc-800 pl-4">
                <span className="text-[10px] text-zinc-500 block">主要稼働ツール数</span>
                <span className="text-xs font-bold text-zinc-300">{compB.tools.length}個のツールで運用</span>
              </div>
            </div>
          </div>

          {/* 対決フッターアクション */}
          <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-zinc-400 font-sans text-center sm:text-left">
              ※ 両社の非公開プロンプト、営業メール文面、生CSV比較はPROプランで全件解放。
            </div>
            <button
              onClick={onOpenProModal}
              className="h-9 px-5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-sm"
            >
              <span>PRO詳細比較レポートを開く</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
