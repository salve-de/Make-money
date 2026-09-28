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
  'keyence-6861': { bg: '', text: 'text-term-fg', border: 'border-term-line', icon: Cpu },
  'nvidia-nvda': { bg: '', text: 'text-term-positive', border: 'border-term-line', icon: Zap },
  'lasertec-6920': { bg: '', text: 'text-term-fg', border: 'border-term-line', icon: ShieldCheck },
  'stripe-payments': { bg: '', text: 'text-term-fg', border: 'border-term-line', icon: DollarSign },
  'openai-arr': { bg: '', text: 'text-term-fg', border: 'border-term-line', icon: Sparkles },
  'perplexity-ai': { bg: '', text: 'text-term-fg', border: 'border-term-line', icon: Globe },
  'pieter-levels': { bg: '', text: 'text-term-accent', border: 'border-term-accent-line', icon: Terminal },
  'headshotpro-danny': { bg: '', text: 'text-term-fg', border: 'border-term-line', icon: Sparkles },
  'tldr-newsletter': { bg: '', text: 'text-term-danger', border: 'border-term-line', icon: FileText },
  'rundown-ai': { bg: '', text: 'text-term-accent', border: 'border-term-accent-line', icon: Activity },
  'easlo-notion': { bg: 'bg-zinc-900', text: 'text-zinc-300', border: 'border-term-line', icon: Layers },
  'marc-lou': { bg: '', text: 'text-term-accent', border: 'border-term-accent-line', icon: Zap },
  'solo-local-dx': { bg: '', text: 'text-term-positive', border: 'border-term-line', icon: Wrench },
  'bolt-storage': { bg: 'bg-stone-900', text: 'text-stone-300', border: 'border-term-line', icon: Building2 },
  'outbid-lol': { bg: '', text: 'text-term-fg', border: 'border-term-line', icon: TrendingUp },
  'signal-tiktok-shop-faceless': { bg: '', text: 'text-term-danger', border: 'border-term-line', icon: ShoppingBag },
  'signal-grant-ai-agent': { bg: '', text: 'text-term-fg', border: 'border-term-line', icon: Bot },
  'signal-oss-japanese-agent': { bg: '', text: 'text-term-fg', border: 'border-term-line', icon: Globe },
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
    bg: 'bg-term-head',
    text: 'text-zinc-400',
    border: 'border-term-line-soft',
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
