'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SubmissionValues {
  businessName: string;
  url: string;
  monthlyRevenue: string;
  monthlyProfit: string;
  toolsUsed: string;
  acquisitionChannel: string;
  proofScreenshotUrl: string;
}

const EMPTY_VALUES: SubmissionValues = {
  businessName: '',
  url: '',
  monthlyRevenue: '',
  monthlyProfit: '',
  toolsUsed: '',
  acquisitionChannel: '',
  proofScreenshotUrl: '',
};

export const SubmissionForm: React.FC = () => {
  const { token } = useAuth();
  const [values, setValues] = useState<SubmissionValues>(EMPTY_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const update = (key: keyof SubmissionValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmissionId(null);

    const revenue = Number(values.monthlyRevenue);
    const profit = Number(values.monthlyProfit);
    if (!Number.isInteger(revenue) || revenue < 0 || !Number.isInteger(profit)) {
      setErrorMessage('月商・月利は整数で入力してください。月利は赤字の場合に負数を入力できます。');
      return;
    }

    setIsSubmitting(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          businessName: values.businessName,
          url: values.url,
          monthlyRevenue: revenue,
          monthlyProfit: profit,
          toolsUsed: values.toolsUsed,
          acquisitionChannel: values.acquisitionChannel,
          proofScreenshotUrl: values.proofScreenshotUrl,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(readSubmissionError(payload, '掲載申請を保存できませんでした'));
      if (!payload || typeof payload !== 'object' || !('submissionId' in payload) || typeof payload.submissionId !== 'string') {
        throw new Error('申請受付の応答を確認できませんでした');
      }
      setSubmissionId(payload.submissionId);
      setValues(EMPTY_VALUES);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '掲載申請を保存できませんでした');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="submit" className="text-term-fg">
      <div className="term-panel-title"><span className="term-panel-name">掲載申請</span>事業事例の掲載を申請する</div>
      <p className="max-w-3xl px-3 py-2 text-sm leading-6 text-term-sub">
        申請内容は照合審査の対象です。申請しただけで公開・掲載済みにはなりません。URLと月次の実績値を確認できる範囲で入力してください。
      </p>

      {submissionId ? (
        <div className="border-t border-term-line px-3 py-3 text-sm text-term-fg" role="status">
          <div className="flex items-center gap-2 font-semibold text-term-fg-strong">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-term-positive" />
            掲載申請を受け付けました
          </div>
          <p className="mt-1 text-sm leading-6 text-term-sub">受付ID: <span className="term-num text-term-fg-strong">{submissionId}</span> / 内容を確認した後、掲載可否を判断します。</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-t border-term-line px-3 py-3 md:grid-cols-2">
          <Field label="事業名" required>
            <input required value={values.businessName} onChange={(event) => update('businessName', event.target.value)} className={inputClass} placeholder="例: ○○工場" />
          </Field>
          <Field label="公式URL" required>
            <input required type="url" value={values.url} onChange={(event) => update('url', event.target.value)} className={inputClass} placeholder="https://example.com" />
          </Field>
          <Field label="月商（円）" required>
            <input required type="number" min="0" step="1" value={values.monthlyRevenue} onChange={(event) => update('monthlyRevenue', event.target.value)} className={inputClass} placeholder="1000000" />
          </Field>
          <Field label="月利（円）" required>
            <input required type="number" step="1" value={values.monthlyProfit} onChange={(event) => update('monthlyProfit', event.target.value)} className={inputClass} placeholder="300000" />
          </Field>
          <Field label="利用ツール（任意）">
            <input value={values.toolsUsed} onChange={(event) => update('toolsUsed', event.target.value)} className={inputClass} placeholder="POS / Shopify / 自社システムなど" />
          </Field>
          <Field label="主な集客経路（任意）">
            <input value={values.acquisitionChannel} onChange={(event) => update('acquisitionChannel', event.target.value)} className={inputClass} placeholder="紹介 / 店舗 / 検索など" />
          </Field>
          <div className="md:col-span-2">
            <Field label="根拠URL（任意）">
              <input type="url" value={values.proofScreenshotUrl} onChange={(event) => update('proofScreenshotUrl', event.target.value)} className={inputClass} placeholder="https://...（公開可能な決算・記事・画像等）" />
            </Field>
          </div>
          {errorMessage && <p className="text-sm text-term-danger md:col-span-2" role="alert">{errorMessage}</p>}
          <div className="flex flex-col items-start justify-between gap-3 pt-1 sm:flex-row sm:items-center md:col-span-2">
            <span className="text-sm leading-6 text-term-label">入力された情報は、掲載内容の確認に使用します。</span>
            <button type="submit" disabled={isSubmitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-term-accent bg-transparent px-4 text-sm text-term-accent hover:bg-term-head disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-8">
              <Send aria-hidden="true" className="h-4 w-4" />
              {isSubmitting ? '送信中...' : '掲載申請を送る'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

const inputClass = 'min-h-11 w-full rounded-sm border border-term-line bg-term-bg px-3 text-sm text-term-fg-strong placeholder:text-term-dim outline-none focus:border-term-accent lg:min-h-8';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-xs text-term-label">{label}{required ? <span className="ml-1 text-term-danger">*</span> : null}</span>
      {children}
    </label>
  );
}

function readSubmissionError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
    return payload.error.slice(0, 240);
  }
  return fallback;
}
