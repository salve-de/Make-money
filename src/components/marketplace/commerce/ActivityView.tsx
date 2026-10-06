'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/context/AuthContext';
import {
  REFERRAL_NOTE_LABELS,
  formatExactYen,
  type CommerceActivity,
  type CommerceOrderView,
  type CommercePaymentMode,
} from '@/shared/marketplace-commerce';
import { CommerceRequestError, commerceRequest } from './commerce-client';

const BTN = 'inline-flex min-h-11 items-center justify-center gap-2 border px-3 text-sm disabled:opacity-50 lg:min-h-6';
const ROW = 'grid grid-cols-1 gap-x-3 gap-y-0.5 border-b border-term-line-soft px-3 py-2 text-sm';

function dateText(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-b border-term-line">
      <h2 id={id} className="flex items-baseline gap-3 border-b border-term-line bg-term-head px-3 py-1.5 text-xs text-term-label">
        <span className="text-term-fg-strong">{title}</span>{note && <span>{note}</span>}
      </h2>
      {children}
    </section>
  );
}

/** PCだけに出す表見出し。スマホでは各行に項目名を添える。 */
function Head({ columns, labels }: { columns: string; labels: string[] }) {
  return (
    <div aria-hidden="true" className={`hidden h-[26px] items-center gap-x-3 border-b border-term-line bg-term-head px-3 text-xs text-term-label lg:grid ${columns}`}>
      {labels.map((label, index) => <span key={index} className={label.startsWith('>') ? 'text-right' : undefined}>{label.replace(/^>/, '')}</span>)}
    </div>
  );
}

function Empty({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="px-3 py-3 text-sm">
      <p className="text-term-fg-strong">{title}</p>
      <p className="mt-1 text-xs leading-5 text-term-label">{hint}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ActivityView() {
  const { user, token, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [data, setData] = useState<{ activity: CommerceActivity; mode: CommercePaymentMode } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !token) return;
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        setData(await commerceRequest<{ activity: CommerceActivity; mode: CommercePaymentMode }>('/api/marketplace/commerce/activity', token, { signal: controller.signal }));
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '取引の記録を読み込めませんでした');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [authLoading, token, reload]);

  const refund = useCallback(async (orderId: string) => {
    if (!token || refunding) return;
    setRefunding(orderId);
    setActionError(null);
    try {
      await commerceRequest(`/api/marketplace/commerce/orders/${encodeURIComponent(orderId)}/refund`, token, { method: 'POST' });
      setReload((value) => value + 1);
    } catch (cause) {
      setActionError(cause instanceof CommerceRequestError ? cause.message : '取り消しを記録できませんでした');
    } finally {
      setRefunding(null);
    }
  }, [token, refunding]);

  if (authLoading || (user && loading && !data)) {
    return <div role="status" className="flex items-center gap-2 px-3 py-4 text-sm text-term-label"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />取引の記録を読み込み中…</div>;
  }
  if (!user) {
    return (
      <section className="px-3 py-4 text-sm">
        <p className="text-term-fg-strong">ログインすると取引と紹介の成果を確認できます</p>
        <p className="mt-1 text-xs text-term-label">自分の掲載、購入、販売、紹介リンクだけが表示されます。</p>
        <button type="button" onClick={() => setAuthOpen(true)} className={`${BTN} mt-3 rounded-sm border-term-accent text-term-accent hover:bg-term-head`}>ログイン</button>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode="signin" />
      </section>
    );
  }
  if (error && !data) {
    return (
      <section className="px-3 py-4 text-sm">
        <p role="alert" className="text-term-danger">{error}</p>
        <button type="button" className={`${BTN} mt-2 rounded-sm border-term-line text-term-fg hover:bg-term-head`} onClick={() => setReload((value) => value + 1)}>再読み込み</button>
      </section>
    );
  }
  if (!data) return null;
  const { activity, mode } = data;
  const nothing = !activity.listings.length && !activity.purchases.length && !activity.sales.length && !activity.referrals.length;

  const orderRow = (order: CommerceOrderView) => (
    <li key={order.orderId} className={`${ROW} lg:grid-cols-[90px_minmax(0,1.4fr)_110px_minmax(0,1.6fr)_90px]`}>
      <span className="term-num text-xs text-term-label lg:text-sm">{dateText(order.createdAt)}</span>
      <Link href={`/marketplace/${encodeURIComponent(order.listingSlug)}`} className="truncate text-term-fg-strong hover:underline">{order.title}</Link>
      <span className="term-num text-term-fg-strong lg:text-right">{formatExactYen(order.priceJpy)}</span>
      <span className="text-xs text-term-sub lg:text-sm">
        {REFERRAL_NOTE_LABELS[order.referral.note]}
        {order.viewerRole === 'seller' && order.referral.rewardJpy !== null && <span className="term-num text-term-label">（紹介報酬 {formatExactYen(order.referral.rewardJpy)}）</span>}
      </span>
      <span className="flex items-center justify-between gap-2 lg:justify-end">
        <span className={`text-xs ${order.status === 'refunded' ? 'text-term-dim' : 'text-term-muted'}`}>{order.status === 'refunded' ? '取り消し済み' : '購入済み'}</span>
        {order.viewerRole === 'seller' && order.status === 'paid' && (
          <button type="button" disabled={refunding !== null} onClick={() => void refund(order.orderId)} className={`${BTN} rounded-sm border-term-line text-term-fg hover:bg-term-head`}>
            {refunding === order.orderId ? '処理中…' : '取り消す'}
          </button>
        )}
      </span>
    </li>
  );

  return (
    <div>
      {mode === 'off' && <p className="border-b border-term-line px-3 py-2 text-sm text-term-sub">この環境では購入を受け付けていません。過去の記録だけを表示します。</p>}
      {error && <p role="alert" className="border-b border-term-line px-3 py-2 text-sm text-term-danger">{error}</p>}
      {actionError && <p role="alert" className="border-b border-term-line px-3 py-2 text-sm text-term-danger">{actionError}</p>}
      {nothing && (
        <Empty title="まだ取引の記録はありません" hint="掲載して価格を決めるか、気になる掲載を購入・紹介すると、ここに記録が並びます。"
          action={<div className="flex flex-wrap gap-2"><Link href="/marketplace/new" className={`${BTN} border-term-accent text-term-accent hover:bg-term-head`}>サービスを掲載</Link><Link href="/marketplace" className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>掲載一覧を見る</Link></div>} />
      )}

      <Section id="activity-listings" title="自分の掲載" note="価格を決めるには、掲載の編集画面を開きます">
        {activity.listings.length === 0 ? (
          <Empty title="掲載はまだありません" hint="Builderで作ったものや外部のサービスを掲載できます。" action={<Link href="/marketplace/new" className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>サービスを掲載</Link>} />
        ) : (
          <>
          <Head columns="lg:grid-cols-[minmax(0,2fr)_90px_minmax(0,1fr)_110px]" labels={['掲載', '状態', '販売価格', '']} />
          <ul>
            {activity.listings.map((listing) => (
              <li key={listing.listingId} className={`${ROW} lg:grid-cols-[minmax(0,2fr)_90px_minmax(0,1fr)_110px] lg:items-center`}>
                <span className="truncate text-term-fg-strong">{listing.title}</span>
                <span className="text-xs text-term-label lg:text-sm">{listing.status === 'published' ? '公開中' : '下書き'}</span>
                <span className="term-num text-term-fg">{listing.priceJpy === null ? <span className="text-term-dim">販売条件なし</span> : `${formatExactYen(listing.priceJpy)}${listing.offerEnabled ? '' : '（販売停止）'}`}</span>
                <span className="flex gap-2 lg:justify-end">
                  <Link href={`/marketplace/new?listingId=${encodeURIComponent(listing.listingId)}`} className="inline-flex min-h-11 items-center text-term-sub hover:text-term-fg-strong lg:min-h-6">編集</Link>
                </span>
              </li>
            ))}
          </ul>
          </>
        )}
      </Section>

      <Section id="activity-sales" title="販売" note="自分の掲載が買われた記録">
        {activity.sales.length === 0 ? <Empty title="まだ売れていません" hint="掲載を公開して販売条件を保存すると、掲載ページに購入ボタンが出ます。" /> : <><Head columns="lg:grid-cols-[90px_minmax(0,1.4fr)_110px_minmax(0,1.6fr)_90px]" labels={['日付', '商品', '>金額', '紹介', '>状態']} /><ul>{activity.sales.map(orderRow)}</ul></>}
      </Section>

      <Section id="activity-purchases" title="購入" note="自分が買った記録（テスト購入）">
        {activity.purchases.length === 0 ? <Empty title="まだ購入していません" hint="掲載ページの購入ボタンから、テスト購入を試せます。" action={<Link href="/marketplace" className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>掲載一覧を見る</Link>} /> : <><Head columns="lg:grid-cols-[90px_minmax(0,1.4fr)_110px_minmax(0,1.6fr)_90px]" labels={['日付', '商品', '>金額', '紹介', '>状態']} /><ul>{activity.purchases.map(orderRow)}</ul></>}
      </Section>

      <Section id="activity-referrals" title="紹介リンクの成果" note="開かれた数・購入された数・報酬の記録">
        {activity.referrals.length === 0 ? (
          <Empty title="紹介リンクはまだありません" hint="掲載ページで「紹介リンクを作る」を押すと、あなた用のリンクができます。" />
        ) : (
          <>
          <Head columns="lg:grid-cols-[minmax(0,1.6fr)_60px_70px_70px_110px_110px]" labels={['掲載・紹介リンク', '>報酬率', '>開いた', '>購入', '>報酬の記録', '>取り消し分']} />
          <ul>
            {activity.referrals.map((referral) => (
              <li key={referral.code} className={`${ROW} lg:grid-cols-[minmax(0,1.6fr)_60px_70px_70px_110px_110px] lg:items-center`}>
                <span className="min-w-0">
                  <span className="block truncate text-term-fg-strong">{referral.title}</span>
                  {referral.listingSlug && <span className="term-num block truncate text-xs text-term-dim">/marketplace/{referral.listingSlug}?ref={referral.code}</span>}
                </span>
                <span className="term-num text-term-fg lg:text-right"><span className="text-xs text-term-label lg:hidden">報酬率 </span>{referral.ratePercent}%</span>
                <span className="term-num text-term-fg lg:text-right"><span className="text-xs text-term-label lg:hidden">開いた </span>{referral.clicks}回</span>
                <span className="term-num text-term-fg lg:text-right"><span className="text-xs text-term-label lg:hidden">購入 </span>{referral.orders}件{referral.refundedOrders > 0 && <span className="text-xs text-term-dim">（取消{referral.refundedOrders}）</span>}</span>
                <span className="term-num text-term-fg-strong lg:text-right"><span className="text-xs text-term-label lg:hidden">報酬 </span>{formatExactYen(referral.accruedJpy)}</span>
                <span className="term-num text-term-muted lg:text-right"><span className="text-xs text-term-label lg:hidden">取消 </span>{formatExactYen(referral.reversedJpy)}</span>
              </li>
            ))}
          </ul>
          </>
        )}
      </Section>

      <Section id="activity-ledger" title="紹介報酬の記録" note="報酬の記録であり、支払いではありません">
        {activity.ledger.length === 0 ? (
          <Empty title="報酬の記録はまだありません" hint="紹介リンク経由で購入されると、ここに1件ずつ記録されます。" />
        ) : (
          <>
          <Head columns="lg:grid-cols-[90px_minmax(0,1.6fr)_90px_60px_110px]" labels={['日付', '商品', '内容', '>報酬率', '>金額']} />
          <ul>
            {activity.ledger.map((entry) => (
              <li key={`${entry.orderId}-${entry.kind}`} className={`${ROW} lg:grid-cols-[90px_minmax(0,1.6fr)_90px_60px_110px] lg:items-center`}>
                <span className="term-num text-xs text-term-label lg:text-sm">{dateText(entry.createdAt)}</span>
                <span className="truncate text-term-fg-strong">{entry.title}</span>
                <span className="text-xs text-term-sub lg:text-sm">{entry.kind === 'accrued' ? '報酬を記録' : '返金で取り消し'}</span>
                <span className="term-num text-term-fg lg:text-right">{entry.ratePercent}%</span>
                <span className={`term-num lg:text-right ${entry.amountJpy < 0 ? 'text-term-danger' : 'text-term-fg-strong'}`}>{formatExactYen(entry.amountJpy)}</span>
              </li>
            ))}
          </ul>
          </>
        )}
      </Section>
    </div>
  );
}
