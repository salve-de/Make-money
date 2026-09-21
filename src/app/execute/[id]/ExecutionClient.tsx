'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CircleDollarSign,
  ExternalLink,
  Rocket,
  Save,
  Target,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import type { ExecutionSource } from '@/shared/execution-source';
import {
  EXECUTION_STEP_IDS,
  MAX_EXECUTION_NOTES_LENGTH,
  executionContentEqual,
  executionPendingClaimKey,
  executionProgress,
  executionStorageKey,
  firstIncompleteStep,
  isExecutionGenerationCurrent,
  normalizeExecutionProject,
  type ExecutionProject,
  type ExecutionStepId,
} from '@/shared/execution';

const INPUT_CLASS = 'w-full rounded-lg border border-white/[0.1] bg-black/20 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-400/50';

const STEP_LABELS: Record<ExecutionStepId, { label: string; en: string }> = {
  FIND: { label: '勝ち筋を固定', en: 'FIND' },
  BUILD: { label: '最小商品を作る', en: 'BUILD' },
  LIST: { label: '売れる形にする', en: 'LIST' },
  DISTRIBUTE: { label: '最初の客へ出す', en: 'DISTRIBUTE' },
  SELL: { label: '決済を通す', en: 'SELL' },
  EARN: { label: '最初の売上を記録', en: 'EARN' },
};

function createDefaultProject(entity: ExecutionSource, generation = 0): ExecutionProject {
  const suggestedOffer = (entity.essence?.whatItDoes || entity.tagline || '').slice(0, 300);
  const targetCustomer = (entity.essence?.targetCustomer || entity.targetPainWallet || '').slice(0, 2000);
  return {
    entityId: entity.id,
    sourceName: entity.name,
    offerName: suggestedOffer,
    targetCustomer,
    targetPriceJpy: 0,
    firstDollarTargetJpy: 1000,
    completedSteps: [],
    buildUrl: '',
    launchUrl: '',
    checkoutUrl: '',
    revenueJpy: 0,
    notes: '',
    dirty: false,
    revision: 0,
    generation,
  };
}

export function ExecutionClient({ entity }: { entity: ExecutionSource }) {
  const { user, token, loading, signInWithGoogle, refreshAuthToken } = useAuth();
  const userId = user?.uid ?? null;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#07080B] text-zinc-100">
        <GlobalHeader currentSection="EXECUTION" />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 text-sm text-zinc-500 sm:px-6 lg:px-8">
          実行状態を読み込み中…
        </main>
      </div>
    );
  }

  return (
    <ExecutionWorkspace
      key={userId ?? 'anonymous'}
      entity={entity}
      userId={userId}
      token={token}
      signInWithGoogle={signInWithGoogle}
      refreshAuthToken={refreshAuthToken}
    />
  );
}

type SaveState = 'idle' | 'saving' | 'saved' | 'local' | 'conflict' | 'error';

function ExecutionWorkspace({
  entity,
  userId,
  token,
  signInWithGoogle,
  refreshAuthToken,
}: {
  entity: ExecutionSource;
  userId: string | null;
  token: string | null;
  signInWithGoogle: () => Promise<void>;
  refreshAuthToken: () => Promise<string | null>;
}) {
  const storageKey = executionStorageKey(entity.id, userId);
  const claimKey = executionPendingClaimKey(entity.id);
  const [project, setProject] = useState<ExecutionProject>(() => createDefaultProject(entity));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [conflictProject, setConflictProject] = useState<ExecutionProject | null>(null);
  const [generationHydrated, setGenerationHydrated] = useState(!userId);
  const [hydrationAttempt, setHydrationAttempt] = useState(0);

  const applySavedProject = useCallback((submitted: ExecutionProject, saved: ExecutionProject) => {
    const latest = readStoredExecutionProject(storageKey);
    if (latest && !executionContentEqual(latest, submitted)) {
      const rebased: ExecutionProject = {
        ...latest,
        revision: saved.revision,
        generation: saved.generation,
        updatedAt: saved.updatedAt,
        dirty: true,
      };
      writeStoredExecutionProject(storageKey, rebased);
      setProject(rebased);
      setConflictProject(null);
      setSaveState('idle');
      return;
    }
    writeStoredExecutionProject(storageKey, saved);
    setProject(saved);
    setConflictProject(null);
    setSaveState('saved');
  }, [storageKey]);

  const autoPersist = useCallback(async (candidate: ExecutionProject, signal?: AbortSignal) => {
    setSaveState('saving');
    try {
      const saved = await persistExecutionProject(token as string, candidate, signal);
      applySavedProject(candidate, saved);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      if (error instanceof ExecutionProjectConflictError) {
        if (error.generation !== candidate.generation) {
          window.localStorage.removeItem(storageKey);
          const fresh = createDefaultProject(entity, error.generation);
          writeStoredExecutionProject(storageKey, fresh);
          setProject(fresh);
          setConflictProject(null);
          setSaveState('local');
          return;
        }
        setProject(readStoredExecutionProject(storageKey) ?? candidate);
        setConflictProject(error.project);
        setSaveState('conflict');
        return;
      }
      setSaveState('error');
    }
  }, [applySavedProject, entity, storageKey, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const local = readStoredExecutionProject(storageKey);
      if (local?.entityId === entity.id) {
        setProject(local);
        setSaveState(token ? 'idle' : 'local');
      } else if (!userId) {
        const fresh = createDefaultProject(entity);
        writeStoredExecutionProject(storageKey, fresh);
        setProject(fresh);
        setSaveState('local');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [entity, storageKey, token, userId]);

  useEffect(() => {
    if (!token || !userId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch('/api/execution-projects?entityId=' + encodeURIComponent(entity.id), {
          headers: { Authorization: 'Bearer ' + token },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('load failed');
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object') throw new Error('invalid load response');
        const record = data as Record<string, unknown>;
        const generation = typeof record.generation === 'number' && Number.isSafeInteger(record.generation) && record.generation >= 0
          ? record.generation
          : null;
        if (generation === null) throw new Error('invalid execution generation');
        const remote = normalizeExecutionProject(record.project);
        setGenerationHydrated(true);

        const claim = readSessionExecutionProject(claimKey);
        if (claim?.entityId === entity.id) {
          window.sessionStorage.removeItem(claimKey);
          window.localStorage.removeItem(executionStorageKey(entity.id, null));
          const claimed: ExecutionProject = {
            ...claim,
            generation,
            revision: remote?.revision ?? 0,
            updatedAt: remote?.updatedAt,
          };
          writeStoredExecutionProject(storageKey, claimed);
          setProject(claimed);
          if (!remote) {
            await autoPersist(claimed, controller.signal);
          } else if (executionContentEqual(claimed, remote)) {
            writeStoredExecutionProject(storageKey, remote);
            setProject(remote);
            setConflictProject(null);
            setSaveState('saved');
          } else {
            setConflictProject(remote);
            setSaveState('conflict');
          }
          return;
        }

        let local = readStoredExecutionProject(storageKey);
        if (local && !isExecutionGenerationCurrent(local, generation)) {
          window.localStorage.removeItem(storageKey);
          local = null;
        }

        if (!local && remote) {
          writeStoredExecutionProject(storageKey, remote);
          setProject(remote);
          setConflictProject(null);
          setSaveState('saved');
          return;
        }

        if (!local && !remote) {
          const fresh = createDefaultProject(entity, generation);
          writeStoredExecutionProject(storageKey, fresh);
          setProject(fresh);
          setConflictProject(null);
          setSaveState('local');
          return;
        }

        if (local && !remote) {
          if (local.revision === 0) await autoPersist(local, controller.signal);
          else {
            setProject(local);
            setConflictProject(null);
            setSaveState('conflict');
          }
          return;
        }

        if (!local || !remote) return;

        if (local.revision === remote.revision) {
          if (executionContentEqual(local, remote) || !local.dirty) {
            writeStoredExecutionProject(storageKey, remote);
            setProject(remote);
            setConflictProject(null);
            setSaveState('saved');
          } else {
            await autoPersist(local, controller.signal);
          }
          return;
        }

        if (local.revision < remote.revision) {
          if (!local.dirty || executionContentEqual(local, remote)) {
            writeStoredExecutionProject(storageKey, remote);
            setProject(remote);
            setConflictProject(null);
            setSaveState('saved');
          } else {
            setProject(local);
            setConflictProject(remote);
            setSaveState('conflict');
          }
          return;
        }

        if (executionContentEqual(local, remote)) {
          writeStoredExecutionProject(storageKey, local);
          setProject(local);
          setConflictProject(null);
          setSaveState(local.dirty ? 'idle' : 'saved');
          return;
        }

        setProject(local);
        setConflictProject(remote);
        setSaveState('conflict');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setSaveState('error');
      }
    })();
    return () => controller.abort();
  }, [autoPersist, claimKey, entity, hydrationAttempt, storageKey, token, userId]);

  const updateProject = (patch: Partial<ExecutionProject>) => {
    if (userId && !generationHydrated) return;
    setProject((previous) => {
      const next: ExecutionProject = { ...previous, ...patch, dirty: true };
      writeStoredExecutionProject(storageKey, next);
      return next;
    });
    setSaveState((previous) => previous === 'saving' || previous === 'conflict'
      ? previous
      : token ? 'idle' : 'local');
  };

  const signInAndClaim = async () => {
    if (!executionContentEqual(project, createDefaultProject(entity))) {
      window.sessionStorage.setItem(claimKey, JSON.stringify(project));
    }
    try {
      await signInWithGoogle();
    } catch {
      window.sessionStorage.removeItem(claimKey);
    }
  };

  const toggleStep = (step: ExecutionStepId) => {
    if (userId && !generationHydrated) return;
    const completed = new Set(project.completedSteps);
    if (completed.has(step)) completed.delete(step);
    else completed.add(step);
    updateProject({ completedSteps: EXECUTION_STEP_IDS.filter((item) => completed.has(item)) });
  };

  const save = async () => {
    writeStoredExecutionProject(storageKey, project);
    if (!token) {
      setSaveState('local');
      return;
    }
    if (!generationHydrated || saveState === 'conflict') return;

    setSaveState('saving');
    const submitted = project;
    try {
      const saved = await persistExecutionProject(token, submitted);
      applySavedProject(submitted, saved);
    } catch (error) {
      if (!(error instanceof ExecutionProjectConflictError)) {
        setSaveState('error');
        return;
      }
      if (error.generation !== submitted.generation) {
        window.localStorage.removeItem(storageKey);
        const fresh = createDefaultProject(entity, error.generation);
        writeStoredExecutionProject(storageKey, fresh);
        setProject(fresh);
        setConflictProject(null);
        setSaveState('local');
        return;
      }
      setProject(readStoredExecutionProject(storageKey) ?? submitted);
      setConflictProject(error.project);
      setSaveState('conflict');
    }
  };

  const acceptCloudConflict = () => {
    const accepted = conflictProject ?? createDefaultProject(entity, project.generation);
    writeStoredExecutionProject(storageKey, accepted);
    setProject(accepted);
    setConflictProject(null);
    setSaveState(conflictProject ? 'saved' : 'local');
  };

  const overwriteCloudConflict = async () => {
    if (!token || saveState !== 'conflict') return;
    const local = readStoredExecutionProject(storageKey) ?? project;
    const candidate: ExecutionProject = {
      ...local,
      generation: conflictProject?.generation ?? local.generation,
      revision: conflictProject?.revision ?? 0,
      updatedAt: conflictProject?.updatedAt,
      dirty: true,
    };
    writeStoredExecutionProject(storageKey, candidate);
    setSaveState('saving');
    try {
      const saved = await persistExecutionProject(token, candidate);
      applySavedProject(candidate, saved);
    } catch (error) {
      if (error instanceof ExecutionProjectConflictError) {
        if (error.generation !== candidate.generation) {
          window.localStorage.removeItem(storageKey);
          const fresh = createDefaultProject(entity, error.generation);
          writeStoredExecutionProject(storageKey, fresh);
          setProject(fresh);
          setConflictProject(null);
          setSaveState('local');
          return;
        }
        setProject(readStoredExecutionProject(storageKey) ?? candidate);
        setConflictProject(error.project);
        setSaveState('conflict');
        return;
      }
      setSaveState('error');
    }
  };

  const retryGenerationHydration = async () => {
    setSaveState('idle');
    const refreshedToken = await refreshAuthToken();
    if (!refreshedToken) {
      setSaveState('error');
      return;
    }
    setHydrationAttempt((attempt) => attempt + 1);
  };

  const editingDisabled = Boolean(userId) && !generationHydrated;
  const progress = executionProgress(project);
  const currentStep = firstIncompleteStep(project);
  const blueprint = entity.lootBlueprint;
  const firstActions = blueprint?.executionChecklist?.length
    ? blueprint.executionChecklist
    : entity.strategy.actionPlaybook;
  const acquisitionHints = entity.strategy.initialTraction?.length
    ? entity.strategy.initialTraction
    : entity.acquisition?.tactics ?? [];
  const reachedFirstDollar = project.revenueJpy > 0;

  const nextAction = useMemo(() => {
    if (!currentStep) return '全工程完了。売上の再現と拡大へ進む。';
    const fallback: Record<ExecutionStepId, string> = {
      FIND: '誰のどの痛みに、何を売るかを1行で固定する。',
      BUILD: '販売に必要な最小機能だけを作り、制作URLを残す。',
      LIST: '価格を決め、ユーザーが見られる公開URLを用意する。',
      DISTRIBUTE: '最初の見込み客がいる場所へ実際に出す。',
      SELL: '支払える決済URLを接続する。',
      EARN: '最初の売上が出たら実額を記録する。',
    };
    return fallback[currentStep];
  }, [currentStep]);

  return (
    <div className="flex min-h-screen flex-col bg-[#07080B] text-zinc-100">
      <GlobalHeader currentSection="EXECUTION" />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={'/?entity=' + encodeURIComponent(entity.id)}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            台帳へ戻る
          </Link>

          <div className="flex items-center gap-2">
            {!userId && (
              <button
                type="button"
                onClick={() => void signInAndClaim()}
                className="rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 transition-colors hover:bg-white/[0.08]"
              >
                ログインして同期
              </button>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={editingDisabled || saveState === 'saving' || saveState === 'conflict'}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950 transition-colors hover:bg-emerald-300 disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {saveState === 'saving' ? '保存中' : token ? 'クラウド保存' : '端末に保存'}
            </button>
          </div>
        </div>

        <section className="grid gap-4 border-b border-white/[0.08] pb-5 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-mono text-emerald-300">
              <Rocket className="h-4 w-4" />
              MAKE MONEY EXECUTION
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              見つけた勝ち筋を、最初の売上まで運ぶ
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              元事例: <strong className="text-zinc-200">{entity.name}</strong>。
              情報を読むだけで終わらせず、FIND → BUILD → LIST → DISTRIBUTE → SELL → EARN を1本で進める。
            </p>
            {entity.contextUnavailable && <p className="mt-2 text-sm text-amber-300">
              元事例の詳細を公開確認できないため、未確認の財務・手口は引き継いでいません。事業名だけを起点に、ご自身の計画を入力できます。
            </p>}
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
            <Metric label="進捗" value={String(progress) + '%'} />
            <Metric
              label="初回売上"
              value={reachedFirstDollar ? '¥' + project.revenueJpy.toLocaleString() : '未達'}
              tone={reachedFirstDollar ? 'green' : 'neutral'}
            />
            <Metric label="完了工程" value={String(project.completedSteps.length) + '/6'} />
            <Metric
              label="保存"
              value={saveState === 'saved' ? 'クラウド' : saveState === 'conflict' ? '競合あり' : saveState === 'error' ? '要再保存' : 'この端末'}
              tone={saveState === 'error' || saveState === 'conflict' ? 'red' : 'neutral'}
            />
          </div>
        </section>

        {editingDisabled && (
          <section className="rounded-xl border border-blue-400/20 bg-blue-400/[0.05] px-4 py-3 text-xs text-zinc-400">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                {saveState === 'error'
                  ? 'クラウドの保存世代を確認できませんでした。安全のため編集をロックしています。'
                  : 'クラウドの保存世代を確認中です。確認が終わるまで編集をロックしています。'}
              </span>
              {saveState === 'error' && (
                <button
                  type="button"
                  onClick={() => void retryGenerationHydration()}
                  className="rounded-md border border-blue-300/25 bg-blue-300/10 px-3 py-1.5 text-[11px] font-semibold text-blue-200 hover:bg-blue-300/15"
                >
                  再接続
                </button>
              )}
            </div>
          </section>
        )}

        {saveState === 'conflict' && (
          <section className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
            <div className="text-[10px] font-bold tracking-[0.18em] text-amber-300">SAVE CONFLICT</div>
            <h2 className="mt-2 text-sm font-semibold text-zinc-100">別端末またはクラウド側にも変更があります</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              勝手に上書きしません。クラウド版を採用するか、この端末の内容で明示的に上書きするかを選んでください。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={acceptCloudConflict}
                className="rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.08]"
              >
                クラウド版を採用
              </button>
              <button
                type="button"
                onClick={() => void overwriteCloudConflict()}
                disabled={!token}
                className="rounded-md border border-amber-300/30 bg-amber-300 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-200 disabled:opacity-50"
              >
                この端末版で上書き
              </button>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
          <div className="text-[10px] font-bold tracking-[0.18em] text-emerald-300">NEXT ACTION</div>
          <div className="mt-2 flex items-start gap-3">
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <div>
              <div className="text-sm font-semibold text-white">
                {currentStep ? STEP_LABELS[currentStep].label : '初回売上ループを回す'}
              </div>
              <p className="mt-1 text-sm leading-6 text-zinc-300">{nextAction}</p>
            </div>
          </div>
        </section>

        <fieldset disabled={editingDisabled} className="grid gap-5 xl:grid-cols-[1.55fr_0.85fr] disabled:opacity-70">
          <section className="space-y-3">
            {EXECUTION_STEP_IDS.map((step, index) => {
              const done = project.completedSteps.includes(step);
              return (
                <article
                  key={step}
                  className={'rounded-xl border p-4 transition-colors ' + (
                    done
                      ? 'border-emerald-400/20 bg-emerald-400/[0.035]'
                      : 'border-white/[0.08] bg-[#0b0f15]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleStep(step)}
                      aria-pressed={done}
                      className={'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ' + (
                        done
                          ? 'border-emerald-300 bg-emerald-300 text-zinc-950'
                          : 'border-white/[0.18] bg-white/[0.03] text-transparent hover:border-emerald-300/60'
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono text-[10px] text-zinc-500">{String(index + 1).padStart(2, '0')}</span>
                        <h2 className="text-sm font-semibold text-zinc-100">{STEP_LABELS[step].label}</h2>
                        <span className="font-mono text-[10px] text-emerald-400/80">{STEP_LABELS[step].en}</span>
                      </div>
                      <StepBody
                        step={step}
                        entity={entity}
                        project={project}
                        updateProject={updateProject}
                        firstActions={firstActions}
                        acquisitionHints={acquisitionHints}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="space-y-4">
            <section className="rounded-xl border border-white/[0.08] bg-[#0b0f15] p-4">
              <h2 className="text-xs font-bold tracking-wide text-zinc-200">元事例から持ってくるもの</h2>
              <dl className="mt-3 space-y-3 text-xs">
                <Fact label="狙う財布" value={entity.targetPainWallet || entity.essence?.targetCustomer || '未整理'} />
                <Fact label="構造の型" value={entity.architecturePattern || '未整理'} />
                <Fact label="配管" value={entity.pipelineStack || '未整理'} />
                <Fact label="価格" value={entity.pricing?.pricePoint || entity.pricing?.model || '未確認'} />
                <Fact label="最初の集客" value={entity.acquisition?.primaryFunnel || acquisitionHints[0] || '未確認'} />
              </dl>
            </section>

            {blueprint && (
              <section className="rounded-xl border border-white/[0.08] bg-[#0b0f15] p-4">
                <h2 className="text-xs font-bold tracking-wide text-zinc-200">転用の急所</h2>
                <dl className="mt-3 space-y-3 text-xs">
                  <Fact label="標的" value={blueprint.targetPrey} />
                  <Fact label="歪み" value={blueprint.structuralFlaw} />
                  <Fact label="侵入口" value={blueprint.stealthEntry} />
                  <Fact label="関所" value={blueprint.tollGateSetup} />
                </dl>
              </section>
            )}

            <section className="rounded-xl border border-white/[0.08] bg-[#0b0f15] p-4">
              <label className="text-xs font-bold text-zinc-200" htmlFor="execution-notes">実行メモ</label>
              <textarea
                id="execution-notes"
                value={project.notes}
                onChange={(event) => updateProject({ notes: event.target.value.slice(0, MAX_EXECUTION_NOTES_LENGTH) })}
                rows={8}
                maxLength={MAX_EXECUTION_NOTES_LENGTH}
                placeholder="やること、詰まった点、顧客の反応など"
                className="mt-3 w-full resize-y rounded-lg border border-white/[0.1] bg-black/20 px-3 py-2 text-xs leading-5 text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-400/50"
              />
            </section>
          </aside>
        </fieldset>
      </main>
    </div>
  );
}

function StepBody({
  step,
  entity,
  project,
  updateProject,
  firstActions,
  acquisitionHints,
}: {
  step: ExecutionStepId;
  entity: ExecutionSource;
  project: ExecutionProject;
  updateProject: (patch: Partial<ExecutionProject>) => void;
  firstActions: string[];
  acquisitionHints: string[];
}) {
  if (step === 'FIND') {
    return (
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="売るもの">
          <input
            value={project.offerName}
            onChange={(event) => updateProject({ offerName: event.target.value.slice(0, 300) })}
            placeholder="誰に何を売るか"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="最初の顧客">
          <input
            value={project.targetCustomer}
            onChange={(event) => updateProject({ targetCustomer: event.target.value.slice(0, 2000) })}
            placeholder="最初に金を払う人"
            className={INPUT_CLASS}
          />
        </Field>
        <Hint text={entity.opportunityJudgment?.oneLineReason || entity.strategy.blindspot} />
      </div>
    );
  }

  if (step === 'BUILD') {
    return (
      <div className="mt-3 space-y-3">
        <Field label="制作中のURL">
          <input
            type="url"
            value={project.buildUrl}
            onChange={(event) => updateProject({ buildUrl: event.target.value.slice(0, 2048) })}
            placeholder="https://..."
            className={INPUT_CLASS}
          />
        </Field>
        {firstActions.slice(0, 3).map((action, index) => (
          <Hint key={String(index) + action} text={action} />
        ))}
      </div>
    );
  }

  if (step === 'LIST') {
    return (
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="公開URL">
          <input
            type="url"
            value={project.launchUrl}
            onChange={(event) => updateProject({ launchUrl: event.target.value.slice(0, 2048) })}
            placeholder="https://..."
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="販売価格（円）">
          <input
            type="number"
            min={0}
            step={100}
            value={project.targetPriceJpy || ''}
            onChange={(event) => updateProject({ targetPriceJpy: safeMoney(event.target.value) })}
            placeholder="3000"
            className={INPUT_CLASS}
          />
        </Field>
        <Hint text={entity.pricing ? entity.pricing.model + ' / ' + entity.pricing.pricePoint : 'まず1つの価格だけに絞る。'} />
      </div>
    );
  }

  if (step === 'DISTRIBUTE') {
    return (
      <div className="mt-3 space-y-2">
        {(acquisitionHints.length ? acquisitionHints : entity.operations.primaryChannels).slice(0, 4).map((hint, index) => (
          <Hint key={String(index) + hint} text={hint} />
        ))}
        {!acquisitionHints.length && !entity.operations.primaryChannels.length && (
          <Hint text="最初の見込み客がすでに集まっている場所を1つ選び、公開URLを出す。" />
        )}
      </div>
    );
  }

  if (step === 'SELL') {
    const checkoutHref = safeHttpUrl(project.checkoutUrl);
    return (
      <div className="mt-3 space-y-3">
        <Field label="実際に支払える決済URL">
          <input
            type="url"
            value={project.checkoutUrl}
            onChange={(event) => updateProject({ checkoutUrl: event.target.value.slice(0, 2048) })}
            placeholder="https://..."
            className={INPUT_CLASS}
          />
        </Field>
        {checkoutHref && (
          <a
            href={checkoutHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200"
          >
            決済導線を実機確認
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <Field label="実際に発生した売上（円）">
        <div className="relative">
          <CircleDollarSign className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="number"
            min={0}
            step={1}
            value={project.revenueJpy || ''}
            onChange={(event) => updateProject({ revenueJpy: safeMoney(event.target.value) })}
            placeholder="1000"
            className={INPUT_CLASS + ' pl-9'}
          />
        </div>
      </Field>
      <Field label="First Dollarの目標額（円）">
        <input
          type="number"
          min={0}
          step={100}
          value={project.firstDollarTargetJpy || ''}
          onChange={(event) => updateProject({ firstDollarTargetJpy: safeMoney(event.target.value) })}
          placeholder="1000"
          className={INPUT_CLASS}
        />
      </Field>
      <Hint text="ここは予測ではなく実額だけを入れる。1円でも売上が発生した時点で、情報探索から事業実行へ状態が変わる。" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px] text-zinc-500">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Hint({ text }: { text: string }) {
  if (!text) return null;
  return <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs leading-5 text-zinc-400 md:col-span-2">{text}</div>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-mono text-zinc-600">{label}</dt>
      <dd className="mt-1 leading-5 text-zinc-300">{value}</dd>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'green' | 'red';
}) {
  const toneClass = tone === 'green' ? 'text-emerald-300' : tone === 'red' ? 'text-red-300' : 'text-zinc-100';
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/20 p-2.5">
      <div className="text-[10px] text-zinc-600">{label}</div>
      <div className={'mt-1 font-mono text-sm font-semibold ' + toneClass}>{value}</div>
    </div>
  );
}

function safeMoney(value: string): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 1_000_000_000_000);
}

function safeHttpUrl(value: string): string | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

class ExecutionProjectConflictError extends Error {
  constructor(
    public readonly generation: number,
    public readonly project: ExecutionProject | null,
  ) {
    super('Execution project conflict');
    this.name = 'ExecutionProjectConflictError';
  }
}

function readStoredExecutionProject(storageKey: string): ExecutionProject | null {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    return normalizeExecutionProject(JSON.parse(raw));
  } catch {
    return null;
  }
}

function readSessionExecutionProject(storageKey: string): ExecutionProject | null {
  const raw = window.sessionStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    return normalizeExecutionProject(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeStoredExecutionProject(storageKey: string, project: ExecutionProject) {
  window.localStorage.setItem(storageKey, JSON.stringify(project));
}

async function persistExecutionProject(token: string, project: ExecutionProject, signal?: AbortSignal) {
  const response = await fetch('/api/execution-projects', {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(executionRequestBody(project)),
    signal,
  });
  const data: unknown = await response.json().catch(() => null);
  if (response.status === 409) {
    const record = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    const generation = typeof record.generation === 'number' && Number.isSafeInteger(record.generation) && record.generation >= 0
      ? record.generation
      : project.generation;
    throw new ExecutionProjectConflictError(generation, normalizeExecutionProject(record.project));
  }
  if (!response.ok) throw new Error('save failed');
  const saved = data && typeof data === 'object'
    ? normalizeExecutionProject((data as Record<string, unknown>).project)
    : null;
  if (!saved) throw new Error('invalid saved project');
  return saved;
}

function executionRequestBody(project: ExecutionProject) {
  return {
    entityId: project.entityId,
    sourceName: project.sourceName,
    offerName: project.offerName,
    targetCustomer: project.targetCustomer,
    targetPriceJpy: project.targetPriceJpy,
    firstDollarTargetJpy: project.firstDollarTargetJpy,
    completedSteps: project.completedSteps,
    buildUrl: project.buildUrl,
    launchUrl: project.launchUrl,
    checkoutUrl: project.checkoutUrl,
    revenueJpy: project.revenueJpy,
    notes: project.notes,
    revision: project.revision,
    generation: project.generation,
  };
}
