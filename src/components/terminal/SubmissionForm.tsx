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
    <section id="submit" className="p-6 sm:p-8 rounded bg-[#0D1117] text-white border border-white/[0.08] space-y-5">
      <div className="space-y-2">
        <div className="text-[10px] font-mono tracking-widest text-zinc-500">CASE INTAKE / 掲載申請</div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight">あなたの事業を台帳へ申請する</h2>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-3xl">
          申請内容は照合審査の対象です。申請しただけで公開・掲載済みにはなりません。URLと月次の実績値を確認できる範囲で入力してください。
        </p>
      </div>

      {submissionId ? (
        <div className="rounded border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm text-emerald-200" role="status">
          <div className="flex items-center gap-2 font-semibold text-white">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            掲載申請を受け付けました
          </div>
          <p className="mt-2 text-xs text-zinc-300">受付ID: <span className="font-mono text-emerald-300">{submissionId}</span> / 照合審査後に掲載可否を判断します。</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          {errorMessage && <p className="md:col-span-2 text-xs text-rose-300" role="alert">{errorMessage}</p>}
          <div className="md:col-span-2 flex items-center justify-between gap-3 pt-1">
            <span className="text-[10px] text-zinc-500">ログインなしでも申請できます（匿名申請にはレート制限があります）。</span>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? '送信中...' : '掲載申請を送る'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

const inputClass = 'w-full rounded border border-white/[0.1] bg-[#080A0F] px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-white/[0.3]';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-[11px] text-zinc-400">
      <span>{label}{required ? <span className="ml-1 text-rose-400">*</span> : null}</span>
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
