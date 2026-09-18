'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Code2,
  LoaderCircle,
  RefreshCcw,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { SynthesizedIdea } from '@/shared/terminal';
import type { BuildSpec } from '@/lib/builder/spec';

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
}

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
  const [context, setContext] = useState<BuilderContext | null>(null);
  const [session, setSession] = useState<PublicBuildSession | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
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
    if (!authorization) return;
    setContextLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/build/context?ideaId=${encodeURIComponent(ideaId)}`, {
        headers: authorization,
        cache: 'no-store',
      });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(errorMessage(data, 'Builder context could not be loaded'));
      const typed = data as unknown as BuilderContext;
      setContext(typed);
      setSession(typed.session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Builder context could not be loaded');
    } finally {
      setContextLoading(false);
    }
  }, [authorization, ideaId]);

  const loadPreview = useCallback(async (sessionId: string) => {
    if (!authorization) return;
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
  }, [authorization]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (session?.status === 'ready' && !previewSrc) {
      void loadPreview(session.id);
    }
  }, [session, previewSrc, loadPreview]);

  const startBuild = async () => {
    if (!authorization || starting) return;
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
      setSession(nextSession);
      setContext((current) => current ? { ...current, session: nextSession } : current);
      if (nextSession.status === 'ready') await loadPreview(nextSession.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The app could not be generated');
    } finally {
      setStarting(false);
    }
  };

  const sendInstruction = async () => {
    const message = instruction.trim();
    if (!authorization || !session || session.status !== 'ready' || !message || sending) return;
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
      setSession(nextSession);
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
      <main className="min-h-screen bg-[#07080B] text-zinc-100 grid place-items-center">
        <LoaderCircle className="w-5 h-5 animate-spin text-emerald-400" />
      </main>
    );
  }

  if (!user || !token) {
    return (
      <main className="min-h-screen bg-[#07080B] text-zinc-100 grid place-items-center p-6">
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
      </main>
    );
  }

  const spec = context?.buildSpec;
  const idea = context?.idea;
  const isReady = session?.status === 'ready';

  return (
    <main className="h-screen min-h-[680px] bg-[#07080B] text-zinc-100 flex flex-col overflow-hidden">
      <header className="h-14 shrink-0 border-b border-white/[0.08] bg-[#0A0C11] flex items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="w-8 h-8 rounded-md border border-white/[0.08] hover:bg-white/[0.06] grid place-items-center text-zinc-400 hover:text-white"
            aria-label="戻る"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-emerald-400 font-bold tracking-wider">MAKE-MONEY BUILDER</span>
              <span className="font-mono text-[9px] text-zinc-500 border border-white/[0.08] rounded px-1.5 py-0.5">v0 engine</span>
            </div>
            <h1 className="text-sm font-bold text-white truncate max-w-[54vw]">
              {idea?.title || (contextLoading ? 'アイデアを読み込み中…' : 'Build')}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-500">
          {session && (
            <>
              <span className="hidden sm:inline">生成原価: <b className="text-zinc-300">{formatCredits(session.creditsCost)} credits</b></span>
              <span className={`px-2 py-1 rounded border ${isReady ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-white/[0.08] text-zinc-400'}`}>
                {session.status.toUpperCase()}
              </span>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="hidden lg:flex flex-col min-h-0 border-r border-white/[0.08] bg-[#0B0E14]">
          <div className="p-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-zinc-400 tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              BUILD SPEC
            </div>
            {idea && (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 mb-1">狙う財布</div>
                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4">{idea.targetPainWallet}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-white/[0.07] bg-white/[0.02] rounded p-2.5">
                    <div className="text-[9px] font-mono text-zinc-500">利益仮説</div>
                    <div className="text-xs font-bold text-zinc-200 mt-0.5">¥{idea.projectedMonthlyProfitJpy.toLocaleString('ja-JP')}/月</div>
                  </div>
                  <div className="border border-white/[0.07] bg-white/[0.02] rounded p-2.5">
                    <div className="text-[9px] font-mono text-zinc-500">利益率仮説</div>
                    <div className="text-xs font-bold text-zinc-200 mt-0.5">{idea.operatingMargin}%</div>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-600">※ 上記は実績ではなく、元アイデアに保存された検証前の仮説値です。</p>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
            {spec ? (
              <>
                <section>
                  <div className="text-[10px] font-mono text-zinc-500 mb-2">MVP機能</div>
                  <ul className="space-y-2">
                    {spec.mvpFeatures.map((feature) => (
                      <li key={feature} className="flex gap-2 text-[11px] text-zinc-300 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <div className="text-[10px] font-mono text-zinc-500 mb-2">生成スタック</div>
                  <div className="flex flex-wrap gap-1.5">
                    {spec.suggestedStack.map((item) => (
                      <span key={item} className="text-[10px] font-mono border border-white/[0.07] bg-white/[0.03] text-zinc-400 rounded px-2 py-1">{item}</span>
                    ))}
                  </div>
                </section>
                <section className="border border-blue-500/15 bg-blue-500/[0.04] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-blue-300 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    公開前に必要
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    このMVPは生成・プレビュー用です。本番公開では実キー、権限、決済Webhook、利用規約、監視、自動テストを別途確認します。
                  </p>
                </section>
              </>
            ) : contextLoading ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500"><LoaderCircle className="w-4 h-4 animate-spin" />読み込み中</div>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0 min-h-0 flex flex-col bg-[#090B10]">
          <div className="h-10 shrink-0 border-b border-white/[0.07] bg-[#0C0F15] flex items-center justify-between px-3">
            <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              LIVE PREVIEW
            </div>
            {isReady && (
              <button
                type="button"
                onClick={() => session && void loadPreview(session.id)}
                disabled={previewLoading}
                className="inline-flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 hover:text-white disabled:opacity-40"
              >
                <RefreshCcw className={`w-3 h-3 ${previewLoading ? 'animate-spin' : ''}`} />
                再読込
              </button>
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
              <div className="h-full grid place-items-center p-6">
                <div className="max-w-lg text-center">
                  <div className="w-14 h-14 mx-auto rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] grid place-items-center mb-4">
                    {starting ? <LoaderCircle className="w-6 h-6 text-emerald-400 animate-spin" /> : <Rocket className="w-6 h-6 text-emerald-400" />}
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {starting ? 'MVPを生成しています' : 'このアイデアを動くMVPにする'}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                    市場データから作ったBuild Specを使い、主要導線が触れるWebサービスを生成します。
                    外部ビルダーへ移動せず、この画面にプレビューします。
                  </p>
                  {!context?.providerConfigured && context && (
                    <div className="mt-4 text-xs text-amber-300 border border-amber-500/20 bg-amber-500/[0.06] rounded-lg p-3">
                      現在の環境では生成エンジンが未設定です。サーバー側のV0_API_KEY設定後に実生成できます。
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => void startBuild()}
                    disabled={starting || contextLoading || !context?.providerConfigured}
                    className="mt-5 h-10 px-5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm inline-flex items-center gap-2"
                  >
                    {starting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    MVPを生成
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/[0.08] bg-[#0B0E14]">
            {error && (
              <div className="px-4 py-2 text-xs text-red-300 border-b border-red-500/10 bg-red-500/[0.04]">{error}</div>
            )}
            {messages.length > 0 && (
              <div className="max-h-28 overflow-y-auto px-4 py-2 space-y-1.5 border-b border-white/[0.06]">
                {messages.slice(-4).map((message) => (
                  <div key={message.id} className="flex gap-2 text-[11px]">
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
              <div className="flex items-center gap-2 flex-1 min-w-0 h-10 rounded-lg border border-white/[0.1] bg-[#07090D] px-3 focus-within:border-emerald-500/40">
                <Bot className="w-4 h-4 text-zinc-500 shrink-0" />
                <input
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value.slice(0, 4000))}
                  disabled={!isReady || sending}
                  placeholder={isReady ? '例: 料金を月4,980円にして、初回オンボーディングを3ステップにして' : 'MVP生成後、ここからそのまま修正できます'}
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white placeholder:text-zinc-600 disabled:cursor-not-allowed"
                />
              </div>
              <button
                type="submit"
                disabled={!isReady || sending || !instruction.trim()}
                className="h-10 px-4 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs inline-flex items-center gap-1.5"
              >
                {sending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                修正
              </button>
            </form>
          </div>
        </section>
      </div>

      <footer className="h-7 shrink-0 border-t border-white/[0.06] bg-[#080A0E] px-4 flex items-center justify-between font-mono text-[9px] text-zinc-600">
        <span>生成: Make-Money → v0 Platform API / 本番インフラ費は公開時に分離</span>
        <span className="hidden md:flex items-center gap-1">
          <CircleDollarSign className="w-3 h-3" />
          provider credits are measured per generation
        </span>
      </footer>
    </main>
  );
}
