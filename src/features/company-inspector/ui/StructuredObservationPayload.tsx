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
  const display = observation.publicDisplay;
  if (display) {
    return (
      <div className="mt-2 rounded border border-white/[0.07] bg-black/20 px-3 py-2.5">
        <div className="font-mono text-[10px] font-bold text-cyan-300/90">
          {display.title}
        </div>
        <div className="mt-1 text-[10px] leading-relaxed text-zinc-400">
          {display.subject}
        </div>
        <div className="mt-2 space-y-1">
          {display.facts.map((fact, index) => (
            <div key={`${fact.label}-${index}`} className="flex items-baseline justify-between gap-3 font-mono text-[10px]">
              <span className="text-zinc-500">{fact.label}</span>
              <span className="font-bold text-zinc-200">
                {String(fact.value)}{fact.suffix || ''}
              </span>
            </div>
          ))}
        </div>
        {display.note && (
          <p className="mt-2 border-t border-white/[0.05] pt-2 text-[9px] leading-relaxed text-zinc-500">
            {display.note}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-mono">
          {display.sourceUrls.map((url, index) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400/80 underline decoration-cyan-400/30 underline-offset-2 hover:text-cyan-300"
            >
              {display.sourceLabel}{display.sourceUrls.length > 1 ? ` ${index + 1}` : ''}
            </a>
          ))}
        </div>
      </div>
    );
  }

  const json = safeJson(observation.publicPayload);
  if (!json) return null;

  return (
    <details className="mt-2 rounded border border-white/[0.05] bg-black/20 px-2.5 py-2">
      <summary className="cursor-pointer font-mono text-[9px] font-bold tracking-wide text-cyan-300/80">
        構造化データ
      </summary>
      {observation.observationType && (
        <div className="mt-2 font-mono text-[8px] text-zinc-600">
          type {observation.observationType}
        </div>
      )}
      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[9px] leading-relaxed text-zinc-400">
        {json}
      </pre>
    </details>
  );
}
