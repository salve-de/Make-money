'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CircleDollarSign, Database } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
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
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 text-sm text-zinc-500 sm:px-6 lg:px-8">
        実行状態を読み込み中…
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-3 sm:px-6 lg:px-8">
      <section className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-white/[0.1] pb-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-50">実行計画</h1>
        </div>
        {projects.length > 0 && <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
          <SummaryItem label="案件" value={String(projects.length)} />
          <SummaryItem label="初回売上" value={`${firstDollarCount}件`} />
          <SummaryItem label="記録売上" value={`¥${totalRevenue.toLocaleString()}`} />
        </div>}
      </section>

      {projects.length === 0 ? (
        <section className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/[0.14] bg-surface px-4 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <Database aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-accent-strong" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-100">
                {token && remoteState === 'loading' ? '保存した計画を読み込んでいます' : '実行計画はまだありません'}
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-300">
                {token && remoteState === 'loading'
                  ? 'クラウドとこの端末に保存された計画を確認しています。'
                  : '台帳で事例を開き、「計画を作成」から追加できます。'}
              </p>
              {!(token && remoteState === 'loading') && (
                <Link
                  href="/"
                  className="mt-2 inline-flex min-h-10 shrink-0 items-center gap-2 text-sm font-semibold text-accent-strong transition-colors hover:text-amber-200"
                >
                  台帳で事例を探す
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-3">
          {projects.map((project) => {
            const progress = executionProgress(project);
            const earned = project.revenueJpy > 0;
            return (
              <Link
                key={project.entityId}
                href={'/execute/' + encodeURIComponent(project.entityId)}
                className="group rounded-md border border-white/[0.16] bg-[#101721] p-4 transition-colors hover:border-emerald-400/25 hover:bg-white/[0.035]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-base font-semibold text-zinc-100">{project.sourceName}</h2>
                    {project.offerName && project.offerName !== '金額・費用の裏付けは未確認。' && (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-300">{project.offerName}</p>
                    )}
                    {conflictIds.has(project.entityId) && (
                      <span className="mt-1.5 inline-flex rounded border border-amber-400/25 bg-amber-400/[0.08] px-1.5 py-0.5 text-[9px] font-mono text-amber-300">
                        端末下書きとクラウドが競合
                      </span>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-300" />
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: String(progress) + '%' }} />
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-zinc-500">{String(progress) + '% · ' + String(project.completedSteps.length) + '/6'}</span>
                  <span className={earned ? 'inline-flex items-center gap-1 font-mono text-emerald-300' : 'font-mono text-zinc-600'}>
                    {earned && <CircleDollarSign className="h-3.5 w-3.5" />}
                    {earned ? '¥' + project.revenueJpy.toLocaleString() : '売上未達'}
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      {remoteState === 'error' && (
        <p className="mt-4 text-xs text-amber-300">クラウド側の実行プロジェクトを読み込めていないため、この端末の保存内容を表示している。</p>
      )}
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums text-zinc-100">{value}</span>
    </div>
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
