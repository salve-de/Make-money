'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Code2,
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
      <main className="min-h-screen bg-[#07080B] text-zinc-100 flex flex-col">
        <GlobalHeader currentSection="BUILDER" />
        <div className="flex-1 grid place-items-center">
          <LoaderCircle className="w-5 h-5 animate-spin text-emerald-400" />
        </div>
      </main>
    );
  }

  if ((!user || !token) && !isPublicDemo) {
    return (
      <main className="min-h-screen bg-[#07080B] text-zinc-100 flex flex-col">
        <GlobalHeader currentSection="BUILDER" />
        <div className="flex-1 grid place-items-center p-6">
          <div className="w-full max-w-md border border-white/[0.08] bg-[#0D1117] rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg border border-emerald-500/30 bg-emerald-500/10 grid place-items-center mb-4">
              <Code2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-lg font-bold text-white">作るにはログインが必要です</h1>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
              生成したアプリを他のユーザーから分離し、あなたのプロジェクトとして保存するためにログインします。
            </p>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="mt-5 w-full h-10 rounded-lg bg-white text-zinc-950 font-bold text-sm hover:bg-zinc-200 transition-colors"
            >
              Googleでログイン
            </button>
            <Link href="/" className="mt-3 block text-center text-xs text-zinc-500 hover:text-zinc-300">戻る</Link>
          </div>
        </div>
      </main>
    );
  }

  const spec = context?.buildSpec;
  const idea = context?.idea;
  const isReady = session?.status === 'ready';

  return (
    <main className="h-dvh min-h-[560px] bg-[#07080B] text-zinc-100 flex flex-col overflow-hidden">
      <GlobalHeader currentSection="BUILDER" />
      <header className="min-h-14 shrink-0 border-b border-white/[0.08] bg-[#0A0C11] flex items-center justify-between gap-2 px-2 py-2 sm:px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/[0.12] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="戻る"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-emerald-300 font-bold tracking-wider">試作ワークスペース</span>
              {!isPublicDemo && <span className="hidden sm:inline font-mono text-[9px] text-zinc-400 border border-white/[0.12] rounded px-1.5 py-0.5">v0を使用</span>}
              {isPublicDemo && (
                <span className="font-mono text-[9px] text-cyan-200 border border-cyan-400/25 bg-cyan-400/[0.08] rounded px-1.5 py-0.5">公開デモ・閲覧のみ</span>
              )}
            </div>
            <h1 className="max-w-[54vw] break-words text-sm font-bold leading-snug text-white sm:max-w-none">
              {idea?.title || (contextLoading ? 'アイデアを読み込み中…' : 'Build')}
            </h1>
          </div>
        </div>
        <div className="hidden items-center gap-3 font-mono text-[10px] text-zinc-500 sm:flex">
          {context?.budget && (
            <span className="hidden md:inline">本日の残り使用量: <b className="text-zinc-300">{formatCredits(context.budget.remaining)} credits</b></span>
          )}
          {session && (
            <>
              <span className="hidden sm:inline">今回の使用量: <b className="text-zinc-300">{formatCredits(session.creditsCost)} credits</b></span>
              <span className={`rounded border px-2 py-1 ${isReady ? 'border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-200' : 'border-white/[0.12] text-zinc-300'}`}>
                {session.status === 'ready' ? '準備完了' : session.status === 'generating' ? '生成中' : session.status === 'error' ? 'エラー' : '下書き'}
              </span>
            </>
          )}
        </div>
      </header>

      <details className="shrink-0 border-b border-white/[0.08] bg-[#10151a] xl:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between px-4 text-sm font-medium text-zinc-200">
          企画の前提を確認
          <span className="text-xs text-zinc-400">収益と機能の仮説</span>
        </summary>
        <div className="max-h-48 space-y-3 overflow-y-auto border-t border-white/[0.08] px-4 py-3">
          {idea && (
            <>
              <div>
                <div className="text-xs font-medium text-zinc-300">想定する利用者</div>
                <p className="mt-1 text-sm leading-5 text-zinc-400">{idea.targetPainWallet}</p>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-300">
                <span>月間利益の仮説: ¥{idea.projectedMonthlyProfitJpy.toLocaleString('ja-JP')}</span>
                <span>利益率の仮説: {idea.operatingMargin}%</span>
              </div>
              {spec && <p className="text-xs leading-5 text-zinc-400">試作品の機能: {spec.mvpFeatures.join('、')}</p>}
              {spec && <p className="text-xs leading-5 text-zinc-400">使用する技術: {spec.suggestedStack.join('、')}</p>}
              <div className="border-t border-white/[0.1] pt-3">
                <div className="text-xs font-medium text-zinc-300">公開前に必要なもの</div>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  これは画面イメージを試すための試作品です。実際に公開して使うには、ログインや権限、決済、利用規約、障害監視、動作確認を別途整える必要があります。
                </p>
              </div>
            </>
          )}
        </div>
      </details>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(320px,28%)_minmax(0,1fr)]">
        <aside className="hidden xl:flex flex-col min-h-0 border-r border-white/[0.08] bg-[#0B0E14]">
          <div className="p-4 border-b border-white/[0.08]">
            <div className="mb-3 text-xs font-semibold text-zinc-200">
              企画の前提
            </div>
            {idea && (
              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-xs font-medium text-zinc-300">想定する利用者</div>
                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4">{idea.targetPainWallet}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-white/[0.07] bg-white/[0.02] rounded p-2.5">
                    <div className="text-xs text-zinc-400">月間利益の仮説</div>
                    <div className="text-xs font-bold text-zinc-200 mt-0.5">¥{idea.projectedMonthlyProfitJpy.toLocaleString('ja-JP')}/月</div>
                  </div>
                  <div className="border border-white/[0.07] bg-white/[0.02] rounded p-2.5">
                    <div className="text-xs text-zinc-400">利益率の仮説</div>
                    <div className="text-xs font-bold text-zinc-200 mt-0.5">{idea.operatingMargin}%</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
            {spec ? (
              <>
                <section>
                  <div className="mb-2 text-xs font-medium text-zinc-300">試作品に含める機能</div>
                  <ul className="space-y-2">
                    {spec.mvpFeatures.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm text-zinc-300 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <div className="mb-2 text-xs font-medium text-zinc-300">使用する技術</div>
                  <div className="flex flex-wrap gap-1.5">
                    {spec.suggestedStack.map((item) => (
                    <span key={item} className="rounded border border-white/[0.1] bg-white/[0.03] px-2 py-1 text-xs text-zinc-300">{item}</span>
                    ))}
                  </div>
                </section>
                <details className="rounded-lg border border-white/[0.12] bg-[#111923] p-3">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-zinc-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    公開前の確認事項
                  </summary>
                  <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
                    これは画面イメージを試すための試作品です。実際に公開して使うには、ログインや権限、決済、利用規約、障害監視、動作確認を別途整える必要があります。
                  </p>
                </details>
              </>
            ) : contextLoading ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500"><LoaderCircle className="w-4 h-4 animate-spin" />読み込み中</div>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0 min-h-0 flex flex-col bg-[#090B10]">
          <div className="min-h-11 shrink-0 border-b border-white/[0.07] bg-[#0C0F15] flex items-center justify-between px-3">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <span className={`h-2 w-2 rounded-full ${previewSrc ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
              {isPublicDemo ? '試作内容' : 'プレビュー'}
            </div>
            {isReady && (
              <div className="flex shrink-0 items-center gap-1 sm:gap-3">
                <button
                  type="button"
                  onClick={() => void exportSource()}
                  disabled={exporting}
                  aria-label="コードをZIPで保存"
                  className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-zinc-300 hover:text-white disabled:opacity-40"
                >
                  {exporting ? <LoaderCircle className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  ZIP保存
                </button>
                <button
                  type="button"
                  onClick={() => session && void loadPreview(session.id)}
                  disabled={previewLoading}
                  aria-label="プレビューを更新"
                  className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-zinc-300 hover:text-white disabled:opacity-40"
                >
                  <RefreshCcw className={`w-3 h-3 ${previewLoading ? 'animate-spin' : ''}`} />
                  更新
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 relative bg-[#050608]">
            {previewSrc ? (
              <>
                <iframe
                  key={previewVersion}
                  src={previewSrc}
                  title="生成アプリのプレビュー"
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-forms allow-modals allow-popups allow-scripts allow-downloads"
                  referrerPolicy="no-referrer"
                />
                {previewLoading && (
                  <div className="absolute inset-0 bg-black/30 grid place-items-center pointer-events-none">
                    <LoaderCircle className="w-5 h-5 animate-spin text-white" />
                  </div>
                )}
              </>
            ) : (
              <div className="h-full overflow-y-auto p-5 sm:p-8">
                <div className={`mx-auto max-w-2xl ${isPublicDemo ? '' : 'border-t border-white/[0.12] pt-6'}`}>
                  {starting && <LoaderCircle className="mb-3 h-5 w-5 animate-spin text-zinc-400" />}
                  {!isPublicDemo && <h2 className="text-xl font-semibold text-white">
                    {starting ? '試作品を生成しています' : 'このアイデアで試作品を作る'}
                  </h2>}
                  {!isPublicDemo && <p className="mt-2 text-sm leading-6 text-zinc-300">保存した企画メモをもとに、操作できる試作品を生成します。</p>}
                  {isPublicDemo ? (
                    <div>
                      <p className="text-xs font-semibold text-zinc-400">試作品に含める機能</p>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-zinc-100">
                        {spec?.mvpFeatures.map((feature, index) => (
                          <li key={feature} className="flex gap-3"><span className="font-mono text-sky-200">{String(index + 1).padStart(2, '0')}</span>{feature}</li>
                        ))}
                      </ul>
                      <p className="mt-5 text-xs leading-5 text-zinc-400">公開デモでは生成・修正・ZIP保存は利用できません。</p>
                    </div>
                  ) : !context?.providerConfigured && context && (
                    <div className="mt-4 text-xs text-amber-300 border border-amber-500/20 bg-amber-500/[0.06] rounded-lg p-3">
                      この環境では生成機能を利用できません。設定が完了するまで、試作品の生成は停止しています。
                    </div>
                  )}
                  {!isPublicDemo && <button
                    type="button"
                    onClick={() => void startBuild()}
                    disabled={isPublicDemo || starting || contextLoading || !context?.providerConfigured}
                    className="mt-5 min-h-11 px-5 rounded-lg bg-emerald-300 hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm inline-flex items-center gap-2"
                  >
                    {starting && <LoaderCircle className="w-4 h-4 animate-spin" />}
                    試作品を生成
                  </button>}
                </div>
              </div>
            )}
          </div>

          {!isPublicDemo && <div className="shrink-0 border-t border-white/[0.08] bg-[#0B0E14]">
            {error && (
              <div className="px-4 py-2 text-xs text-red-300 border-b border-red-500/10 bg-red-500/[0.04]">{error}</div>
            )}
            {messages.length > 0 && (
              <div className="max-h-28 overflow-y-auto px-4 py-2 space-y-1.5 border-b border-white/[0.06]">
                {messages.slice(-4).map((message) => (
                <div key={message.id} className="flex gap-2 text-sm">
                    <span className={`font-mono shrink-0 ${message.role === 'user' ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {message.role === 'user' ? 'YOU' : 'BUILDER'}
                    </span>
                    <span className="text-zinc-400 line-clamp-2">{message.content}</span>
                  </div>
                ))}
              </div>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendInstruction();
              }}
              className="p-3 flex items-center gap-2"
            >
              <div className="flex min-h-11 flex-1 min-w-0 items-center rounded-lg border border-white/[0.14] bg-[#07090D] px-3 focus-within:border-emerald-300/60">
                <input
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value.slice(0, 4000))}
                  disabled={!isReady || sending}
                  placeholder={isReady ? '変更したい内容を入力' : '試作品の生成後に変更を依頼できます'}
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white placeholder:text-zinc-600 disabled:cursor-not-allowed"
                />
              </div>
              <button
                type="submit"
                aria-label="変更を依頼"
                disabled={!isReady || sending || !instruction.trim()}
                className="min-h-11 shrink-0 whitespace-nowrap px-3 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm inline-flex items-center gap-1.5"
              >
                {sending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                送信
              </button>
            </form>
          </div>}
        </section>
      </div>

      {!isPublicDemo && <footer className="min-h-8 shrink-0 border-t border-white/[0.08] bg-[#080A0E] px-4 py-1.5 flex items-center justify-between text-xs text-zinc-400">
        <span>試作品の生成・利用には外部サービスを使います。本番公開や運用費は別途です。</span>
        <span className="hidden md:inline">生成ごとの使用量は画面上部に表示します</span>
      </footer>}
    </main>
  );
}
