'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  LoaderCircle,
  RefreshCcw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { SynthesizedIdea } from '@/shared/terminal';
import { createBuildSpec, type BuildSpec } from '@/lib/builder/spec';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { formatYen } from '@/platform/utils/moneyDisplay';

interface PublicBuildSession {
  id: string;
  ideaId: string;
  provider: 'v0';
  status: 'draft' | 'generating' | 'ready' | 'error';
  creditsCost: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BuilderContext {
  idea: SynthesizedIdea;
  buildSpec: BuildSpec;
  session: PublicBuildSession | null;
  providerConfigured: boolean;
  budget: { used: number; limit: number; remaining: number };
}

const PUBLIC_DEMO_ID = 'example-idea';

const PUBLIC_DEMO_IDEA: SynthesizedIdea = {
  id: PUBLIC_DEMO_ID,
  dimension: 'CONTRARIAN_BLINDSPOT',
  dimensionLabel: '逆張り・盲点型（公開デモ）',
  title: '町工場の紙図面をLINEで受ける図面データ化サブスク',
  targetPainWallet: '紙図面・FAX・写真を探し回る小規模製造業の現場責任者。納期遅延と再入力の手戻りを減らしたい。',
  structuralArbitrage: '高価な基幹システム導入ではなく、既存のLINE受付と人手確認を組み合わせ、最初の一案件を短時間でデータ化する。',
  projectedMonthlyProfitJpy: 280000,
  operatingMargin: 62,
  requiredTools: [
    { name: 'LINE公式アカウント', monthlyCostJpy: 5000, purpose: '図面画像の受付と案件通知' },
    { name: 'OCR / ファイル保管', monthlyCostJpy: 12000, purpose: '画像からの下書き抽出と納品管理' },
  ],
  first100TractionPlaybook: [
    '地域の町工場へサンプル1件を持参し、図面の検索時間を実測する',
    '月額ではなく最初の10件を納品単位で試してもらう',
    '紹介元と納期短縮の実測値を記録し、次の提案資料へ反映する',
  ],
  sourceEntityIds: [],
  userNoteInspiration: '企画内容と試作品の画面を確認するためのサンプルです。表示する数値は実績ではなく仮説です。',
};

const PUBLIC_DEMO_CONTEXT: BuilderContext = {
  idea: PUBLIC_DEMO_IDEA,
  buildSpec: createBuildSpec(PUBLIC_DEMO_IDEA),
  session: null,
  providerConfigured: false,
  budget: { used: 0, limit: 0, remaining: 0 },
};

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function errorMessage(value: Record<string, unknown>, fallback: string): string {
  return typeof value.error === 'string' && value.error.trim() ? value.error : fallback;
}

function formatCredits(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return value < 0.01 ? value.toFixed(4) : value.toFixed(2);
}

export function BuilderWorkspace({ ideaId }: { ideaId: string }) {
  const { user, loading: authLoading, token, signInWithGoogle } = useAuth();
  const isPublicDemo = ideaId === PUBLIC_DEMO_ID;
  const [context, setContext] = useState<BuilderContext | null>(() => (
    isPublicDemo ? PUBLIC_DEMO_CONTEXT : null
  ));
  const [session, setSession] = useState<PublicBuildSession | null>(null);
  const [contextLoading, setContextLoading] = useState(!isPublicDemo);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [instruction, setInstruction] = useState('');
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const authorization = useMemo(
    () => token ? { Authorization: `Bearer ${token}` } : null,
    [token],
  );

  const loadContext = useCallback(async () => {
    if (isPublicDemo) {
      setContext(PUBLIC_DEMO_CONTEXT);
      setSession(null);
      setContextLoading(false);
      return;
    }
    if (!authorization) return;
    setContextLoading(true);
    setError(null);
    try {
      let response = await fetch(`/api/build/context?ideaId=${encodeURIComponent(ideaId)}`, {
        headers: authorization,
        cache: 'no-store',
      });

      if (response.status === 404) {
        let draftIdea: unknown = null;
        try {
          const raw = sessionStorage.getItem(`mm_build_idea:${ideaId}`);
          draftIdea = raw ? JSON.parse(raw) : null;
        } catch {
          draftIdea = null;
        }
        if (draftIdea) {
          const prepared = await fetch('/api/build/prepare', {
            method: 'POST',
            headers: { ...authorization, 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea: draftIdea }),
          });
          if (prepared.ok) {
            response = await fetch(`/api/build/context?ideaId=${encodeURIComponent(ideaId)}`, {
              headers: authorization,
              cache: 'no-store',
            });
          }
        }
      }

      const data = await responseJson(response);
      if (!response.ok) throw new Error(errorMessage(data, 'Builder context could not be loaded'));
      const typed = data as unknown as BuilderContext;
      setContext(typed);
      setSession(typed.session);
      try { sessionStorage.removeItem(`mm_build_idea:${ideaId}`); } catch { /* optional local handoff */ }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Builder context could not be loaded');
    } finally {
      setContextLoading(false);
    }
  }, [authorization, ideaId, isPublicDemo]);

  const loadPreview = useCallback(async (sessionId: string) => {
    if (isPublicDemo || !authorization) return;
    setPreviewLoading(true);
    try {
      const response = await fetch('/api/build/preview-ticket', {
        method: 'POST',
        headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(errorMessage(data, 'Preview could not be opened'));
      if (typeof data.src !== 'string') throw new Error('Preview URL was not returned');
      setPreviewSrc(data.src);
      setPreviewVersion((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Preview could not be opened');
    } finally {
      setPreviewLoading(false);
    }
  }, [authorization, isPublicDemo]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadContext(), 0);
    return () => window.clearTimeout(timer);
  }, [loadContext]);

  useEffect(() => {
    if (session?.status !== 'ready' || previewSrc) return;
    const timer = window.setTimeout(() => void loadPreview(session.id), 0);
    return () => window.clearTimeout(timer);
  }, [session, previewSrc, loadPreview]);

  useEffect(() => {
    if (session?.status !== 'generating') return;
    const timer = window.setTimeout(() => void loadContext(), 2500);
    return () => window.clearTimeout(timer);
  }, [session, loadContext]);

  const startBuild = async () => {
    if (isPublicDemo || !authorization || starting) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch('/api/build/start', {
        method: 'POST',
        headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId }),
      });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(errorMessage(data, 'The app could not be generated'));
      const nextSession = data.session as unknown as PublicBuildSession;
      const nextBudget = data.budget && typeof data.budget === 'object'
        ? data.budget as BuilderContext['budget']
        : null;
      setSession(nextSession);
      setContext((current) => current ? { ...current, session: nextSession, ...(nextBudget ? { budget: nextBudget } : {}) } : current);
      if (nextSession.status === 'ready') await loadPreview(nextSession.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The app could not be generated');
    } finally {
      setStarting(false);
    }
  };

  const exportSource = async () => {
    if (isPublicDemo || !authorization || !session || session.status !== 'ready' || exporting) return;
    setExporting(true);
    setError(null);
    try {
      const response = await fetch(`/api/build/export?sessionId=${encodeURIComponent(session.id)}`, {
        headers: authorization,
        cache: 'no-store',
      });
      if (!response.ok) {
        const data = await responseJson(response);
        throw new Error(errorMessage(data, 'Source export failed'));
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `${(idea?.title || 'make-money-build').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || 'make-money-build'}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Source export failed');
    } finally {
      setExporting(false);
    }
  };

  const sendInstruction = async () => {
    const message = instruction.trim();
    if (isPublicDemo || !authorization || !session || session.status !== 'ready' || !message || sending) return;
    setSending(true);
    setInstruction('');
    setError(null);
    const localUser: LocalMessage = { id: `local-user-${Date.now()}`, role: 'user', content: message };
    setMessages((current) => [...current, localUser]);
    try {
      const response = await fetch('/api/build/message', {
        method: 'POST',
        headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, message }),
      });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(errorMessage(data, 'The requested change could not be generated'));
      const nextSession = data.session as unknown as PublicBuildSession;
      const assistant = data.message && typeof data.message === 'object'
        ? data.message as Record<string, unknown>
        : {};
      const nextBudget = data.budget && typeof data.budget === 'object'
        ? data.budget as BuilderContext['budget']
        : null;
      setSession(nextSession);
      setContext((current) => current && nextBudget ? { ...current, budget: nextBudget, session: nextSession } : current);
      setMessages((current) => [...current, {
        id: typeof assistant.id === 'string' ? assistant.id : `assistant-${Date.now()}`,
        role: 'assistant',
        content: typeof assistant.content === 'string' && assistant.content.trim()
          ? assistant.content
          : '変更を反映しました。',
      }]);
      await loadPreview(nextSession.id);
    } catch (cause) {
      const messageText = cause instanceof Error ? cause.message : 'The requested change could not be generated';
      setError(messageText);
      setMessages((current) => [...current, {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: `変更に失敗しました: ${messageText}`,
      }]);
    } finally {
      setSending(false);
    }
  };

  if (authLoading) {
    return (
      <main className="flex min-h-screen flex-col bg-term-bg text-term-fg">
        <GlobalHeader currentSection="BUILDER" />
        <div className="term-panel-title"><span className="term-panel-name">試作ワークスペース</span>読み込み中</div>
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-term-label">
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />ログイン状態を確認しています
        </div>
      </main>
    );
  }

  if ((!user || !token) && !isPublicDemo) {
    return (
      <main className="flex min-h-screen flex-col bg-term-bg text-term-fg">
        <GlobalHeader currentSection="BUILDER" />
        <div className="term-panel-title"><span className="term-panel-name">試作ワークスペース</span></div>
        <div className="max-w-xl px-3 py-4">
          <h1 className="text-lg font-semibold text-term-fg-strong">作るにはログインが必要です</h1>
          <p className="mt-2 text-sm leading-relaxed text-term-sub">
            生成したアプリを他のユーザーから分離し、あなたのプロジェクトとして保存するためにログインします。
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="inline-flex min-h-11 items-center rounded-sm border border-term-accent bg-transparent px-4 text-sm text-term-accent hover:bg-term-head lg:min-h-8"
            >
              Googleでログイン
            </button>
            <Link href="/" className="inline-flex min-h-11 items-center px-3 text-sm text-term-sub hover:text-term-fg-strong lg:min-h-8">戻る</Link>
          </div>
        </div>
      </main>
    );
  }

  const spec = context?.buildSpec;
  const idea = context?.idea;
  const isReady = session?.status === 'ready';
  const statusLabel = session
    ? session.status === 'ready' ? '準備完了' : session.status === 'generating' ? '生成中' : session.status === 'error' ? 'エラー' : '下書き'
    : null;
  const smallBtn = 'inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-term-sub hover:text-term-fg-strong disabled:opacity-40 lg:min-h-8';

  return (
    <main className="flex h-dvh min-h-[560px] flex-col overflow-hidden bg-term-bg text-term-fg">
      <GlobalHeader currentSection="BUILDER" />
      <div className="term-panel-title shrink-0">
        <span className="term-panel-name">試作ワークスペース</span>
        {!isPublicDemo && <span className="hidden sm:inline">v0を使用</span>}
        {isPublicDemo && <span className="text-term-muted">公開デモ・閲覧のみ</span>}
        <span className="term-num ml-auto hidden gap-4 sm:flex">
          {context?.budget && (
            <span className="hidden md:inline">本日の残り使用量 <b className="font-normal text-term-fg-strong">{formatCredits(context.budget.remaining)} credits</b></span>
          )}
          {session && (
            <>
              <span>今回の使用量 <b className="font-normal text-term-fg-strong">{formatCredits(session.creditsCost)} credits</b></span>
              <span className={isReady ? 'text-term-fg-strong' : ''}>{statusLabel}</span>
            </>
          )}
        </span>
      </div>
      <header className="flex min-h-11 shrink-0 items-center gap-2 border-b border-term-line bg-term-panel px-2">
        <Link
          href="/"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-term-sub hover:text-term-fg-strong lg:h-8 lg:w-8"
          aria-label="戻る"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        </Link>
        <h1 className="min-w-0 break-words text-sm font-semibold leading-snug text-term-fg-strong">
          {idea?.title || (contextLoading ? 'アイデアを読み込み中…' : 'Build')}
        </h1>
      </header>

      <details className="shrink-0 border-b border-term-line bg-term-panel xl:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 text-sm text-term-fg">
          企画の前提を確認
          <span className="text-xs text-term-label">収益と機能の仮説</span>
        </summary>
        <div className="max-h-48 space-y-3 overflow-y-auto border-t border-term-line-soft px-3 py-3">
          {idea && (
            <>
              <div>
                <div className="text-xs text-term-label">想定する利用者</div>
                <p className="mt-0.5 text-sm leading-5 text-term-sub">{idea.targetPainWallet}</p>
              </div>
              <div className="term-num flex flex-wrap gap-x-5 gap-y-1 text-sm text-term-fg">
                <span>月間利益の仮説: 約{formatYen(idea.projectedMonthlyProfitJpy)}</span>
                <span>利益率の仮説: {idea.operatingMargin}%</span>
              </div>
              {spec && <p className="text-sm leading-5 text-term-sub">試作品の機能: {spec.mvpFeatures.join('、')}</p>}
              {spec && <p className="text-sm leading-5 text-term-sub">使用する技術: {spec.suggestedStack.join('、')}</p>}
              <div className="border-t border-term-line-soft pt-3">
                <div className="text-xs text-term-label">公開前に必要なもの</div>
                <p className="mt-0.5 text-sm leading-5 text-term-sub">
                  これは画面イメージを試すための試作品です。実際に公開して使うには、ログインや権限、決済、利用規約、障害監視、動作確認を別途整える必要があります。
                </p>
              </div>
            </>
          )}
        </div>
      </details>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(320px,28%)_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col border-r border-term-line bg-term-bg xl:flex">
          <div className="term-panel-title"><span className="term-panel-name">企画の前提</span></div>
          <div className="border-b border-term-line">
            {idea && (
              <>
                <div className="border-b border-term-line-soft px-3 py-2">
                  <div className="text-xs text-term-label">想定する利用者</div>
                  <p className="line-clamp-4 text-sm leading-relaxed text-term-fg">{idea.targetPainWallet}</p>
                </div>
                <dl className="grid grid-cols-2">
                  <div className="border-r border-term-line-soft px-3 py-2">
                    <dt className="text-xs text-term-label">月間利益の仮説</dt>
                    <dd className="term-num text-sm text-term-accent">約{formatYen(idea.projectedMonthlyProfitJpy)}/月</dd>
                  </div>
                  <div className="px-3 py-2">
                    <dt className="text-xs text-term-label">利益率の仮説</dt>
                    <dd className="term-num text-sm text-term-fg-strong">{idea.operatingMargin}%</dd>
                  </div>
                </dl>
              </>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {spec ? (
              <>
                <section>
                  <h2 className="border-b border-term-line-soft bg-term-head px-3 py-1 text-xs text-term-label">試作品に含める機能</h2>
                  <ul>
                    {spec.mvpFeatures.map((feature) => (
                      <li key={feature} className="flex gap-2 border-b border-term-line-soft px-3 py-1.5 text-sm leading-relaxed text-term-fg">
                        <CheckCircle2 aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-term-label" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h2 className="border-b border-term-line-soft bg-term-head px-3 py-1 text-xs text-term-label">使用する技術</h2>
                  <ul>
                    {spec.suggestedStack.map((item) => (
                      <li key={item} className="border-b border-term-line-soft px-3 py-1.5 text-sm text-term-fg">{item}</li>
                    ))}
                  </ul>
                </section>
                <details className="border-b border-term-line px-3">
                  <summary className="flex min-h-11 cursor-pointer items-center gap-1.5 text-sm text-term-select-fg lg:min-h-8">
                    <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                    公開前の確認事項
                  </summary>
                  <p className="pb-3 text-sm leading-relaxed text-term-sub">
                    これは画面イメージを試すための試作品です。実際に公開して使うには、ログインや権限、決済、利用規約、障害監視、動作確認を別途整える必要があります。
                  </p>
                </details>
              </>
            ) : contextLoading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-term-label"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />読み込み中</div>
            ) : null}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col bg-term-bg">
          <div className="flex min-h-11 shrink-0 items-center justify-between border-b border-term-line bg-term-head px-3">
            <div className="text-sm text-term-fg">
              {isPublicDemo ? '試作内容' : 'プレビュー'}
              <span className="ml-2 text-xs text-term-label">{previewSrc ? '表示中' : '未生成'}</span>
            </div>
            {isReady && (
              <div className="flex shrink-0 items-center gap-1 sm:gap-3">
                {!isPublicDemo && session && (
                  <Link href={`/marketplace/new?sessionId=${encodeURIComponent(session.id)}`} className={smallBtn}>掲載</Link>
                )}
                <button
                  type="button"
                  onClick={() => void exportSource()}
                  disabled={exporting}
                  aria-label="コードをZIPで保存"
                  className={smallBtn}
                >
                  {exporting ? <LoaderCircle aria-hidden="true" className="h-3 w-3 animate-spin" /> : <Download aria-hidden="true" className="h-3 w-3" />}
                  ZIP保存
                </button>
                <button
                  type="button"
                  onClick={() => session && void loadPreview(session.id)}
                  disabled={previewLoading}
                  aria-label="プレビューを更新"
                  className={smallBtn}
                >
                  <RefreshCcw aria-hidden="true" className={`h-3 w-3 ${previewLoading ? 'animate-spin' : ''}`} />
                  更新
                </button>
              </div>
            )}
          </div>

          <div className="relative min-h-0 flex-1 bg-term-bg">
            {previewSrc ? (
              <>
                <iframe
                  key={previewVersion}
                  src={previewSrc}
                  title="生成アプリのプレビュー"
                  className="h-full w-full border-0 bg-white"
                  sandbox="allow-forms allow-modals allow-popups allow-scripts allow-downloads"
                  referrerPolicy="no-referrer"
                />
                {previewLoading && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center bg-term-bg/60">
                    <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-term-fg-strong" />
                  </div>
                )}
              </>
            ) : (
              <div className="h-full overflow-y-auto px-3 py-4">
                <div className="max-w-2xl">
                  {starting && <LoaderCircle aria-hidden="true" className="mb-3 h-5 w-5 animate-spin text-term-label" />}
                  {!isPublicDemo && <h2 className="text-lg font-semibold text-term-fg-strong">
                    {starting ? '試作品を生成しています' : 'このアイデアで試作品を作る'}
                  </h2>}
                  {!isPublicDemo && <p className="mt-1 text-sm leading-6 text-term-sub">保存した企画メモをもとに、操作できる試作品を生成します。</p>}
                  {isPublicDemo ? (
                    <div>
                      <p className="text-xs text-term-label">試作品に含める機能</p>
                      <ul className="mt-1 text-sm leading-6 text-term-fg">
                        {spec?.mvpFeatures.map((feature, index) => (
                          <li key={feature} className="flex gap-3 border-b border-term-line-soft py-1.5"><span className="term-num text-term-label">{String(index + 1).padStart(2, '0')}</span>{feature}</li>
                        ))}
                      </ul>
                      <p className="mt-4 text-sm leading-5 text-term-label">公開デモでは生成・修正・ZIP保存は利用できません。</p>
                    </div>
                  ) : !context?.providerConfigured && context && (
                    <div className="mt-4 border-l-2 border-term-accent px-3 py-1 text-sm text-term-sub">
                      この環境では生成機能を利用できません。設定が完了するまで、試作品の生成は停止しています。
                    </div>
                  )}
                  {!isPublicDemo && <button
                    type="button"
                    onClick={() => void startBuild()}
                    disabled={isPublicDemo || starting || contextLoading || !context?.providerConfigured}
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm border border-term-accent bg-transparent px-5 text-sm text-term-accent hover:bg-term-head disabled:cursor-not-allowed disabled:opacity-40 lg:min-h-8"
                  >
                    {starting && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                    試作品を生成
                  </button>}
                </div>
              </div>
            )}
          </div>

          {!isPublicDemo && <div className="shrink-0 border-t border-term-line bg-term-panel">
            {error && (
              <div role="alert" className="border-b border-term-line px-3 py-2 text-sm text-term-danger">{error}</div>
            )}
            {messages.length > 0 && (
              <div className="max-h-28 space-y-1.5 overflow-y-auto border-b border-term-line-soft px-3 py-2">
                {messages.slice(-4).map((message) => (
                  <div key={message.id} className="flex gap-2 text-sm">
                    <span className={`shrink-0 text-xs leading-5 ${message.role === 'user' ? 'text-term-label' : 'text-term-accent'}`}>
                      {message.role === 'user' ? 'あなた' : '試作AI'}
                    </span>
                    <span className="line-clamp-2 text-term-sub">{message.content}</span>
                  </div>
                ))}
              </div>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendInstruction();
              }}
              className="flex items-center gap-2 p-2"
            >
              <input
                value={instruction}
                onChange={(event) => setInstruction(event.target.value.slice(0, 4000))}
                disabled={!isReady || sending}
                aria-label="変更したい内容"
                placeholder={isReady ? '変更したい内容を入力' : '試作品の生成後に変更を依頼できます'}
                className="min-h-11 min-w-0 flex-1 rounded-sm border border-term-line bg-term-bg px-3 text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent disabled:cursor-not-allowed lg:min-h-8"
              />
              <button
                type="submit"
                aria-label="変更を依頼"
                disabled={!isReady || sending || !instruction.trim()}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border border-term-accent bg-transparent px-3 text-sm text-term-accent hover:bg-term-head disabled:cursor-not-allowed disabled:opacity-40 lg:min-h-8"
              >
                {sending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
                送信
              </button>
            </form>
          </div>}
        </section>
      </div>

      {!isPublicDemo && <footer className="flex min-h-[22px] shrink-0 items-center justify-between border-t border-term-line bg-term-panel px-3 py-1 text-xs text-term-label">
        <span>試作品の生成・利用には外部サービスを使います。本番公開や運用費は別途です。</span>
        <span className="hidden md:inline">生成ごとの使用量は画面上部に表示します</span>
      </footer>}
    </main>
  );
}
