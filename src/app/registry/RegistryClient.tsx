'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';

interface RegistryEntry {
  id: string;
  name: string;
  normName: string;
  ticker?: string;
  domain?: string;
  sector?: string;
  status?: string;
  batchId?: string;
}

interface RegistryPayload {
  totalCount: number;
  entities: RegistryEntry[];
}

interface DuplicateCheck {
  failed?: boolean;
  exists: boolean;
  message: string;
  entity?: RegistryEntry;
}

export default function RegistryClient() {
  const [registry, setRegistry] = useState<RegistryPayload | null>(null);
  const [query, setQuery] = useState('');
  const [check, setCheck] = useState<DuplicateCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/registry', { cache: 'no-store' });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(readRegistryError(payload, '収集レジストリを取得できません'));
        if (!payload || typeof payload !== 'object' || !('entities' in payload) || !Array.isArray(payload.entities)) {
          throw new Error('収集レジストリの応答形式を確認できません');
        }
        const entities = payload.entities.filter(isRegistryEntry);
        if (!cancelled) {
          setRegistry({
            totalCount: 'totalCount' in payload && typeof payload.totalCount === 'number' ? payload.totalCount : entities.length,
            entities,
          });
        }
      } catch (error) {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : '収集レジストリを取得できません');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!registry || !normalized) return registry?.entities ?? [];
    return registry.entities.filter((entry) => [entry.name, entry.ticker, entry.domain, entry.sector, entry.batchId]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalized)));
  }, [query, registry]);

  const handleCheck = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = query.trim();
    if (!target) {
      setCheck(null);
      return;
    }
    setChecking(true);
    setCheck(null);
    try {
      const response = await fetch(`/api/registry?check=${encodeURIComponent(target)}`, { cache: 'no-store' });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(readRegistryError(payload, '重複確認に失敗しました'));
      if (!payload || typeof payload !== 'object' || !('exists' in payload) || !('message' in payload) || typeof payload.exists !== 'boolean' || typeof payload.message !== 'string') {
        throw new Error('重複確認の応答形式を確認できません');
      }
      setCheck({ exists: payload.exists, message: payload.message, entity: 'entity' in payload && isRegistryEntry(payload.entity) ? payload.entity : undefined });
    } catch (error) {
      setCheck({ exists: false, failed: true, message: error instanceof Error ? error.message : '重複確認に失敗しました' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-3 py-2 sm:px-6 sm:py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-white">収集済みレジストリ</h1>
        </div>
        <Link href="/" className="inline-flex min-h-9 shrink-0 items-center rounded px-2 text-xs text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white">台帳へ戻る</Link>
      </div>

      <section>
        <form onSubmit={handleCheck} className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input aria-label="社名・ティッカー・ドメイン・バッチで検索" value={query} onChange={(event) => { setQuery(event.target.value); setCheck(null); }} placeholder="社名・ティッカー・ドメインで検索" className="h-10 w-full rounded-md border border-white/[0.14] bg-surface py-2 pl-10 pr-10 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-sky-300" />
            {query && <button type="button" onClick={() => { setQuery(''); setCheck(null); }} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded text-zinc-400 hover:bg-white/[0.08] hover:text-white" aria-label="検索をクリア"><X aria-hidden="true" className="h-4 w-4" /></button>}
          </div>
          <button type="submit" disabled={checking || !query.trim()} className="h-10 shrink-0 rounded-md bg-sky-200 px-3 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40">{checking ? '確認中...' : '重複確認'}</button>
        </form>
        {check && (
          <div className={`mt-3 rounded border px-3 py-2 text-xs ${check.failed ? 'border-rose-500/30 bg-rose-950/20 text-rose-200' : check.exists ? 'border-amber-500/30 bg-amber-950/20 text-amber-200' : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'}`} role="status">
            {check.failed ? '' : check.exists ? '既存レコードあり: ' : '新規候補: '}{check.message}
          </div>
        )}
      </section>

      <section className="mt-2 overflow-hidden border border-white/[0.1] bg-[#0A0C11]">
        <div className="flex min-h-8 items-center justify-between gap-3 border-b border-white/[0.1] px-3 py-1.5 text-xs">
          <span className="text-zinc-200">{loading ? '読み込み中...' : errorMessage ? '取得失敗' : `${Math.min(filtered.length, 120).toLocaleString()}件表示 / ${query.trim() ? '検索結果' : '全'}${filtered.length.toLocaleString()}件`}</span>
          <span className="shrink-0 text-zinc-500">閲覧のみ</span>
        </div>
        {errorMessage ? (
          <div className="p-5 text-xs text-rose-300" role="alert">{errorMessage}</div>
        ) : (
          <div className="divide-y divide-white/[0.1]">
            {!loading && filtered.length > 0 && (
              <div className="grid grid-cols-[minmax(0,1fr)_86px] gap-3 border-b border-white/[0.16] bg-surface px-4 py-2.5 font-mono text-[11px] font-semibold tracking-wide text-zinc-400 sm:grid-cols-[minmax(0,1fr)_140px_180px_120px]">
                <span>名称 / ID</span>
                <span className="hidden sm:block">TICKER</span>
                <span className="hidden sm:block">DOMAIN</span>
                <span>状態</span>
              </div>
            )}
            {filtered.slice(0, 120).map((entry) => (
              <div key={entry.id} className="grid grid-cols-[minmax(0,1fr)_86px] items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/[0.025] sm:grid-cols-[minmax(0,1fr)_140px_180px_120px]">
                <div className="min-w-0"><div className="line-clamp-2 font-medium text-white sm:line-clamp-none sm:truncate">{entry.name}</div><div className="truncate text-xs text-zinc-500" title={entry.id}><span className="sm:hidden">{entry.ticker || entry.domain || entry.sector || '識別情報なし'}</span><span className="hidden sm:inline">{entry.id}</span></div></div>
                <div className="hidden truncate text-sm text-zinc-300 sm:block">{entry.ticker || '—'}</div>
                <div className="hidden truncate text-sm text-zinc-400 sm:block">{entry.domain || '—'}</div>
                <div className="truncate text-xs text-zinc-300 sm:text-sm">{registryStatusLabel(entry.status)}</div>
              </div>
            ))}
            {!loading && filtered.length === 0 && <div className="p-5 text-xs text-zinc-500">一致するレコードはありません。</div>}
            {filtered.length > 120 && <div className="border-t border-white/[0.05] p-3 text-center text-[11px] text-zinc-500">表示上限120件。検索条件を追加してください。</div>}
          </div>
        )}
      </section>
    </main>
  );
}

function registryStatusLabel(status?: string): string {
  switch (status) {
    case 'VERIFIED': return '一次確認';
    case 'REPORTED': return '報告値';
    case 'ESTIMATED': return '推計';
    case 'POST_MORTEM': return '事後記録';
    default: return '未確認';
  }
}

function isRegistryEntry(value: unknown): value is RegistryEntry {
  return Boolean(value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' && 'name' in value && typeof value.name === 'string' && 'normName' in value && typeof value.normName === 'string');
}

function readRegistryError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') return payload.error.slice(0, 240);
  return fallback;
}
