'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Database, Search, X } from 'lucide-react';

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
      setCheck({ exists: false, message: error instanceof Error ? error.message : '重複確認に失敗しました' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono tracking-widest text-zinc-500">
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            COLLECTION REGISTRY
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">収集済みレジストリ</h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-400">
            収集済み名称・ティッカー・ドメインの重複確認用台帳です。ここに存在することは、公開可否や一次情報の検証完了を意味しません。
          </p>
        </div>
        <Link href="/" className="shrink-0 rounded border border-white/[0.1] px-3 py-1.5 text-xs text-zinc-400 hover:text-white">台帳へ戻る</Link>
      </div>

      <section className="rounded border border-white/[0.08] bg-[#0A0C11] p-4">
        <form onSubmit={handleCheck} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setCheck(null); }} placeholder="社名・ティッカー・ドメイン・バッチで検索" className="w-full rounded border border-white/[0.1] bg-[#07080B] py-2 pl-9 pr-9 text-xs text-white outline-none focus:border-white/[0.3]" />
            {query && <button type="button" onClick={() => { setQuery(''); setCheck(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white" aria-label="検索をクリア"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <button type="submit" disabled={checking || !query.trim()} className="rounded bg-white px-4 py-2 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">{checking ? '確認中...' : '重複確認'}</button>
        </form>
        {check && (
          <div className={`mt-3 rounded border px-3 py-2 text-xs ${check.exists ? 'border-amber-500/30 bg-amber-950/20 text-amber-200' : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'}`} role="status">
            {check.exists ? '既存レコードあり: ' : '新規候補: '}{check.message}
          </div>
        )}
      </section>

      <section className="mt-4 overflow-hidden rounded border border-white/[0.08] bg-[#0A0C11]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 text-xs">
          <span className="font-mono text-zinc-300">{loading ? '読み込み中...' : errorMessage ? '取得失敗' : `${filtered.length.toLocaleString()}件表示 / 全${(registry?.totalCount ?? 0).toLocaleString()}件`}</span>
          <span className="font-mono text-[10px] text-zinc-600">READ-ONLY VIEW</span>
        </div>
        {errorMessage ? (
          <div className="p-5 text-xs text-rose-300" role="alert">{errorMessage}</div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {filtered.slice(0, 120).map((entry) => (
              <div key={entry.id} className="grid grid-cols-[minmax(0,1fr)_120px_160px] gap-3 px-4 py-3 text-xs sm:grid-cols-[minmax(0,1fr)_140px_180px_120px]">
                <div className="min-w-0"><div className="truncate font-medium text-white">{entry.name}</div><div className="truncate font-mono text-[10px] text-zinc-600">{entry.id}</div></div>
                <div className="truncate font-mono text-zinc-400">{entry.ticker || '—'}</div>
                <div className="hidden truncate text-zinc-500 sm:block">{entry.domain || '—'}</div>
                <div className="truncate text-zinc-500">{entry.status || 'UNKNOWN'}</div>
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

function isRegistryEntry(value: unknown): value is RegistryEntry {
  return Boolean(value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' && 'name' in value && typeof value.name === 'string' && 'normName' in value && typeof value.normName === 'string');
}

function readRegistryError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') return payload.error.slice(0, 240);
  return fallback;
}
