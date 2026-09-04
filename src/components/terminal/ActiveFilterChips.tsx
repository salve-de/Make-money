'use client';

import React from 'react';
import { TerminalFilterState } from '../../types/terminal';
import { DesirePreset } from './DesireFilterBar';

interface ActiveFilterChipsProps {
  filter: TerminalFilterState;
  activePreset: DesirePreset;
  searchQuery: string;
  onClearSearch: () => void;
  onClearPreset: () => void;
  onRemoveFilter: (key: keyof TerminalFilterState) => void;
  onResetAll: () => void;
  filteredCount: number;
  totalCount: number;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filter,
  activePreset,
  searchQuery,
  onClearSearch,
  onClearPreset,
  onRemoveFilter,
  onResetAll,
  filteredCount,
  totalCount
}) => {
  // 適用中のフィルターをバッジリストとして抽出
  const chips: { label: string; onRemove: () => void; category: string }[] = [];

  // 1. 検索語句
  if (searchQuery) {
    chips.push({
      category: '検索',
      label: `"${searchQuery}"`,
      onRemove: onClearSearch
    });
  }

  // 2. クイック欲望プリセット
  if (activePreset !== 'ALL') {
    const presetLabels: Record<DesirePreset, string> = {
      ALL: 'すべて',
      SOLO_MILLION: '個人・一人起業',
      ZERO_INVESTMENT: '初期費用ゼロ',
      AI_SAAS: '知能技術・小型ツール',
      LOCAL_DX: '地方実業・非IT',
      MEDIA_LETTER: '広告費ゼロ・手紙',
      MEGA_MONOPOLY: '巨大独占・高利益',
      FOR_SALE: '事業売却案件'
    };
    chips.push({
      category: 'クイック',
      label: presetLabels[activePreset] || activePreset,
      onRemove: onClearPreset
    });
  }

  // 3. 作業体質
  if (filter.workStyle !== 'ALL') {
    const labels: Record<string, string> = {
      REMOTE_SOLO: '完全1人(在宅)',
      SMALL_TEAM: '2〜5人少数精鋭',
      LOCAL_REAL: '地方実業現場',
      SALES_HIGH: '営業勝負(直販)',
      AUTOMATED_PASSIVE: '不労無人化',
      ENTERPRISE: '大規模組織'
    };
    chips.push({
      category: '体質',
      label: labels[filter.workStyle] || filter.workStyle,
      onRemove: () => onRemoveFilter('workStyle')
    });
  }

  // 4. 目標金額
  if (filter.ambitionScale !== 'ALL') {
    const labels: Record<string, string> = {
      POCKET_10K: '月1万〜10万(小遣い)',
      INDEPENDENT_1M: '月50万〜100万(脱社畜)',
      SOLO_RICH_10M: '月300万〜千万(個人最強)',
      MID_CORP_100M: '年商数十億(中堅ニッチ)',
      WORLD_MEGA: '兆円世界覇権'
    };
    chips.push({
      category: '規模',
      label: labels[filter.ambitionScale] || filter.ambitionScale,
      onRemove: () => onRemoveFilter('ambitionScale')
    });
  }

  // 5. 利益率
  if (filter.margin !== 'ALL') {
    const labels: Record<string, string> = {
      MARGIN_30: '利益率30%以上',
      MARGIN_50: '利益率50%以上',
      MARGIN_80: '利益率80%以上'
    };
    chips.push({
      category: '利益率',
      label: labels[filter.margin] || filter.margin,
      onRemove: () => onRemoveFilter('margin')
    });
  }

  // 6. 初期元手
  if (filter.capital !== 'ALL') {
    const labels: Record<string, string> = {
      ZERO: '0円(借金ゼロ)',
      UNDER_50K: '5万円以下',
      UNDER_500K: '50万円以下',
      OVER_1M: '100万円以上',
      FOR_SALE: '事業買収案件'
    };
    chips.push({
      category: '元手',
      label: labels[filter.capital] || filter.capital,
      onRemove: () => onRemoveFilter('capital')
    });
  }

  // 7. 業態
  if (filter.businessModelCategory !== 'ALL') {
    const labels: Record<string, string> = {
      SAAS: 'SaaS・ツール',
      MEDIA_NEWS: '日刊手紙・メディア',
      DIGITAL_ASSET: 'テンプレート・教材',
      AGENCY_B2B: '受託・営業代行',
      LOCAL_DX: '地方実業・清掃・倉庫',
      COMMERCE: '物販・実演自動化',
      DEEPTECH_MFG: '半導体・精密機器'
    };
    chips.push({
      category: '業態',
      label: labels[filter.businessModelCategory] || filter.businessModelCategory,
      onRemove: () => onRemoveFilter('businessModelCategory')
    });
  }

  // 8. 堀
  if (filter.moat !== 'ALL') {
    const labels: Record<string, string> = {
      PROCESS_POWER: '組織プロセス',
      NETWORK_EFFECTS: 'ネットワーク効果',
      COUNTER_POSITIONING: 'カウンターポジショニング',
      SWITCHING_COSTS: '乗換コスト',
      BRANDING: 'ブランド力',
      CORNERED_RESOURCE: '独占資源',
      SCALE_ECONOMIES: '規模の経済'
    };
    chips.push({
      category: '防壁',
      label: labels[filter.moat] || filter.moat,
      onRemove: () => onRemoveFilter('moat')
    });
  }

  // 9. 集客導線
  if (filter.acquisitionChannel !== 'ALL') {
    const labels: Record<string, string> = {
      X_TWITTER: 'SNS・開発公開',
      DIRECT_OUTREACH: '直販・コールド手紙',
      SEO_ORGANIC: 'SEO・自然検索',
      AFFILIATE_LOOP: '紹介・即日還元網',
      ZERO_AD_SPEND: '広告費ゼロ'
    };
    chips.push({
      category: '集客',
      label: labels[filter.acquisitionChannel] || filter.acquisitionChannel,
      onRemove: () => onRemoveFilter('acquisitionChannel')
    });
  }

  // フィルターが何もかかっていない時は非表示
  if (chips.length === 0) return null;

  return (
    <div className="bg-[#12141A] border-b border-white/[0.08] px-5 py-2 select-none font-sans text-xs flex items-center justify-between gap-3 overflow-x-auto">
      {/* 左: 適用中の条件バッジ一覧 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase shrink-0 mr-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          適用中の選別条件 ({chips.length}件):
        </span>

        {chips.map((chip, idx) => (
          <div
            key={idx}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-medium animate-in fade-in"
          >
            <span className="text-[10px] font-mono text-zinc-400 uppercase">{chip.category}:</span>
            <span className="text-zinc-100">{chip.label}</span>
            <button
              onClick={chip.onRemove}
              className="text-zinc-400 hover:text-white font-mono text-xs ml-0.5 leading-none"
              title="この条件を解除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* 右: 件数 ＆ 一括解除ボタン */}
      <div className="flex items-center gap-2.5 shrink-0 font-mono text-xs">
        <span className="text-zinc-400">
          該当 <strong className="text-emerald-400 font-bold">{filteredCount}</strong> / {totalCount} 件
        </span>
        <button
          onClick={onResetAll}
          className="text-[11px] text-zinc-400 hover:text-zinc-100 underline transition-colors"
        >
          全条件を解除
        </button>
      </div>
    </div>
  );
};
