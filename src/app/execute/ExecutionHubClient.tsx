'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { formatYen } from '@/platform/utils/moneyDisplay';
import {
  executionProgress,
  executionStoragePrefix,
  isExecutionGenerationCurrent,
  mergeExecutionProjectCopies,
  normalizeExecutionProject,
  type ExecutionProject,
} from '@/shared/execution';

export function ExecutionHubClient() {
  const { token, user, loading } = useAuth();
  const userId = user?.uid ?? null;
  const storagePrefix = executionStoragePrefix(userId);
  const [localProjects, setLocalProjects] = useState<ExecutionProject[]>([]);
  const [remoteProjects, setRemoteProjects] = useState<ExecutionProject[]>([]);
  const [remoteOwnerId, setRemoteOwnerId] = useState<string | null>(null);
  const [remoteState, setRemoteState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  useEffect(() => {
    if (loading) return;
    const projects = readScopedExecutionProjects(storagePrefix);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalProjects(projects);
  }, [loading, storagePrefix]);

  useEffect(() => {
    if (loading) return;
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemoteProjects([]);
      setRemoteState('idle');
      return;
    }

    const controller = new AbortController();
    setRemoteState('loading');
    void (async () => {
      try {
        const projects: ExecutionProject[] = [];
        const seenCursors = new Set<string>();
        let cursor: string | null = null;
        let generation: number | null = null;

        do {
          const url = cursor
            ? '/api/execution-projects?cursor=' + encodeURIComponent(cursor)
            : '/api/execution-projects';
          const response = await fetch(url, {
            headers: { Authorization: 'Bearer ' + token },
            cache: 'no-store',
            signal: controller.signal,
          });
          if (!response.ok) throw new Error('load failed');

          const data: unknown = await response.json();
          const record = data && typeof data === 'object' ? data as Record<string, unknown> : {};
          const pageGeneration = typeof record.generation === 'number'
            && Number.isSafeInteger(record.generation)
            && record.generation >= 0
            ? record.generation
            : null;
          if (pageGeneration === null) throw new Error('invalid execution generation');
          if (generation === null) generation = pageGeneration;
          else if (generation !== pageGeneration) throw new Error('execution generation changed during pagination');

          const rawProjects = Array.isArray(record.projects) ? record.projects : [];
          projects.push(...rawProjects
            .map(normalizeExecutionProject)
            .filter((item): item is ExecutionProject => Boolean(item) && isExecutionGenerationCurrent(item, pageGeneration)));

          const hasMore = record.hasMore === true;
          const nextCursor = typeof record.nextCursor === 'string' && record.nextCursor ? record.nextCursor : null;
          if (!hasMore) {
            cursor = null;
          } else {
            if (!nextCursor || seenCursors.has(nextCursor)) throw new Error('invalid execution pagination cursor');
            seenCursors.add(nextCursor);
            cursor = nextCursor;
          }
        } while (cursor);

        if (generation === null) throw new Error('missing execution generation');
        setLocalProjects(readScopedExecutionProjects(storagePrefix, generation));
        setRemoteProjects(projects);
        setRemoteOwnerId(userId);
        setRemoteState('loaded');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setRemoteState('error');
      }
    })();
    return () => controller.abort();
  }, [loading, storagePrefix, token, userId]);

  const { projects, conflictIds } = useMemo(() => {
    const visibleRemoteProjects = remoteOwnerId === userId ? remoteProjects : [];
    const localById = new Map(localProjects.map((project) => [project.entityId, project]));
    const remoteById = new Map(visibleRemoteProjects.map((project) => [project.entityId, project]));
    const entityIds = new Set([...localById.keys(), ...remoteById.keys()]);
    const merged: ExecutionProject[] = [];
    const conflicts = new Set<string>();

    entityIds.forEach((entityId) => {
      const result = mergeExecutionProjectCopies(localById.get(entityId), remoteById.get(entityId));
      if (result.project) merged.push(result.project);
      if (result.conflict) conflicts.add(entityId);
    });

    return {
      projects: merged.sort((a, b) => a.sourceName.localeCompare(b.sourceName, 'ja')),
      conflictIds: conflicts,
    };
  }, [localProjects, remoteOwnerId, remoteProjects, userId]);

  const totalRevenue = projects.reduce((sum, project) => sum + project.revenueJpy, 0);
  const firstDollarCount = projects.filter((project) => project.revenueJpy > 0).length;

  if (loading) {
    return (
      <main className="w-full flex-1">
        <div className="term-panel-title"><span className="term-panel-name">実行計画</span>読み込み中</div>
        <p className="px-3 py-3 text-sm text-term-label">実行状態を読み込み中…</p>
      </main>
    );
  }

  const loadingRemote = Boolean(token) && remoteState === 'loading';

  return (
    <main className="w-full flex-1">
      <h1 className="sr-only">実行計画</h1>
      <div className="term-panel-title">
        <span className="term-panel-name max-lg:hidden">実行計画</span>
        {projects.length > 0 ? (
          <span className="term-num flex flex-wrap gap-x-4">
            <span>案件 <span className="text-term-fg-strong">{projects.length}</span></span>
            <span>初回売上 <span className="text-term-fg-strong">{firstDollarCount}件</span></span>
            <span>記録売上 <span className="text-term-fg-strong">{formatYen(totalRevenue)}</span></span>
          </span>
        ) : <span>保存した実行計画の進み具合</span>}
      </div>

      {projects.length === 0 ? (
        <section className="px-3 py-4 text-sm">
          <p className="text-term-fg-strong">{loadingRemote ? '保存した計画を読み込んでいます' : '実行計画はまだありません'}</p>
          <p className="mt-1 text-term-sub">
            {loadingRemote
              ? 'クラウドとこの端末に保存された計画を確認しています。'
              : '作った実行計画が、ここに一覧で並びます。'}
          </p>
          {!loadingRemote && (
            <Link
              href="/"
              className="mt-3 inline-flex min-h-11 items-center border border-term-accent px-4 text-sm text-term-accent hover:bg-term-head lg:min-h-8"
            >
              事例を探す
            </Link>
          )}
        </section>
      ) : (
        <section aria-label="実行計画の一覧">
          <div className="hidden h-[26px] grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_140px_130px_120px] items-center gap-3 border-b border-term-line bg-term-head px-3 text-xs text-term-label lg:grid">
            <span>案件</span>
            <span>提供するもの</span>
            <span className="text-right">進捗</span>
            <span className="text-right">記録売上</span>
            <span>状態</span>
          </div>
          {projects.map((project, index) => {
            const progress = executionProgress(project);
            const earned = project.revenueJpy > 0;
            const offer = project.offerName && project.offerName !== '金額・費用の裏付けは未確認。' ? project.offerName : '';
            return (
              <Link
                key={project.entityId}
                href={'/execute/' + encodeURIComponent(project.entityId)}
                className={`grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-b border-term-line-soft px-3 py-2 text-sm hover:bg-term-select lg:min-h-[29px] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_140px_130px_120px] lg:py-1 ${index % 2 ? 'bg-term-row-alt' : ''}`}
              >
                <span className="min-w-0 truncate text-term-fg-strong">{project.sourceName}</span>
                <span className="col-span-2 row-start-2 min-w-0 truncate text-xs text-term-label lg:col-span-1 lg:row-start-auto lg:text-sm lg:text-term-sub">{offer || '—'}</span>
                <span className="term-num text-right text-xs text-term-muted lg:text-sm">{progress}% · {project.completedSteps.length}/6</span>
                <span className={`term-num hidden text-right lg:block ${earned ? 'text-term-fg-strong' : 'text-term-dim'}`}>
                  {earned ? formatYen(project.revenueJpy) : '未達'}
                </span>
                <span className="hidden truncate text-xs lg:block">
                  {conflictIds.has(project.entityId)
                    ? <span className="text-term-accent">端末下書きとクラウドが競合</span>
                    : <span className="text-term-muted">保存済み</span>}
                </span>
              </Link>
            );
          })}
        </section>
      )}

      {remoteState === 'error' && (
        <p className="border-t border-term-line px-3 py-2 text-xs text-term-danger">クラウド側の実行プロジェクトを読み込めていないため、この端末の保存内容を表示している。</p>
      )}
    </main>
  );
}

function readScopedExecutionProjects(storagePrefix: string, generation: number | null = null): ExecutionProject[] {
  const projects: ExecutionProject[] = [];
  const staleKeys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(storagePrefix)) continue;
    try {
      const raw = window.localStorage.getItem(key);
      const project = raw ? normalizeExecutionProject(JSON.parse(raw)) : null;
      if (!project) continue;
      if (generation !== null && !isExecutionGenerationCurrent(project, generation)) staleKeys.push(key);
      else projects.push(project);
    } catch {
      // Ignore broken local drafts instead of blocking the whole hub.
    }
  }
  staleKeys.forEach((key) => window.localStorage.removeItem(key));
  return projects;
}
