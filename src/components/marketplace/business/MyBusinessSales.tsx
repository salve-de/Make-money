'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import type { BusinessSaleStatus, OwnedBusinessSaleWithInquiries } from '@/shared/business-sale';
import { BusinessSalePage } from './BusinessSalePage';
import { getMyBusinessSales, patchBusinessSale } from './business-sale-client';
import { MyBusinessSalesView } from './MyBusinessSalesView';

const BTN = 'inline-flex min-h-11 items-center justify-center border px-4 text-sm lg:min-h-8 lg:px-3';

/** 自分の掲載・問い合わせの管理画面。ログインした本人の分だけを読み込む。 */
export function MyBusinessSales() {
  const { user } = useAuth();
  return <MyBusinessSalesInner key={user?.uid ?? 'anonymous'} />;
}

function MyBusinessSalesInner() {
  const { user, token, loading: authLoading, signInWithGoogle } = useAuth();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const [listings, setListings] = useState<OwnedBusinessSaleWithInquiries[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !token) return;
    const controller = new AbortController();
    void (async () => {
      setLoadError(null);
      const result = await getMyBusinessSales(token, controller.signal);
      if (controller.signal.aborted) return;
      if (result.ok) setListings(result.data);
      else setLoadError(result.message);
    })();
    return () => controller.abort();
  }, [authLoading, token, retry]);

  /** 公開の申請・募集終了。サーバーが状態の順序と条件を確かめ、通ったものだけ画面に反映する。公開は運営者の承認後。 */
  const changeStatus = async (id: string, status: Extract<BusinessSaleStatus, 'pending_review' | 'closed'>) => {
    if (!token || busyId) return;
    setBusyId(id);
    setActionError(null);
    setConfirmCloseId(null);
    const result = await patchBusinessSale(token, id, { status });
    if (!active.current) return;
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    const { status: nextStatus, updatedAt, reviewNote } = result.data;
    setListings((current) => current?.map((listing) => (listing.id === id ? { ...listing, status: nextStatus, updatedAt, reviewNote } : listing)) ?? current);
  };

  let body;
  if (!authLoading && !user) {
    body = (
      <section className="px-3 py-4 text-sm">
        <p className="text-term-fg-strong">ログインすると、自分の掲載と問い合わせを見られます</p>
        <button type="button" onClick={() => void signInWithGoogle()} className={`${BTN} mt-3 rounded-sm border-term-accent bg-transparent text-term-accent hover:bg-term-head`}>
          Googleでログイン
        </button>
      </section>
    );
  } else if (loadError) {
    body = (
      <section className="px-3 py-4 text-sm">
        <p role="alert" className="text-term-danger">{loadError}</p>
        <button type="button" className={`${BTN} mt-2 rounded-sm border-term-line text-term-fg hover:bg-term-head`} onClick={() => setRetry((value) => value + 1)}>
          再読み込み
        </button>
      </section>
    );
  } else if (authLoading || listings === null) {
    body = (
      <div className="flex items-center gap-2 px-3 py-4 text-sm text-term-label">
        <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />自分の掲載を読み込み中…
      </div>
    );
  } else {
    body = (
      <MyBusinessSalesView
        listings={listings}
        busyId={busyId}
        confirmCloseId={confirmCloseId}
        error={actionError}
        onPublish={(id) => void changeStatus(id, 'pending_review')}
        onAskClose={setConfirmCloseId}
        onCancelClose={() => setConfirmCloseId(null)}
        onConfirmClose={(id) => void changeStatus(id, 'closed')}
      />
    );
  }

  return <BusinessSalePage name="自分の掲載" srHeading="自分の掲載と届いた問い合わせ">{body}</BusinessSalePage>;
}
