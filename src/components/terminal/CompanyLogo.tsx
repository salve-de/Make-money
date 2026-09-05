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
  company?: { id?: string; name?: string; japaneseName?: string; category?: string; [key: string]: any };
  size?: 'sm' | 'md' | 'lg';
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; icon: LucideIcon }> = {
  // 代表的企業・モデル
  'keyence-6861': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: Cpu },
  'nvidia-nvda': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: Zap },
  'lasertec-6920': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', icon: ShieldCheck },
  'stripe-payments': { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', icon: DollarSign },
  'openai-arr': { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', icon: Sparkles },
  'perplexity-ai': { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', icon: Globe },
  'pieter-levels': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: Terminal },
  'headshotpro-danny': { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: Sparkles },
  'tldr-newsletter': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', icon: FileText },
  'rundown-ai': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: Activity },
  'easlo-notion': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: Layers },
  'marc-lou': { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-300', icon: Zap },
  'solo-local-dx': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: Wrench },
  'bolt-storage': { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300', icon: Building2 },
  'outbid-lol': { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', icon: TrendingUp },
  'signal-tiktok-shop-faceless': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: ShoppingBag },
  'signal-grant-ai-agent': { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', icon: Bot },
  'signal-oss-japanese-agent': { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-300', icon: Globe },
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
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: Building2
  };

  const Icon = meta.icon;

  const sizeClasses = {
    sm: 'w-7 h-7 rounded-md text-xs',
    md: 'w-9 h-9 rounded-lg text-sm',
    lg: 'w-12 h-12 rounded-xl text-base'
  }[size];

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 24
  }[size];

  return (
    <div
      className={`${sizeClasses} ${meta.bg} ${meta.text} ${meta.border} border shrink-0 flex items-center justify-center font-bold font-sans shadow-2xs select-none`}
      title={name}
    >
      <Icon size={iconSizes} strokeWidth={2.2} />
    </div>
  );
};
