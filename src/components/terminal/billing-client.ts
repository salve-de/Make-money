import type { BillingStatus } from '@/lib/payments/billing';
import type { PlanId, PlanListing } from '@/lib/payments/plans';

/** 画面で使うプランの呼び名と、支払いの区切り。 */
export const PLAN_LABELS: Record<PlanId, string> = {
  'founding-pass': '創刊版（買い切り）',
  'pro-monthly': '月額プラン',
  'pro-yearly': '年額プラン',
};

export function planPriceText(plan: Pick<PlanListing, 'priceJpy' | 'interval'>): string {
  if (plan.priceJpy === null) return '価格未定';
  const price = `¥${plan.priceJpy.toLocaleString('ja-JP')}`;
  if (plan.interval === 'month') return `${price} / 月`;
  if (plan.interval === 'year') return `${price} / 年`;
  return `${price} 買い切り`;
}

/** 年額を月あたりに直した目安（切り上げ）。 */
export function yearlyMonthlyEquivalent(plan: Pick<PlanListing, 'priceJpy' | 'interval'>): string | null {
  if (plan.interval !== 'year' || plan.priceJpy === null) return null;
  return `月あたり約¥${Math.ceil(plan.priceJpy / 12).toLocaleString('ja-JP')}`;
}

/** 売っているプランを、月額→年額→創刊版の順に並べる（最初の1つを初期選択にする）。 */
export function purchasablePlans(plans: readonly PlanListing[]): PlanListing[] {
  const order: PlanId[] = ['pro-monthly', 'pro-yearly', 'founding-pass'];
  return plans.filter((plan) => plan.available && plan.priceJpy !== null)
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

export async function fetchPlans(): Promise<PlanListing[]> {
  const response = await fetch('/api/billing/plans', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = (await response.json()) as { plans?: PlanListing[] };
  return Array.isArray(body.plans) ? body.plans : [];
}

export async function fetchBillingStatus(token: string): Promise<BillingStatus> {
  const response = await fetch('/api/billing/status', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : '契約状況を確認できません');
  return body as BillingStatus;
}

/** Stripe の契約管理画面（支払い方法の変更・解約）へ移る。 */
export async function openBillingPortal(token: string): Promise<void> {
  const response = await fetch('/api/billing/portal', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json();
  if (!response.ok || typeof body?.url !== 'string') throw new Error(typeof body?.error === 'string' ? body.error : '契約の管理画面を開けませんでした');
  window.location.assign(body.url);
}

export function formatRenewal(status: Pick<BillingStatus, 'renewsAt' | 'cancelAtPeriodEnd'>): string | null {
  if (status.renewsAt === null) return null;
  const date = new Date(status.renewsAt).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric' });
  return status.cancelAtPeriodEnd ? `${date}まで利用できます（更新しません）` : `次回の更新日 ${date}`;
}
