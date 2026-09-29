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

  const shown = filtered.slice(0, 120);
  return (
    <main className="w-full">
      <div className="term-panel-title">
        <span className="term-panel-name">収集済みレジストリ</span>
        <span className="term-num">
          {loading ? '読み込み中' : errorMessage ? '取得失敗' : `${shown.length.toLocaleString()}件表示 / ${query.trim() ? '検索結果' : '全'}${filtered.length.toLocaleString()}件`}
        </span>
        <span className="ml-auto hidden text-term-label sm:inline">閲覧のみ</span>
        <Link href="/" className="ml-auto inline-flex min-h-11 items-center text-term-sub hover:text-term-fg-strong sm:ml-0 lg:min-h-6">事例一覧へ</Link>
      </div>

      <section className="border-b border-term-line p-3">
        <form onSubmit={handleCheck} className="flex max-w-3xl items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-term-label" />
            <input aria-label="社名・ティッカー・ドメイン・バッチで検索" value={query} onChange={(event) => { setQuery(event.target.value); setCheck(null); }} placeholder="社名・ティッカー・ドメインで検索" className="h-11 w-full rounded-sm border border-term-line bg-term-bg py-2 pl-9 pr-11 text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent lg:h-8" />
            {query && <button type="button" onClick={() => { setQuery(''); setCheck(null); }} className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-term-label hover:text-term-fg-strong lg:h-8 lg:w-8" aria-label="検索をクリア"><X aria-hidden="true" className="h-4 w-4" /></button>}
          </div>
          <button type="submit" disabled={checking || !query.trim()} className="h-11 shrink-0 rounded-sm border border-term-accent bg-transparent px-4 text-sm text-term-accent hover:bg-term-head disabled:cursor-not-allowed disabled:opacity-40 lg:h-8">{checking ? '確認中...' : '重複確認'}</button>
        </form>
        {check && (
          <div className={`mt-2 border-l-2 px-3 py-1.5 text-sm ${check.failed ? 'border-term-danger text-term-danger' : check.exists ? 'border-term-accent text-term-accent' : 'border-term-positive text-term-positive'}`} role="status">
            {check.failed ? '' : check.exists ? '既存レコードあり: ' : '新規候補: '}{check.message}
          </div>
        )}
      </section>

      <section aria-label="収集済みレコード">
        {errorMessage ? (
          <div className="p-4 text-sm text-term-danger" role="alert">{errorMessage}</div>
        ) : (
          <div>
            {!loading && filtered.length > 0 && (
              <div className="grid h-[26px] grid-cols-[minmax(0,1fr)_86px] items-center gap-3 border-b border-term-line bg-term-head px-3 text-xs text-term-label sm:grid-cols-[minmax(0,1fr)_140px_180px_120px]">
                <span>名称</span>
                <span className="hidden sm:block">ティッカー</span>
                <span className="hidden sm:block">ドメイン</span>
                <span>状態</span>
              </div>
            )}
            {shown.map((entry, index) => (
              <div key={entry.id} className={`grid min-h-11 grid-cols-[minmax(0,1fr)_86px] items-center gap-3 border-b border-term-line-soft px-3 py-1.5 text-sm hover:bg-term-select sm:min-h-[36px] sm:grid-cols-[minmax(0,1fr)_140px_180px_120px] ${index % 2 ? 'bg-term-row-alt' : ''}`}>
                <div className="min-w-0">
                  <div className="truncate text-term-fg-strong">{entry.name}</div>
                  <div className="truncate text-xs text-term-dim" title={entry.id}>
                    <span className="sm:hidden">{entry.ticker || entry.domain || entry.sector || '識別情報なし'}</span>
                    <span className="term-num hidden sm:inline">{entry.id}</span>
                  </div>
                </div>
                <div className="term-num hidden truncate text-term-sub sm:block">{entry.ticker || '—'}</div>
                <div className="hidden truncate text-term-muted sm:block">{entry.domain || '—'}</div>
                <div className="truncate text-xs text-term-sub sm:text-sm">{registryStatusLabel(entry.status)}</div>
              </div>
            ))}
            {!loading && filtered.length === 0 && <div className="p-4 text-sm text-term-label">一致するレコードはありません。別の社名かドメインで検索してください。</div>}
            {filtered.length > 120 && <div className="border-t border-term-line p-3 text-center text-xs text-term-label">表示上限120件。検索条件を追加してください。</div>}
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
