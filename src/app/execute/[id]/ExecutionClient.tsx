'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, ExternalLink, Save } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { formatYen } from '@/platform/utils/moneyDisplay';
import type { ExecutionSource } from '@/shared/execution-source';
import {
  EXECUTION_STEP_IDS,
  MAX_EXECUTION_NOTES_LENGTH,
  executionContentEqual,
  executionPendingClaimKey,
  executionProgress,
  executionStorageKey,
  isExecutionGenerationCurrent,
  normalizeExecutionProject,
  type ExecutionProject,
  type ExecutionStepId,
} from '@/shared/execution';

const INPUT_CLASS = 'w-full rounded-sm border border-term-line bg-term-bg px-3 py-2 text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent';
const BTN = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border bg-transparent px-3 text-sm hover:bg-term-head disabled:opacity-60 lg:min-h-8';

const STEP_LABELS: Record<ExecutionStepId, { label: string }> = {
  FIND: { label: '売る相手と内容を決める' },
  BUILD: { label: '最小の商品を作る' },
  LIST: { label: '販売ページを用意する' },
  DISTRIBUTE: { label: '見込み客に案内する' },
  SELL: { label: '支払いを受け付ける' },
  EARN: { label: '売上を記録する' },
};

function createDefaultProject(entity: ExecutionSource, generation = 0): ExecutionProject {
  return {
    entityId: entity.id,
    sourceName: entity.name,
    offerName: '',
    targetCustomer: '',
    targetPriceJpy: 0,
    firstDollarTargetJpy: 0,
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
      <div className="flex term-page flex-col bg-term-bg text-term-fg">
        <GlobalHeader currentSection="EXECUTION" />
        <main className="w-full flex-1">
          <div className="term-panel-title"><span className="term-panel-name">実行計画</span>読み込み中</div>
          <p className="px-3 py-3 text-sm text-term-label">実行状態を読み込み中…</p>
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
  const reachedFirstDollar = project.revenueJpy > 0;


  const saveLabel = saveState === 'saved' ? 'クラウド' : saveState === 'conflict' ? '競合あり' : saveState === 'error' ? '要再保存' : 'この端末';
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="EXECUTION" />

      <main className="flex w-full flex-1 flex-col">
        <div className="term-panel-title">
          <span className="term-panel-name">実行計画</span>
          <Link
            href={'/?entity=' + encodeURIComponent(entity.id)}
            className="inline-flex min-h-11 min-w-0 items-center gap-1.5 text-term-sub hover:text-term-fg-strong lg:min-h-6"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[16rem] truncate text-term-fg-strong">{entity.name}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2 py-0.5">
            {!userId && (
              <button
                type="button"
                aria-label="ログインして同期"
                onClick={() => void signInAndClaim()}
                className={`${BTN} border-term-line text-term-fg`}
              >
                同期
              </button>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={editingDisabled || saveState === 'saving' || saveState === 'conflict'}
              aria-label={token ? 'クラウドに保存' : '端末に保存'}
              className={`${BTN} border-term-accent text-term-accent`}
            >
              <Save aria-hidden="true" className="h-3.5 w-3.5" />
              {saveState === 'saving' ? '保存中' : '保存'}
            </button>
          </div>
        </div>

        <h1 className="sr-only">{entity.name}の実行計画</h1>
        <dl className="grid grid-cols-2 border-b border-term-line sm:grid-cols-4">
          <Metric label="進捗" value={String(progress) + '%'} />
          <Metric label="初回売上" value={reachedFirstDollar ? formatYen(project.revenueJpy) : '未達'} dim={!reachedFirstDollar} />
          <Metric label="完了工程" value={String(project.completedSteps.length) + '/6'} />
          <Metric label="保存" value={saveLabel} danger={saveState === 'error' || saveState === 'conflict'} />
        </dl>

        {editingDisabled && (
          <section className="border-b border-term-line px-3 py-2 text-sm text-term-sub">
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
                  className={`${BTN} border-term-line text-term-fg`}
                >
                  再接続
                </button>
              )}
            </div>
          </section>
        )}

        {saveState === 'conflict' && (
          <section className="border-b border-term-line px-3 py-3">
            <div className="text-xs text-term-danger">保存内容の競合</div>
            <h2 className="mt-1 text-sm font-semibold text-term-fg-strong">別端末またはクラウド側にも変更があります</h2>
            <p className="mt-1 text-sm leading-5 text-term-sub">
              勝手に上書きしません。クラウド版を採用するか、この端末の内容で明示的に上書きするかを選んでください。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={acceptCloudConflict} className={`${BTN} border-term-line text-term-fg`}>
                クラウド版を採用
              </button>
              <button
                type="button"
                onClick={() => void overwriteCloudConflict()}
                disabled={!token}
                className={`${BTN} border-term-accent text-term-accent`}
              >
                この端末版で上書き
              </button>
            </div>
          </section>
        )}

        <ExecutionReference entity={entity} />

        <fieldset disabled={editingDisabled} className="min-w-0 w-full disabled:opacity-70">
          <div className="term-panel-title"><span className="term-panel-name">6つの工程</span></div>
          <section className="grid min-w-0 xl:grid-cols-2">
            {EXECUTION_STEP_IDS.map((step, index) => {
              const done = project.completedSteps.includes(step);
              return (
                <article key={step} className="min-w-0 border-b border-term-line xl:odd:border-r">
                  <div className="flex items-center gap-1 border-b border-term-line-soft bg-term-head px-1">
                    <button
                      type="button"
                      onClick={() => toggleStep(step)}
                      aria-pressed={done}
                      aria-label={done ? `${STEP_LABELS[step].label}を未完了にする` : `${STEP_LABELS[step].label}を完了にする`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center hover:bg-term-select lg:h-8 lg:w-8"
                    >
                      <span className={'flex h-4 w-4 items-center justify-center border ' + (
                        done ? 'border-term-fg-strong bg-term-fg-strong text-term-bg' : 'border-term-label text-transparent'
                      )}>
                        <Check aria-hidden="true" className="h-3 w-3" />
                      </span>
                    </button>
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2">
                      <span className="term-num text-xs text-term-label">{String(index + 1).padStart(2, '0')}</span>
                      <h2 className="text-sm font-semibold text-term-fg-strong">{STEP_LABELS[step].label}</h2>
                      <span className="text-xs text-term-muted">{done ? '完了' : '未完了'}</span>
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    <StepBody step={step} project={project} updateProject={updateProject} />
                  </div>
                </article>
              );
            })}
          </section>
        </fieldset>
      </main>
    </div>
  );
}

function StepBody({
  step,
  project,
  updateProject,
}: {
  step: ExecutionStepId;
  project: ExecutionProject;
  updateProject: (patch: Partial<ExecutionProject>) => void;
}) {
  if (step === 'FIND') {
    return (
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="売るもの">
          <textarea
            value={project.offerName}
            onChange={(event) => updateProject({ offerName: event.target.value.slice(0, 300) })}
            placeholder="誰に何を売るか"
            rows={2}
            className={INPUT_CLASS + ' [field-sizing:content] min-h-20 resize-y leading-relaxed'}
          />
        </Field>
        <Field label="最初の顧客">
          <textarea
            value={project.targetCustomer}
            onChange={(event) => updateProject({ targetCustomer: event.target.value.slice(0, 2000) })}
            placeholder="最初に金を払う人"
            rows={3}
            className={INPUT_CLASS + ' [field-sizing:content] min-h-20 resize-y leading-relaxed'}
          />
        </Field>
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
      </div>
    );
  }

  if (step === 'DISTRIBUTE') {
    return (
      <div className="mt-3 space-y-2">
        <Field label="実行メモ">
          <textarea
            value={project.notes}
            onChange={(event) => updateProject({ notes: event.target.value.slice(0, MAX_EXECUTION_NOTES_LENGTH) })}
            placeholder="案内先、日付、返答、次に確かめることなど"
            rows={3}
            maxLength={MAX_EXECUTION_NOTES_LENGTH}
            className={INPUT_CLASS + ' resize-y'}
          />
        </Field>
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
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-term-select-fg underline underline-offset-2 hover:text-term-fg-strong lg:min-h-0"
          >
            決済導線を実機確認
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <Field label="実際に発生した売上（円）">
        <input
          type="number"
          min={0}
          step={1}
          value={project.revenueJpy || ''}
          onChange={(event) => updateProject({ revenueJpy: safeMoney(event.target.value) })}
          placeholder="1000"
          className={INPUT_CLASS}
        />
      </Field>
      <Field label="初回売上の目標（円）">
        <input
          type="number"
          min={0}
          step={100}
          value={project.firstDollarTargetJpy || ''}
          onChange={(event) => updateProject({ firstDollarTargetJpy: safeMoney(event.target.value) })}
          placeholder="目標額を入力"
          className={INPUT_CLASS}
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-term-label">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Metric({
  label,
  value,
  dim = false,
  danger = false,
}: {
  label: string;
  value: string;
  dim?: boolean;
  danger?: boolean;
}) {
  const tone = danger ? 'text-term-danger' : dim ? 'text-term-dim' : 'text-term-fg-strong';
  return (
    <div className="border-b border-r border-term-line-soft px-3 py-1.5 last:border-r-0 sm:border-b-0">
      <dt className="text-xs text-term-label">{label}</dt>
      <dd className={'term-num text-sm ' + tone}>{value}</dd>
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

export function ExecutionReference({ entity }: { entity: ExecutionSource }) {
  const rows = [
    ['事業内容', entity.essence?.whatItDoes || entity.tagline],
    ['顧客', entity.essence?.targetCustomer || entity.targetPainWallet],
    ['事業構造', entity.architecturePattern], ['提供経路', entity.pipelineStack],
    ['料金', [entity.pricing?.model, entity.pricing?.pricePoint].filter(Boolean).join(' / ')],
    ['集客', entity.acquisition?.primaryFunnel || entity.strategy.initialTraction.join(' / ')],
    ['着眼点', entity.strategy.blindspot], ['参入の切り口', entity.lootBlueprint?.stealthEntry],
    ['提供の仕組み', entity.lootBlueprint?.tollGateSetup],
  ].filter(([, value]) => value && value !== 'UNKNOWN');
  if (entity.contextUnavailable || rows.length === 0) return null;
  return <details className="border-b border-term-line px-3">
    <summary className="min-h-11 cursor-pointer py-3 text-sm text-term-select-fg lg:min-h-8 lg:py-1.5">参考事例: {entity.name}</summary>
    <dl className="border-t border-term-line-soft text-sm leading-6">{rows.map(([label, value]) => <div key={label} className="grid gap-0.5 border-b border-term-line-soft py-2 sm:grid-cols-[120px_minmax(0,1fr)]"><dt className="text-xs text-term-label sm:pt-0.5">{label}</dt><dd className="whitespace-pre-wrap break-words text-term-fg">{value}</dd></div>)}</dl>
    {entity.strategy.actionPlaybook.length > 0 && <ol className="list-decimal space-y-2 py-3 pl-5 text-sm leading-6 text-term-fg">{entity.strategy.actionPlaybook.map((step, index) => <li key={index}>{step}</li>)}</ol>}
    <Link href={`/?entity=${encodeURIComponent(entity.id)}`} className="inline-flex min-h-11 items-center text-sm text-term-select-fg underline underline-offset-2 lg:min-h-8">事例の詳細を見る</Link>
  </details>;
}
