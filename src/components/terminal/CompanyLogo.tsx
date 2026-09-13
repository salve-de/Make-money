'use client';

import React from 'react';
import { 
  Zap, 
  Bot, 
  Cpu, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Globe, 
  ShieldCheck, 
  Wrench, 
  Sparkles,
  ShoppingBag,
  FileText,
  Building2,
  Terminal,
  Activity,
  LucideIcon
} from 'lucide-react';

interface CompanyLogoProps {
  id?: string;
  name?: string;
  category?: string;
  company?: { id?: string; name?: string; japaneseName?: string; category?: string };
  size?: 'sm' | 'md' | 'lg';
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; icon: LucideIcon }> = {
  // 代表的企業・モデル（Bloomberg Obsidian 規格のダークバッジ）
  'keyence-6861': { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800/40', icon: Cpu },
  'nvidia-nvda': { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800/40', icon: Zap },
  'lasertec-6920': { bg: 'bg-indigo-950/40', text: 'text-indigo-400', border: 'border-indigo-800/40', icon: ShieldCheck },
  'stripe-payments': { bg: 'bg-violet-950/40', text: 'text-violet-400', border: 'border-violet-800/40', icon: DollarSign },
  'openai-arr': { bg: 'bg-teal-950/40', text: 'text-teal-400', border: 'border-teal-800/40', icon: Sparkles },
  'perplexity-ai': { bg: 'bg-cyan-950/40', text: 'text-cyan-400', border: 'border-cyan-800/40', icon: Globe },
  'pieter-levels': { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-800/40', icon: Terminal },
  'headshotpro-danny': { bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-800/40', icon: Sparkles },
  'tldr-newsletter': { bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-800/40', icon: FileText },
  'rundown-ai': { bg: 'bg-orange-950/40', text: 'text-orange-400', border: 'border-orange-800/40', icon: Activity },
  'easlo-notion': { bg: 'bg-zinc-900', text: 'text-zinc-300', border: 'border-white/[0.1]', icon: Layers },
  'marc-lou': { bg: 'bg-yellow-950/40', text: 'text-yellow-400', border: 'border-yellow-800/40', icon: Zap },
  'solo-local-dx': { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800/40', icon: Wrench },
  'bolt-storage': { bg: 'bg-stone-900', text: 'text-stone-300', border: 'border-white/[0.1]', icon: Building2 },
  'outbid-lol': { bg: 'bg-pink-950/40', text: 'text-pink-400', border: 'border-pink-800/40', icon: TrendingUp },
  'signal-tiktok-shop-faceless': { bg: 'bg-red-950/40', text: 'text-red-400', border: 'border-red-800/40', icon: ShoppingBag },
  'signal-grant-ai-agent': { bg: 'bg-sky-950/40', text: 'text-sky-400', border: 'border-sky-800/40', icon: Bot },
  'signal-oss-japanese-agent': { bg: 'bg-lime-950/40', text: 'text-lime-400', border: 'border-lime-800/40', icon: Globe },
};

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  id = '',
  name = '',
  company,
  size = 'md'
}) => {
  const targetId = id || company?.id || '';
  const targetName = name || company?.japaneseName || company?.name || '';
  const meta = COLOR_MAP[targetId] || {
    bg: 'bg-white/[0.04]',
    text: 'text-zinc-400',
    border: 'border-white/[0.08]',
    icon: Building2
  };

  const Icon = meta.icon;

  const sizeClasses = {
    sm: 'w-7 h-7 rounded text-xs',
    md: 'w-8 h-8 rounded text-sm',
    lg: 'w-10 h-10 rounded text-base'
  }[size];

  const iconSizes = {
    sm: 13,
    md: 16,
    lg: 20
  }[size];

  return (
    <div
      className={`${sizeClasses} ${meta.bg} ${meta.text} ${meta.border} border shrink-0 flex items-center justify-center font-bold font-sans select-none`}
      title={targetName}
    >
      <Icon size={iconSizes} strokeWidth={2} />
    </div>
  );
};
