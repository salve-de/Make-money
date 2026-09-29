'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import type { BusinessSaleStatus } from '@/shared/business-sale';
import { BusinessSaleFormView, type FormProblem } from './BusinessSaleFormView';
import { BusinessSalePage } from './BusinessSalePage';
import { getMyBusinessSales } from './business-sale-client';
import { EMPTY_BUSINESS_SALE_FORM, formFromListing, type BusinessSaleForm } from './business-sale-form';
import { submitBusinessSaleForm, type SubmitIntent } from './business-sale-submit';

const BTN = 'inline-flex min-h-11 items-center justify-center border px-4 text-sm lg:min-h-8 lg:px-3';
const MINE_PATH = '/marketplace/businesses/mine';

/** 事業の売買の掲載フォーム（新規作成と、既存の掲載の編集）。 */
export function BusinessSaleEditor({ listingId }: { listingId: string }) {
  const { user } = useAuth();
  return <EditorInner key={`${user?.uid ?? 'anonymous'}:${listingId}`} listingId={listingId} />;
}

function EditorInner({ listingId }: { listingId: string }) {
  const router = useRouter();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const { user, token, loading: authLoading, signInWithGoogle } = useAuth();
  const [form, setForm] = useState<BusinessSaleForm>(EMPTY_BUSINESS_SALE_FORM);
  const [id, setId] = useState<string | null>(listingId || null);
  const [status, setStatus] = useState<BusinessSaleStatus | null>(null);
  const [loading, setLoading] = useState(Boolean(listingId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<FormProblem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId || authLoading || !token) return;
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setLoadError(null);
      const result = await getMyBusinessSales(token, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.ok) {
        setLoadError(result.message);
      } else {
        const found = result.data.find((listing) => listing.id === listingId);
        if (found) {
          setForm(formFromListing(found));
          setStatus(found.status);
          setId(found.id);
        } else {
          setLoadError('この掲載は見つかりません');
        }
      }
      setLoading(false);
    })();
    return () => controller.abort();
  }, [listingId, authLoading, token, retry]);

  const update = <K extends keyof BusinessSaleForm>(key: K, value: BusinessSaleForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setProblem(null);
    setNotice(null);
  };

  /** 作成・下書き保存・公開・公開中の変更保存。何をどの順で送るかは submitBusinessSaleForm が決める。 */
  const save = async (intent: SubmitIntent) => {
    if (!token || saving || loading) return;
    setSaving(true);
    setProblem(null);
    setNotice(null);
    try {
      const outcome = await submitBusinessSaleForm({ token, form, listingId: id, intent });
      if (!active.current) return;
      if (outcome.kind === 'saved') {
        if (outcome.leave) {
          router.replace(MINE_PATH);
          return;
        }
        setForm(formFromListing(outcome.listing));
        setStatus(outcome.listing.status);
        setId(outcome.listing.id);
        setNotice('保存しました');
        return;
      }
      // 下書きだけ保存できて公開に失敗したときは、以後はその下書きを更新する（二重に作らない）
      if (outcome.kind === 'failed' && outcome.draft) {
        setId(outcome.draft.id);
        setStatus('draft');
      }
      setProblem({ field: outcome.field, message: outcome.message });
    } finally {
      if (active.current) setSaving(false);
    }
  };

  const mode = id === null ? 'create' : 'edit';
  let body;
  if (!authLoading && !user) {
    body = (
      <section className="px-3 py-4 text-sm">
        <p className="text-term-fg-strong">ログインすると事業を掲載できます</p>
        <p className="mt-1 text-term-sub">売り手本人の掲載として登録し、届いた問い合わせを見るために、ログインが必要です。</p>
        <button type="button" onClick={() => void signInWithGoogle()} className={`${BTN} mt-3 rounded-sm border-term-accent bg-transparent text-term-accent hover:bg-term-head`}>
          Googleでログイン
        </button>
      </section>
    );
  } else if (authLoading || loading) {
    body = (
      <div className="flex items-center gap-2 px-3 py-4 text-sm text-term-label">
        <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />掲載を読み込み中…
      </div>
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
  } else if (status === 'closed') {
    body = (
      <section className="px-3 py-4 text-sm">
        <p className="text-term-fg-strong">募集を終了した掲載は編集できません</p>
        <Link href={MINE_PATH} className={`${BTN} mt-3 rounded-sm border-term-line text-term-fg hover:bg-term-head`}>自分の掲載へ戻る</Link>
      </section>
    );
  } else {
    body = (
      <BusinessSaleFormView
        form={form}
        onChange={update}
        mode={mode}
        status={status}
        problem={problem}
        notice={notice}
        saving={saving}
        onPublish={() => void save('publish')}
        onSaveDraft={() => void save('draft')}
        onSaveChanges={() => void save('changes')}
      />
    );
  }

  return (
    <BusinessSalePage name={mode === 'create' ? '事業を掲載' : '掲載を編集'} srHeading={mode === 'create' ? '事業を掲載' : '掲載を編集'}>
      {body}
    </BusinessSalePage>
  );
}
