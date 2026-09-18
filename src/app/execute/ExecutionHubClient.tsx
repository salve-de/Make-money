'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CircleDollarSign, Database, Rocket } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import {
  executionProgress,
  executionStoragePrefix,
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
    const projects: ExecutionProject[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(storagePrefix)) continue;
      try {
        const raw = window.localStorage.getItem(key);
        const project = raw ? normalizeExecutionProject(JSON.parse(raw)) : null;
        if (project) projects.push(project);
      } catch {
        // Ignore broken local drafts instead of blocking the whole hub.
      }
    }
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
        const response = await fetch('/api/execution-projects', {
          headers: { Authorization: 'Bearer ' + token },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('load failed');
        const data: unknown = await response.json();
        const rawProjects = data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).projects)
          ? (data as { projects: unknown[] }).projects
          : [];
        const projects = rawProjects.map(normalizeExecutionProject).filter((item): item is ExecutionProject => Boolean(item));
        setRemoteProjects(projects);
        setRemoteOwnerId(userId);
        setRemoteState('loaded');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setRemoteState('error');
      }
    })();
    return () => controller.abort();
  }, [loading, token, userId]);

  const projects = useMemo(() => {
    const merged = new Map<string, ExecutionProject>();
    const visibleRemoteProjects = remoteOwnerId === userId ? remoteProjects : [];
    [...localProjects, ...visibleRemoteProjects].forEach((project) => {
      const current = merged.get(project.entityId);
      if (!current || (project.updatedAt || '') >= (current.updatedAt || '')) {
        merged.set(project.entityId, project);
      }
    });
    return [...merged.values()].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
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
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <section className="border-b border-white/[0.08] pb-6">
        <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-300">
          <Rocket className="h-4 w-4" />
          EXECUTION PIPELINE
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">実行中</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          保存した事例を眺める場所ではなく、最初の売上まで進めている案件だけを置く。
        </p>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="実行プロジェクト" value={String(projects.length)} />
        <Metric label="First Dollar達成" value={String(firstDollarCount)} />
        <Metric label="記録済み売上" value={'¥' + totalRevenue.toLocaleString()} />
      </section>

      {projects.length === 0 ? (
        <section className="mt-8 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] p-8 text-center">
          <Database className="mx-auto h-8 w-8 text-zinc-600" />
          <h2 className="mt-3 text-sm font-semibold text-zinc-200">まだ実行中の案件はない</h2>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-zinc-500">
            財務台帳で事例を開き、「この稼ぎ方を実行」を押すとここに追加される。
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-300"
          >
            稼ぎ方を探す
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      ) : (
        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const progress = executionProgress(project);
            const earned = project.revenueJpy > 0;
            return (
              <Link
                key={project.entityId}
                href={'/execute/' + encodeURIComponent(project.entityId)}
                className="group rounded-xl border border-white/[0.08] bg-[#0b0f15] p-4 transition-colors hover:border-emerald-400/25 hover:bg-white/[0.035]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[10px] font-mono text-zinc-600">{project.sourceName}</div>
                    <h2 className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-100">
                      {project.offerName || '商品をまだ固定していない'}
                    </h2>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="text-[10px] text-zinc-600">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold text-zinc-100">{value}</div>
    </div>
  );
}
