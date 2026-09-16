'use client';

import { legacyText } from '../model/legacy-fields';

import React from 'react';
import {
  ReactFlow,
  Background,
  MarkerType,
  Position,
  Handle,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Cpu, Users, Lock, TrendingUp, AlertTriangle } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

interface CustomerPainNodeProps {
  data: {
    isHazardMode?: boolean;
    hasVerifiedEvidence?: boolean;
    targetCustomer: string;
    painRelief: string;
  };
}

// カスタムノード1: 対象市場と顧客ペイン
const CustomerPainNode = ({ data }: CustomerPainNodeProps) => (
  <div className={`rounded-xl p-3.5 border shadow-2xl w-[260px] text-left transition-all ${
    data.isHazardMode
      ? 'bg-[#140A0D]/95 border-red-500/40 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
      : 'bg-[#0E1524]/95 border-amber-500/40 text-zinc-100 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
  }`}>
    <div className="flex items-center justify-between gap-1 mb-1.5">
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
        <Users className="w-3 h-3" />
        {data.hasVerifiedEvidence ? '① 対象市場 ＆ 顧客ペイン' : '① 公開説明・顧客情報（照合待ち）'}
      </span>
      <AlertTriangle className="w-3 h-3 text-amber-400/80" />
    </div>
    <p className="text-zinc-100 text-xs font-bold leading-snug line-clamp-2 mb-2">
      {data.targetCustomer}
    </p>
    <div className="pt-2 border-t border-white/[0.08] text-[10px] text-zinc-300 font-sans leading-relaxed">
      <span className="font-mono text-amber-400/90 font-bold block mb-0.5">{data.hasVerifiedEvidence ? '支払い要因(WTP):' : '支払理由（未確認）:'}</span>
      {data.painRelief}
    </div>
    <Handle type="source" position={Position.Right} className="!opacity-0" />
  </div>
);

interface MoatNodeProps {
  data: {
    isHazardMode?: boolean;
    hasVerifiedEvidence?: boolean;
    architecturePattern: string;
    moat: string;
  };
}

// カスタムノード2: 価格決定力と参入障壁
const MoatNode = ({ data }: MoatNodeProps) => (
  <div className={`rounded-xl p-3.5 border shadow-2xl w-[260px] text-left transition-all ${
    data.isHazardMode
      ? 'bg-[#140A0D]/95 border-red-500/40 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
      : 'bg-[#0A1820]/95 border-cyan-500/40 text-zinc-100 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
  }`}>
    <Handle type="target" position={Position.Left} className="!opacity-0" />
    <div className="flex items-center justify-between gap-1 mb-1.5">
      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
        data.isHazardMode ? 'text-red-400' : 'text-cyan-400'
      }`}>
        <Lock className="w-3 h-3" />
        {data.hasVerifiedEvidence ? '② 価格決定力 ＆ 参入障壁' : '② 提供方式・参入条件（照合待ち）'}
      </span>
      <Cpu className="w-3 h-3 text-cyan-400/80" />
    </div>
    <p className="text-zinc-100 text-xs font-bold leading-snug line-clamp-2 mb-2">
      {data.architecturePattern}
    </p>
    <div className="pt-2 border-t border-white/[0.08] text-[10px] text-zinc-300 font-sans leading-relaxed">
      <span className="font-mono text-cyan-400/90 font-bold block mb-0.5">{data.hasVerifiedEvidence ? '構造的参入障壁:' : '参入障壁（未確認）:'}</span>
      {data.moat}
    </div>
    <Handle type="source" position={Position.Right} className="!opacity-0" />
  </div>
);

interface ProfitNodeProps {
  data: {
    isHazardMode?: boolean;
    hasVerifiedEvidence?: boolean;
    formattedRev: string;
    marginText: string;
    formattedProfit: string;
  };
}

// カスタムノード3: 営業利益とキャッシュ創出能
const ProfitNode = ({ data }: ProfitNodeProps) => (
  <div className={`rounded-xl p-3.5 border shadow-2xl w-[260px] text-left transition-all ${
    data.isHazardMode
      ? 'bg-[#180A0A]/95 border-red-500/50 text-red-100 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
      : 'bg-[#091814]/95 border-emerald-500/50 text-zinc-100 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
  }`}>
    <Handle type="target" position={Position.Left} className="!opacity-0" />
    <div className="flex items-center justify-between gap-1 mb-1.5">
      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
        data.isHazardMode ? 'text-red-400' : 'text-emerald-400'
      }`}>
        <TrendingUp className="w-3 h-3" />
        {data.hasVerifiedEvidence ? '③ 営業利益 ＆ キャッシュ創出能' : '③ 財務観測（未確認）'}
      </span>
    </div>
    <div className="space-y-1 mb-2 font-mono">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] text-zinc-400">月商規模:</span>
        <span className="text-xs font-bold text-zinc-100">{data.formattedRev}</span>
      </div>
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] text-zinc-400">営業利益率:</span>
        <span className={`text-xs font-bold ${data.isHazardMode ? 'text-red-400' : 'text-emerald-400'}`}>
          {data.marginText}
        </span>
      </div>
    </div>
    <div className="pt-2 border-t border-white/[0.08] flex items-baseline justify-between font-mono">
      <span className="text-[10px] text-zinc-400">月間営業利益:</span>
      <span className={`text-sm font-black ${data.isHazardMode ? 'text-red-400' : 'text-emerald-300'}`}>
        {data.formattedProfit}
      </span>
    </div>
  </div>
);

const nodeTypes = {
  customerPain: CustomerPainNode,
  moat: MoatNode,
  profit: ProfitNode
};

export function VisualPipelineSection({
  entity,
  isHazardMode,
  formatMoney
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'formatMoney'>) {
  const revenueKnown = entity.pnl?.isRevenueUnconfirmed !== true;
  const profitKnown = entity.pnl?.isOperatingProfitUnconfirmed !== true;
  const marginKnown = entity.pnl?.isMarginUnconfirmed !== true;
  const hasVerifiedEvidence = entity.evidenceCards?.some((card) => card.evidenceStatus === 'VERIFIED') === true;
  const rev = revenueKnown ? (entity.pnl?.monthlyRevenue || 1) : 1;
  const profit = profitKnown ? (entity.pnl?.operatingProfit ?? 0) : 0;
  const margin = revenueKnown && profitKnown ? Math.round((profit / rev) * 100) : 0;

  const targetCustomer = entity.essence?.targetCustomer || '特定セグメントの顧客層';
  const painRelief = entity.essence?.painRelief || entity.targetPainWallet || '構造的ペイン・代替不能な損失回避';
  const architecturePattern = entity.architecturePattern || '相見積もりを即死させる独自構造';
  const moat = legacyText(entity.strategy, 'moat') || '他社が追随できない構造的参入障壁';

  const nodes: Node[] = [
    {
      id: 'node-1',
      type: 'customerPain',
      position: { x: 30, y: 35 },
      data: { isHazardMode, hasVerifiedEvidence, targetCustomer, painRelief }
    },
    {
      id: 'node-2',
      type: 'moat',
      position: { x: 420, y: 35 },
      data: { isHazardMode, hasVerifiedEvidence, architecturePattern, moat }
    },
    {
      id: 'node-3',
      type: 'profit',
      position: { x: 810, y: 35 },
      data: {
        isHazardMode,
        hasVerifiedEvidence,
        formattedRev: revenueKnown ? formatMoney(rev) : '未確認',
        marginText: marginKnown && revenueKnown && profitKnown
          ? (isHazardMode ? `${margin}% (赤字)` : `+${margin}%`)
          : '未確認',
        formattedProfit: profitKnown ? formatMoney(profit) : '未確認'
      }
    }
  ];

  const edges: Edge[] = [
    {
      id: 'edge-1-2',
      source: 'node-1',
      target: 'node-2',
      animated: true,
      label: hasVerifiedEvidence ? '価値提供 (WTP)' : '関係未確認',
      labelStyle: { fill: '#38bdf8', fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold' },
      labelBgStyle: { fill: '#0a0d14', fillOpacity: 0.95, stroke: 'rgba(56, 189, 248, 0.4)' },
      labelBgPadding: [6, 4] as [number, number],
      style: { stroke: isHazardMode ? '#ef4444' : '#06b6d4', strokeWidth: 2.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: isHazardMode ? '#ef4444' : '#06b6d4' }
    },
    {
      id: 'edge-2-3',
      source: 'node-2',
      target: 'node-3',
      animated: true,
      label: hasVerifiedEvidence ? '超過利潤創出' : '関係未確認',
      labelStyle: { fill: '#34d399', fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold' },
      labelBgStyle: { fill: '#0a0d14', fillOpacity: 0.95, stroke: 'rgba(52, 211, 153, 0.4)' },
      labelBgPadding: [6, 4] as [number, number],
      style: { stroke: isHazardMode ? '#dc2626' : '#10b981', strokeWidth: 2.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: isHazardMode ? '#dc2626' : '#10b981' }
    }
  ];

  return (
    <div id="section-pipeline" className={`rounded-xl border p-4 sm:p-6 shadow-2xl relative overflow-hidden transition-all ${
      isHazardMode
        ? 'bg-[#0A0D14] border-red-500/25 shadow-[0_0_40px_rgba(239,68,68,0.08)]'
        : 'bg-[#0A0D14] border-white/[0.10] shadow-[0_0_40px_rgba(0,0,0,0.6)]'
    }`}>
      {/* 背景アンビエント光 */}
      <div className={`absolute top-0 right-0 w-80 h-48 rounded-full blur-[90px] pointer-events-none ${
        isHazardMode ? 'bg-red-500/8' : 'bg-cyan-500/8'
      }`} />

      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2.5">
          <Cpu className={`w-4 h-4 shrink-0 ${isHazardMode ? 'text-red-400' : 'text-cyan-400'}`} />
          <h3 className={`text-xs font-mono font-bold tracking-wider uppercase ${
            isHazardMode ? 'text-red-300' : 'text-zinc-100'
          }`}>
            {isHazardMode ? '資本出血配管図（照合待ち）' : hasVerifiedEvidence ? 'キャッシュ創出配管図：照合済み観測' : '提供・財務観測配管図（照合待ち）'}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
          AUTONOMOUS FLOW
        </span>
      </div>

      {/* 閲覧専用・自動フィット配管キャンバス */}
      <div className="w-full h-[240px] bg-[#07090F]/90 rounded-xl border border-white/[0.08] relative overflow-hidden shadow-inner pointer-events-none">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
          className="select-none"
        >
          <Background color="rgba(255, 255, 255, 0.04)" gap={16} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
