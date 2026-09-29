'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import type { FinancialEntity } from '@/shared/terminal';
import { STRIPE_READ_PERMISSIONS, type VerifiedRevenue } from '@/shared/verification';
import { isSharedSiteDomain, siteDomain } from '@/lib/verification/site-domain';
import { loadEntityDetail } from '@/platform/hooks/entity-detail-loader';
import { refreshVerifiedEntityIds } from '@/platform/hooks/useVerifiedEntityIds';
import { readVerificationError, readVerifiedRevenue, verifiedRevenueRows } from '@/platform/model/verified-revenue-view';

type Loaded = { entityId: string; entity: FinancialEntity | null; failed: boolean };
type SubmitState =
  | { status: 'idle' | 'sending' }
  | { status: 'verified'; verification: VerifiedRevenue }
  | { status: 'error'; message: string; permissions?: readonly string[] };

const BTN = 'inline-flex min-h-11 items-center justify-center rounded-sm border px-4 text-sm lg:min-h-8';

/** 事例の運営者が、Stripeの読み取り専用キーで実際の売上を確認する画面。キーは送信したら入力欄から消し、どこにも残さない。 */
export function VerifyRevenueView({ entityId }: { entityId: string | null }) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [key, setKey] = useState('');
  const [state, setState] = useState<SubmitState>({ status: 'idle' });
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;
    loadEntityDetail(entityId)
      .then((entity) => { if (!cancelled) setLoaded({ entityId, entity, failed: false }); })
      .catch(() => { if (!cancelled) setLoaded({ entityId, entity: null, failed: true }); });
    return () => { cancelled = true; };
  }, [entityId]);

  if (!entityId) {
    return (
      <Notice title="確認する事例が指定されていません">
        事例の詳細の「出典」にある「決済データで売上を確認する」から開いてください。
      </Notice>
    );
  }
  const current = loaded?.entityId === entityId ? loaded : null;
  if (!current) return <p className="px-3 py-4 text-sm text-term-muted">読み込み中…</p>;
  if (!current.entity) {
    return <Notice title={current.failed ? '事例を読み込めませんでした' : '事例が見つかりません'}>時間をおいてから、もう一度開いてください。</Notice>;
  }
  const entity = current.entity;
  const domain = siteDomain(entity.url);
  const checkable = Boolean(domain && !isSharedSiteDomain(domain));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) { setShowAuth(true); return; }
    const restrictedKey = key.trim();
    // 成功でも失敗でも、送った時点で入力欄からキーを消す
    setKey('');
    if (!restrictedKey) return;
    setState({ status: 'sending' });
    try {
      const response = await fetch('/api/verification/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ entityId: entity.id, restrictedKey }),
        cache: 'no-store',
      });
      const body: unknown = await response.json().catch(() => null);
      const verification = response.ok ? readVerifiedRevenue((body as { verification?: unknown } | null)?.verification) : null;
      if (verification) {
        refreshVerifiedEntityIds();
        setState({ status: 'verified', verification });
        return;
      }
      if (response.status === 401) setShowAuth(true);
      const failure = readVerificationError(body, '確認できませんでした。時間をおいてから、もう一度お試しください');
      setState({ status: 'error', message: failure.error, permissions: failure.permissions });
    } catch {
      setState({ status: 'error', message: '通信できませんでした。接続を確かめて、もう一度お試しください' });
    }
  };

  return (
    <>
      <section aria-label="確認する事例" className="border-b border-term-line px-3 py-3 text-sm">
        <p className="text-xs text-term-label">確認する事例</p>
        <p className="mt-0.5 font-semibold text-term-fg-strong">{entity.name}</p>
        <p className="text-xs text-term-sub">公式サイト: <span className="term-num">{domain ?? '登録なし'}</span></p>
        {!checkable && (
          <p role="alert" className="mt-2 text-xs text-term-danger">
            {domain ? 'この事例の公式サイトは共有サービス上のページのため、決済アカウントのサイトとの一致では持ち主を確認できません。' : 'この事例には公式サイトが登録されていないため、決済アカウントと照合できません。'}
          </p>
        )}
      </section>

      {state.status === 'verified' ? (
        <section aria-label="確認の結果" className="px-3 py-3 text-sm">
          <p role="status" className="text-term-positive">確認できました。一覧と詳細に「決済確認」と表示されます。</p>
          <dl className="mt-2 max-w-xl">
            {verifiedRevenueRows(state.verification).map((row) => (
              <div key={row.label} className="flex min-h-[30px] items-center justify-between gap-3 border-b border-term-line-soft py-1">
                <dt className="shrink-0 text-xs text-term-label">{row.label}</dt>
                <dd className={`term-num min-w-0 truncate text-right ${row.confirmed ? 'text-term-fg-strong' : 'font-sans text-xs text-term-dim'}`}>{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-term-label">使ったキーは保存していません。Stripeでこのキーを削除してかまいません。</p>
          <Link href={`/?entity=${encodeURIComponent(entity.id)}`} className={`${BTN} mt-3 border-term-line text-term-fg hover:bg-term-head`}>事例の詳細へ戻る</Link>
        </section>
      ) : checkable ? (
        <section aria-label="確認の手順" className="px-3 py-3 text-sm">
          <ol className="max-w-2xl list-decimal space-y-1.5 pl-5 text-term-fg">
            <li>Stripeのダッシュボードで「開発者」→「APIキー」を開き、「制限付きキーを作成」を選びます。</li>
            <li>権限は「{STRIPE_READ_PERMISSIONS.join('」「')}」の3つだけを「読み取り」にします。書き込みの権限は付けません。</li>
            <li>Stripeのビジネス設定のWebサイトに、<span className="term-num">{domain}</span> が登録されていることを確かめます。</li>
            <li>作ったキー（rk_ で始まるキー）を下に貼り付けて、「確認する」を押します。</li>
          </ol>
          <form onSubmit={submit} aria-label="制限付きキーで確認" className="mt-3 max-w-xl space-y-2">
            <label className="block space-y-1">
              <span className="text-xs text-term-label">制限付きキー</span>
              <input
                type="password"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                placeholder="rk_live_…"
                className="h-11 w-full rounded-sm border border-term-line bg-term-bg px-2 font-mono text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent lg:h-8"
              />
            </label>
            <button type="submit" disabled={state.status === 'sending' || (Boolean(user) && !key.trim())} className={`${BTN} border-term-accent text-term-accent hover:bg-term-head disabled:opacity-60`}>
              {!user ? 'ログインして確認する' : state.status === 'sending' ? '確認しています…' : '確認する'}
            </button>
            {state.status === 'error' && (
              <div role="alert" className="text-xs text-term-danger">
                <p>{state.message}</p>
                {state.permissions && state.permissions.length > 0 && (
                  <p className="mt-1 text-term-fg">付ける権限（すべて読み取り）: {state.permissions.join('・')}</p>
                )}
              </div>
            )}
          </form>
          <ul className="mt-3 max-w-2xl space-y-1 text-xs leading-5 text-term-label">
            <li>キーはこの確認に1回だけ使い、保存もログへの記録もしません。送った時点で入力欄から消えます。</li>
            <li>読むのは、直近30日の売上（返金を引いた額）、有効な契約の件数と月額の合計、決済アカウントのサイトと通貨だけです。顧客やカードの情報は読みません。</li>
            <li>同じ事例の確認は、1時間に1回までです。</li>
          </ul>
        </section>
      ) : null}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-3 py-4 text-sm">
      <p className="text-term-fg-strong">{title}</p>
      <p className="mt-1 text-term-sub">{children}</p>
      <Link href="/" className={`${BTN} mt-3 border-term-line text-term-fg hover:bg-term-head`}>事例一覧へ</Link>
    </section>
  );
}
