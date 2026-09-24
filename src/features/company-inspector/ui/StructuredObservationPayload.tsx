'use client';

import type { UniversalObservation } from '@/shared/terminal';

function safeJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}

export function StructuredObservationPayload({ observation }: { observation: UniversalObservation }) {
  const json = safeJson(observation.payload);
  const hasMetadata = Boolean(
    observation.observationType ||
    observation.payloadSchemaRef ||
    observation.observer
  );

  if (!json && !hasMetadata) return null;

  return (
    <details className="mt-2 rounded border border-white/[0.05] bg-black/20 px-2.5 py-2">
      <summary className="cursor-pointer font-mono text-[9px] font-bold tracking-wide text-cyan-300/80">
        構造化データ
      </summary>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[8px] text-zinc-600">
        {observation.observationType && <span>type {observation.observationType}</span>}
        {observation.payloadSchemaRef && <span>schema {observation.payloadSchemaRef}</span>}
        {observation.observer && <span>observer {observation.observer}</span>}
      </div>
      {json && (
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[9px] leading-relaxed text-zinc-400">
          {json}
        </pre>
      )}
    </details>
  );
}
