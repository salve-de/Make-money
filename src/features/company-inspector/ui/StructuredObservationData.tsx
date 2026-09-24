import React from 'react';

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function StructuredObservationData({
  value,
  schemaRef,
}: {
  value?: Record<string, unknown> | null;
  schemaRef?: string | null;
}) {
  if (!value || Object.keys(value).length === 0) return null;
  const keys = Object.keys(value);
  return (
    <details className="mt-2 overflow-hidden rounded border border-white/[0.05] bg-black/30">
      <summary className="cursor-pointer px-2.5 py-1.5 font-mono text-[9px] text-zinc-500 hover:text-zinc-300">
        構造化データ {keys.length}項目
        {schemaRef ? <span className="ml-2 text-zinc-600">schema: {schemaRef}</span> : null}
      </summary>
      <pre className="max-h-[60vh] overflow-auto border-t border-white/[0.04] px-2.5 py-2 font-mono text-[9px] leading-relaxed text-zinc-400 whitespace-pre-wrap break-words">
        {safeJson(value)}
      </pre>
    </details>
  );
}
