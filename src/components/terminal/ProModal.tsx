'use client';

import { useModalFocus } from '@/platform/hooks/useModalFocus';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { FOUNDING_PASS } from '@/lib/payments/founding-pass';
import type { BillingStatus } from '@/lib/payments/billing';
import type { PlanId, PlanListing } from '@/lib/payments/plans';
import {
  PLAN_LABELS, fetchBillingStatus, fetchPlans, formatRenewal, openBillingPortal, planPriceText, purchasablePlans, yearlyMonthlyEquivalent,
} from './billing-client';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// プラン一覧を読めないときは、これまでどおり創刊版だけを出す
const FALLBACK_PLANS: PlanListing[] = [{ id: FOUNDING_PASS.id, name: FOUNDING_PASS.name, priceJpy: FOUNDING_PASS.priceJpy, interval: 'once', available: true }];

export const ProModal: React.FC<ProModalProps> = ({ isOpen, onClose }) => {
  const { user, isPro } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanListing[] | null>(null);
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [status, setStatus] = useState<BillingStatus | null>(null);

  const { dialogRef, onKeyDown } = useModalFocus(isOpen && !showAuth, onClose);

  useEffect(() => {
    if (!isOpen || plans) return;
    let cancelled = false;
    fetchPlans()
      .then((listed) => { if (!cancelled) setPlans(purchasablePlans(listed)); })
      .catch(() => { if (!cancelled) setPlans(FALLBACK_PLANS); });
    return () => { cancelled = true; };
  }, [isOpen, plans]);

  useEffect(() => {
    if (!isOpen || !user || !isPro) return;
    let cancelled = false;
    user.getIdToken()
      .then(fetchBillingStatus)
      .then((value) => { if (!cancelled) setStatus(value); })
      .catch(() => { if (!cancelled) setStatus(null); });
    return () => { cancelled = true; };
  }, [isOpen, user, isPro]);

  if (!isOpen) return null;

  const choice = plans?.find((plan) => plan.id === selected) ?? plans?.[0] ?? null;

  const handleCheckout = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!choice) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ product: choice.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || '決済画面を開始できませんでした');
      window.location.assign(result.url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '決済画面を開始できませんでした');
      setIsLoading(false);
    }
  };

  const handlePortal = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await openBillingPortal(await user.getIdToken());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '契約の管理画面を開けませんでした');
      setIsLoading(false);
    }
  };

  const recurring = choice?.interval === 'month' || choice?.interval === 'year';
  const renewal = status ? formatRenewal(status) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div role="dialog" aria-modal="true" aria-labelledby="plan-title" ref={dialogRef} onKeyDown={onKeyDown} className="max-h-[90dvh] w-full max-w-md overflow-y-auto border border-term-line bg-term-panel text-term-fg shadow-lg">
        <div className="term-panel-title">
          <h2 id="plan-title" className="term-panel-name text-xs">PRO</h2>
          <button type="button" onClick={onClose} className="ml-auto flex min-h-11 items-center px-2 text-xs text-term-muted hover:text-term-fg-strong lg:min-h-6">閉じる</button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm text-term-fg">事業構造12項目の詳細分析（財務・出典は無料）</p>

          {isPro ? (
            <section aria-label="契約の状態" className="space-y-2 border-y border-term-line py-3 text-sm">
              <p className="text-term-fg-strong">PRO を利用中{status?.plan ? `（${PLAN_LABELS[status.plan]}）` : ''}</p>
              {renewal && <p className="term-num text-xs text-term-sub">{renewal}</p>}
              {status?.canManage && (
                <button type="button" onClick={handlePortal} disabled={isLoading} className="min-h-11 w-full rounded-sm border border-term-line px-3 text-sm text-term-fg hover:bg-term-head disabled:opacity-60 lg:min-h-8">
                  {isLoading ? '契約の管理画面を開いています…' : '契約の管理（支払い方法の変更・解約）'}
                </button>
              )}
            </section>
          ) : !plans ? (
            <p className="text-sm text-term-muted">プランを読み込んでいます…</p>
          ) : plans.length === 0 ? (
            <p className="text-sm leading-6 text-term-muted">いまは購入を受け付けていません。決済の準備が整うと、ここにプランと価格が出ます。</p>
          ) : (
            <>
              <fieldset className="border-y border-term-line py-2">
                <legend className="sr-only">プランを選ぶ</legend>
                {plans.map((plan) => (
                  <label key={plan.id} className={`flex min-h-11 cursor-pointer items-center gap-3 px-1 text-sm hover:bg-term-head lg:min-h-9 ${choice?.id === plan.id ? 'text-term-fg-strong' : 'text-term-fg'}`}>
                    <input type="radio" name="pro-plan" value={plan.id} checked={choice?.id === plan.id} onChange={() => setSelected(plan.id)} className="h-4 w-4 accent-[var(--term-accent)]" />
                    <span className="min-w-0 flex-1">{PLAN_LABELS[plan.id]}</span>
                    <span className="term-num text-right">
                      {planPriceText(plan)}
                      {yearlyMonthlyEquivalent(plan) && <span className="block text-xs text-term-label">{yearlyMonthlyEquivalent(plan)}</span>}
                    </span>
                  </label>
                ))}
              </fieldset>
              <button type="button" onClick={handleCheckout} disabled={isLoading || !choice} className="min-h-11 w-full rounded-sm bg-term-accent px-3 text-sm font-semibold text-term-bg hover:opacity-90 disabled:opacity-60">
                {isLoading ? '決済画面を準備中…' : choice ? `購入する（${planPriceText(choice)}）` : '購入する'}
              </button>
              <p className="text-xs leading-5 text-term-label">
                {recurring
                  ? '月額・年額は、解約するまで同じ金額で自動更新されます。解約は購入後の「契約の管理」からいつでもでき、次回の更新日以降は請求されません。'
                  : '創刊版は1回のお支払いで、自動更新・月額請求はありません。'}
              </p>
            </>
          )}
          {errorMessage && <p role="alert" className="text-sm text-term-danger">{errorMessage}</p>}
          <p className="text-xs leading-5 text-term-label">購入後はログインしたアカウントに反映されます。</p>
          <p className="text-xs leading-5 text-term-label">
            購入前に<Link href="/legal/tokushoho" className="mx-0.5 text-term-sub underline hover:text-term-fg-strong">特定商取引法に基づく表記</Link>と<Link href="/legal/terms" className="mx-0.5 text-term-sub underline hover:text-term-fg-strong">利用規約</Link>をご確認ください。
          </p>
        </div>
      </div>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};
