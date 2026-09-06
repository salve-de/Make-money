'use client';

import React from 'react';

interface SparklineChartProps {
  data?: number[];
  color?: string;
  trend?: string;
  width?: number;
  height?: number;
  growthRate?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data = [10, 15, 18, 22, 28, 35, 45, 60, 78, 95, 110, 130],
  color = '#10B981', // Emerald
  width = 72,
  height = 24,
  growthRate,
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 4) + 2;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `2,${height} ${points} ${width - 2},${height}`;
  const rawId = React.useId();
  const gradId = `grad-${color.replace('#', '')}-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <div className="flex items-center gap-1.5 shrink-0 select-none">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon
          points={areaPoints}
          fill={`url(#${gradId})`}
        />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
      {growthRate && (
        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 tabular-nums">
          {growthRate}
        </span>
      )}
    </div>
  );
};
