'use client';

import { cleanDisplayText } from '@/shared/display-text';
import type { UniversalObservation } from '@/shared/terminal';

function safeJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}

function sameProse(a: string | undefined, b: string | undefined): boolean {
  const norm = (value: string | undefined) => (value ?? '').replace(/[\s。、.,]/g, '');
  return norm(a) !== '' && norm(a) === norm(b);
}

export function StructuredObservationPayload({ observation }: { observation: UniversalObservation }) {
  const display = observation.publicDisplay;
  if (display) {
    return (
      <div className="mt-2 rounded-sm border border-term-line-soft bg-term-bg/80 px-3 py-2.5">
        <div className="font-mono text-xs font-bold text-term-fg">
          {cleanDisplayText(display.title)}
        </div>
        <div className="mt-1 text-xs leading-relaxed text-term-label">
          {cleanDisplayText(display.subject)}
        </div>
        <div className="mt-2 space-y-1">
          {display.facts.map((fact, index) => (
            <div key={`${fact.label}-${index}`} className="flex items-baseline justify-between gap-3 font-mono text-xs">
              <span className="text-zinc-500">{fact.label}</span>
              <span className="font-bold text-zinc-200">
                {cleanDisplayText(String(fact.value))}{fact.suffix || ''}
              </span>
            </div>
          ))}
        </div>
        {display.note && !sameProse(cleanDisplayText(display.note), cleanDisplayText(observation.text)) && (
          <p className="mt-2 border-t border-term-line-soft pt-2 text-xs leading-relaxed text-term-dim">
            {cleanDisplayText(display.note)}
          </p>
        )}
        {display.attribution && (
          <div
            className="mt-2 border-t border-term-line-soft pt-2 font-mono text-xs leading-relaxed text-term-dim"
            data-testid="public-display-attribution"
          >
            <span className="text-term-label">出典: {display.attribution.providerName}</span>
            {display.attribution.publishedAt && <span> · 掲載 {display.attribution.publishedAt.slice(0, 10)}</span>}
            {!display.attribution.publishedAt && display.attribution.retrievedAt && (
              <span> · 取得 {display.attribution.retrievedAt.slice(0, 10)}</span>
            )}
            {display.attribution.selfReported && (
              <span className="ml-2 rounded-sm border border-term-accent-line px-1 text-term-accent">本人申告・独立確認なし</span>
            )}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono">
          {display.sourceUrls.map((url, index) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-term-fg underline underline-offset-2 hover:text-term-fg"
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
    <details className="mt-2 rounded-sm border border-term-line-soft bg-term-bg/80 px-2.5 py-2">
      <summary className="cursor-pointer font-mono text-xs font-bold text-term-fg">
        構造化データ
      </summary>
      {observation.observationType && (
        <div className="mt-2 font-mono text-xs text-zinc-600">
          type {observation.observationType}
        </div>
      )}
      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-term-label">
        {cleanDisplayText(json)}
      </pre>
    </details>
  );
}
