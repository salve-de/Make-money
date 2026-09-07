'use client';

import React, { useState, useMemo } from 'react';
import { FinancialEntity } from '../../types/terminal';
import { BUSINESS_ARCHETYPES } from '../../data/businessArchetypesData';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Cpu,
  User,
  Zap,
  CreditCard,
  ShieldAlert,
  KeyRound,
  Flame,
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

interface TacticalArchetypesViewProps {
  allEntities: FinancialEntity[];
  onOpenEntityInLedger: (entityId: string) => void;
}

export const TacticalArchetypesView: React.FC<TacticalArchetypesViewProps> = ({
  allEntities,
  onOpenEntityInLedger,
}) => {
  // 開いているセクションのIDセット（初期値は最初の1つを開いておく）
  const [openSectionIds, setOpenSectionIds] = useState<Set<string>>(
    new Set(['arch_solo'])
  );
  const [searchQuery, setSearchQuery] = useState('');

  // セクションの開閉トグル
  const toggleSection = (id: string) => {
    setOpenSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // すべて開く / すべて閉じる
  const toggleAll = () => {
    if (openSectionIds.size === BUSINESS_ARCHETYPES.length) {
      setOpenSectionIds(new Set());
    } else {
      setOpenSectionIds(new Set(BUSINESS_ARCHETYPES.map((a) => a.id)));
    }
  };

  // アイコンのマッピング
  const getIcon = (name: string) => {
    switch (name) {
      case 'User': return <User className="w-4 h-4 text-emerald-400" />;
      case 'Cpu': return <Cpu className="w-4 h-4 text-sky-400" />;
      case 'Zap': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'CreditCard': return <CreditCard className="w-4 h-4 text-purple-400" />;
      case 'ShieldAlert': return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'KeyRound': return <KeyRound className="w-4 h-4 text-emerald-400" />;
      case 'Flame': return <Flame className="w-4 h-4 text-orange-400" />;
      default: return <Layers className="w-4 h-4 text-zinc-400" />;
    }
  };

  // 検索フィルタリング
  const filteredArchetypes = useMemo(() => {
    if (!searchQuery.trim()) return BUSINESS_ARCHETYPES;
    const q = searchQuery.toLowerCase();
    return BUSINESS_ARCHETYPES.map((archetype) => {
      const matchedIdeas = archetype.ideas.filter(
        (idea) =>
          idea.title.toLowerCase().includes(q) ||
          idea.tagline.toLowerCase().includes(q) ||
          idea.pipelineStack.toLowerCase().includes(q) ||
          idea.targetPainWallet.toLowerCase().includes(q)
      );
      if (
        archetype.title.toLowerCase().includes(q) ||
        archetype.description.toLowerCase().includes(q)
      ) {
        return archetype;
      }
      return {
        ...archetype,
        ideas: matchedIdeas,
      };
    }).filter((a) => a.ideas.length > 0);
  }, [searchQuery]);

  // 全体メトリクス
  const totalIdeas = useMemo(() => {
    return BUSINESS_ARCHETYPES.reduce((acc, a) => acc + a.ideas.length, 0);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#060709] text-zinc-100">
      {/* 1. 最上部ヘッダー ＆ インジケーター */}
      <div className="border-b border-white/[0.06] bg-[#07080B] p-6 md:p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <Layers className="w-3 h-3 text-emerald-400" />
                PLAYBOOK ARCHETYPES
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                8 STRATEGIC PLAYBOOKS & EXPANDABLE IDEAS
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
              稼ぎの型 ＆ 具体的ビジネスアイデア展開
            </h1>
            <p className="text-xs text-zinc-400 font-sans max-w-2xl leading-relaxed">
              産業・業界（AIや不動産等）ではなく「どうやって金を抜くか（欲望・戦術スタイル）」から選ぶ攻略カタログ。型を開くと、今夜使える具体的アイデアと泥臭い手口が展開する。
            </p>
          </div>

          {/* クイック統計インジケーター */}
          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
            <div className="text-center px-2">
              <div className="text-[10px] font-mono text-zinc-500">稼ぎの型</div>
              <div className="text-sm font-mono font-bold text-white">8大スタイル</div>
            </div>
            <div className="h-6 w-px bg-white/[0.08]" />
            <div className="text-center px-2">
              <div className="text-[10px] font-mono text-zinc-500">収録アイデア</div>
              <div className="text-sm font-mono font-bold text-emerald-400">{totalIdeas}件</div>
            </div>
            <div className="h-6 w-px bg-white/[0.08]" />
            <div className="text-center px-2">
              <div className="text-[10px] font-mono text-zinc-500">平均手残り純利</div>
              <div className="text-sm font-mono font-bold text-white">74.5%</div>
            </div>
          </div>
        </div>

        {/* コントロールバー（検索 ＆ 全開閉ボタン） */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="アイデア名、ツール、人質にした財布で検索..."
              className="w-full bg-[#08090C] border border-white/[0.08] rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.2] transition-colors"
            />
          </div>

          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white transition-colors border border-white/[0.06]"
          >
            <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
            <span>
              {openSectionIds.size === BUSINESS_ARCHETYPES.length
                ? 'すべて折りたたむ'
                : 'すべて展開する'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. メイン：稼ぎの型アコーディオン展開リスト */}
      <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-4">
        {filteredArchetypes.map((archetype) => {
          const isOpen = openSectionIds.has(archetype.id);

          return (
            <div
              key={archetype.id}
              className="rounded-lg bg-[#08090C] border border-white/[0.08] overflow-hidden transition-all shadow-md"
            >
              {/* 親セクションヘッダー（クリックで開閉） */}
              <div
                onClick={() => toggleSection(archetype.id)}
                className="flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-white/[0.02] transition-colors select-none group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2 rounded-md bg-white/[0.04] border border-white/[0.06] shrink-0">
                    {getIcon(archetype.iconName)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                        {archetype.badge}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        平均手残り: <strong className="text-zinc-300">{archetype.avgNetMargin}%</strong>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        • {archetype.ideas.length} アイデア収載
                      </span>
                    </div>

                    <h2 className="text-sm md:text-base font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                      {archetype.title}
                    </h2>

                    <p className="text-xs text-zinc-400 font-sans line-clamp-1">
                      {archetype.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-[11px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors hidden sm:inline">
                    {isOpen ? '閉じる' : 'アイデアを開く'}
                  </span>
                  <div className="p-1 rounded bg-white/[0.04] text-zinc-400 group-hover:text-white transition-transform">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* 子アイテム：具体的ビジネスアイデア群の展開（Progressive Disclosure） */}
              {isOpen && (
                <div className="border-t border-white/[0.06] bg-[#060709]/80 p-4 md:p-6 space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
                    ACTIONABLE BUSINESS IDEAS IN THIS ARCHETYPE ({archetype.ideas.length})
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {archetype.ideas.map((idea) => {
                      const matchedEntities = allEntities.filter((e) =>
                        idea.targetEntityIds.includes(e.id)
                      );

                      return (
                        <div
                          key={idea.id}
                          className="p-4 md:p-5 rounded-lg bg-[#08090C] border border-white/[0.06] hover:border-white/[0.15] transition-all space-y-3.5 shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            {/* アイデア上部：月商 ＆ 実効手残り */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <h3 className="text-sm font-bold text-white leading-snug">
                                  {idea.title}
                                </h3>
                                <p className="text-xs text-zinc-400 font-sans mt-0.5 leading-relaxed">
                                  {idea.tagline}
                                </p>
                              </div>

                              <div className="text-right shrink-0 font-mono">
                                <div className="text-[10px] text-zinc-500">実効手残り</div>
                                <div className="text-xs font-bold text-emerald-400">
                                  {idea.projectedNetProfit}
                                </div>
                              </div>
                            </div>

                            {/* 人質にした財布 ＆ 現場ツール */}
                            <div className="space-y-2 text-xs pt-1">
                              <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.04] space-y-1">
                                <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400">
                                  <Zap className="w-3 h-3" />
                                  人質にした痛みの財布:
                                </div>
                                <p className="text-zinc-300 font-sans leading-relaxed">
                                  {idea.targetPainWallet}
                                </p>
                              </div>

                              <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.04] space-y-1">
                                <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                                  <Cpu className="w-3 h-3 text-sky-400" />
                                  現場の配管ツール:
                                </div>
                                <p className="text-zinc-200 font-mono text-[11px] truncate">
                                  {idea.pipelineStack}
                                </p>
                              </div>

                              <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.04] space-y-1">
                                <div className="flex items-center gap-1 text-[10px] font-mono text-rose-400">
                                  <ShieldAlert className="w-3 h-3" />
                                  大手の自爆構造（死角）:
                                </div>
                                <p className="text-zinc-400 font-sans leading-relaxed">
                                  {idea.incumbentBlindspot}
                                </p>
                              </div>

                              <div className="p-2.5 rounded bg-emerald-500/[0.02] border border-emerald-500/10 space-y-1">
                                <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  初動突破の事実ログ:
                                </div>
                                <p className="text-zinc-300 font-sans leading-relaxed">
                                  {idea.guerrillaTraction}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 下部：実例企業へのDB直通導線 */}
                          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              <span className="text-[10px] font-mono text-zinc-500 shrink-0">実例:</span>
                              <div className="flex items-center gap-1 truncate">
                                {matchedEntities.map((ent) => (
                                  <button
                                    key={ent.id}
                                    onClick={() => onOpenEntityInLedger(ent.id)}
                                    className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-mono text-zinc-300 hover:text-white border border-white/[0.06] hover:border-emerald-500/40 transition-colors truncate"
                                    title="クリックでDB財務カルテを検証"
                                  >
                                    {ent.name}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {matchedEntities[0] && (
                              <button
                                onClick={() => onOpenEntityInLedger(matchedEntities[0].id)}
                                className="flex items-center gap-1 text-[11px] font-mono text-zinc-300 hover:text-white group shrink-0"
                              >
                                <span>DBで検証</span>
                                <ArrowRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
