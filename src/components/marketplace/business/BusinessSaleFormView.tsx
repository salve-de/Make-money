import Link from 'next/link';
import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

import {
  BUSINESS_SALE_CATEGORIES,
  BUSINESS_SALE_CATEGORY_LABELS,
  BUSINESS_SALE_LIMITS,
  calcPriceMultiple,
  formatPriceMultiple,
  type BusinessSaleCategory,
  type BusinessSaleStatus,
} from '@/shared/business-sale';
import { charLength } from '@/shared/business-sale-input';
import { BusinessSaleNotice } from './BusinessSaleNotice';
import type { BusinessSaleForm } from './business-sale-form';
import { parseIntegerInput } from './format';
import { YenValue } from './YenValue';

export interface FormProblem {
  field: string;
  message: string;
}

export interface BusinessSaleFormViewProps {
  form: BusinessSaleForm;
  onChange: <K extends keyof BusinessSaleForm>(key: K, value: BusinessSaleForm[K]) => void;
  /** 作成中か、既存の掲載の編集か */
  mode: 'create' | 'edit';
  /** 編集中の掲載の状態。作成中は null */
  status: BusinessSaleStatus | null;
  problem: FormProblem | null;
  /** 保存できたときの案内 */
  notice: string | null;
  saving: boolean;
  onPublish: () => void;
  onSaveDraft: () => void;
  onSaveChanges: () => void;
}

const BTN = 'inline-flex min-h-11 items-center justify-center gap-2 border px-4 text-sm disabled:opacity-50 lg:min-h-8 lg:px-3 lg:text-[13px]';

function controlClass(invalid: boolean): string {
  return `w-full min-h-11 rounded-sm border bg-term-bg px-3 text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent lg:min-h-8 lg:text-[13px] ${invalid ? 'border-term-danger' : 'border-term-line'}`;
}

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs text-term-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-term-label">{hint}</span>}
    </label>
  );
}

/** 金額の欄の下に、入力した数字を「125万円」の書き方で見せる。桁の取り違えに気づくための表示。 */
function AmountPreview({ raw }: { raw: string }) {
  const value = parseIntegerInput(raw);
  if (value === undefined) return <span className="text-term-dim">—</span>;
  if (!Number.isFinite(value)) return <span className="text-term-danger">数字だけで入力してください</span>;
  return <span>= <YenValue jpy={value} className="text-term-fg" /></span>;
}

function Counter({ value, max }: { value: string; max: number }) {
  return <span className="term-num mt-1 block text-right text-xs text-term-dim">{charLength(value)}/{max}</span>;
}

/** 掲載フォームの描画。送信の流れ（保存・公開）は呼び出し側が決め、ここは入力と押しボタンだけを持つ。 */
export function BusinessSaleFormView(props: BusinessSaleFormViewProps) {
  const { form, onChange, mode, status, problem, notice, saving } = props;
  const invalid = (field: string) => problem?.field === field;
  const revenue = parseIntegerInput(form.monthlyRevenueJpy);
  const profit = parseIntegerInput(form.monthlyProfitJpy);
  const price = parseIntegerInput(form.askingPriceJpy);
  const multiple = price !== undefined && profit !== undefined ? calcPriceMultiple(price, profit) : null;
  const numbersReady = [revenue, profit, price].every((value) => value !== undefined && Number.isFinite(value));
  const editingPublished = mode === 'edit' && status === 'published';

  return (
    <section className="max-w-3xl px-3 py-3">
      <div className="grid gap-4">
        <Field label="事業名" hint="URL（https:// など）は入力できません">
          <input
            value={form.title}
            maxLength={BUSINESS_SALE_LIMITS.titleMax}
            onChange={(event) => onChange('title', event.target.value)}
            aria-invalid={invalid('title')}
            className={controlClass(invalid('title'))}
            placeholder="例: 中古カメラ専門のネットショップ"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="区分">
            <select
              value={form.category}
              onChange={(event) => onChange('category', event.target.value as BusinessSaleCategory)}
              aria-invalid={invalid('category')}
              className={controlClass(invalid('category'))}
            >
              {BUSINESS_SALE_CATEGORIES.map((value) => (
                <option key={value} value={value}>{BUSINESS_SALE_CATEGORY_LABELS[value]}</option>
              ))}
            </select>
          </Field>
          <Field label="開始年（西暦）">
            <input
              value={form.establishedYear}
              inputMode="numeric"
              autoComplete="off"
              onChange={(event) => onChange('establishedYear', event.target.value)}
              aria-invalid={invalid('establishedYear')}
              className={`${controlClass(invalid('establishedYear'))} term-num`}
              placeholder="2021"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="月商（円）" hint={<AmountPreview raw={form.monthlyRevenueJpy} />}>
            <input
              value={form.monthlyRevenueJpy}
              inputMode="numeric"
              autoComplete="off"
              onChange={(event) => onChange('monthlyRevenueJpy', event.target.value)}
              aria-invalid={invalid('monthlyRevenueJpy')}
              className={`${controlClass(invalid('monthlyRevenueJpy'))} term-num text-right`}
              placeholder="1200000"
            />
          </Field>
          <Field label="月の利益（円）" hint={<AmountPreview raw={form.monthlyProfitJpy} />}>
            <input
              value={form.monthlyProfitJpy}
              inputMode="numeric"
              autoComplete="off"
              onChange={(event) => onChange('monthlyProfitJpy', event.target.value)}
              aria-invalid={invalid('monthlyProfitJpy')}
              className={`${controlClass(invalid('monthlyProfitJpy'))} term-num text-right`}
              placeholder="300000"
            />
          </Field>
          <Field label="希望価格（円）" hint={<AmountPreview raw={form.askingPriceJpy} />}>
            <input
              value={form.askingPriceJpy}
              inputMode="numeric"
              autoComplete="off"
              onChange={(event) => onChange('askingPriceJpy', event.target.value)}
              aria-invalid={invalid('askingPriceJpy')}
              className={`${controlClass(invalid('askingPriceJpy'))} term-num text-right`}
              placeholder="4500000"
            />
          </Field>
        </div>
        <p className="text-xs leading-5 text-term-label">
          月の利益が赤字のときは 0 と入力し、事業の説明に赤字の額を書いてください。
          {numbersReady && (
            <span className="ml-2 text-term-sub">
              倍率の目安（希望価格 ÷ (月の利益 × 12)）:{' '}
              <span className="term-num text-term-fg">{multiple === null ? '出しません（月の利益が0円）' : formatPriceMultiple(multiple)}</span>
            </span>
          )}
        </p>
        <Field label="事業の説明（買い手が最初に読む文章）" hint={`公開するには${BUSINESS_SALE_LIMITS.summaryPublishMin}文字以上。何を売っていて、客は誰で、月にどれだけ動いているかを書きます`}>
          <textarea
            value={form.summary}
            rows={5}
            maxLength={BUSINESS_SALE_LIMITS.summaryMax}
            onChange={(event) => onChange('summary', event.target.value)}
            aria-invalid={invalid('summary')}
            className={`${controlClass(invalid('summary'))} py-2`}
          />
          <Counter value={form.summary} max={BUSINESS_SALE_LIMITS.summaryMax} />
        </Field>
        <Field label="手放す理由" hint="公開するときに必須です">
          <textarea
            value={form.reasonForSale}
            rows={3}
            maxLength={BUSINESS_SALE_LIMITS.reasonMax}
            onChange={(event) => onChange('reasonForSale', event.target.value)}
            aria-invalid={invalid('reasonForSale')}
            className={`${controlClass(invalid('reasonForSale'))} py-2`}
          />
          <Counter value={form.reasonForSale} max={BUSINESS_SALE_LIMITS.reasonMax} />
        </Field>
        <Field label="引き渡すもの" hint="ドメイン・アカウント・在庫・顧客リストなど。公開するときに必須です">
          <textarea
            value={form.includedAssets}
            rows={3}
            maxLength={BUSINESS_SALE_LIMITS.assetsMax}
            onChange={(event) => onChange('includedAssets', event.target.value)}
            aria-invalid={invalid('includedAssets')}
            className={`${controlClass(invalid('includedAssets'))} py-2`}
          />
          <Counter value={form.includedAssets} max={BUSINESS_SALE_LIMITS.assetsMax} />
        </Field>
        <Field label="掲載者名（任意）" hint="空欄なら名前を出しません">
          <input
            value={form.sellerName}
            maxLength={BUSINESS_SALE_LIMITS.sellerNameMax}
            onChange={(event) => onChange('sellerName', event.target.value)}
            aria-invalid={invalid('sellerName')}
            className={controlClass(invalid('sellerName'))}
          />
        </Field>
      </div>

      {problem && <p role="alert" className="mt-4 text-sm text-term-danger">{problem.message}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-term-fg">{notice}</p>}
      <BusinessSaleNotice className="mt-4" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {editingPublished ? (
          <button type="button" disabled={saving} onClick={props.onSaveChanges} className={`${BTN} rounded-sm border-term-accent bg-transparent text-term-accent hover:bg-term-head`}>
            {saving && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
            変更を保存
          </button>
        ) : (
          <>
            <button type="button" disabled={saving} onClick={props.onPublish} className={`${BTN} rounded-sm border-term-accent bg-transparent text-term-accent hover:bg-term-head`}>
              {saving && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
              公開する
            </button>
            <button type="button" disabled={saving} onClick={props.onSaveDraft} className={`${BTN} rounded-sm border-term-line bg-transparent text-term-fg hover:bg-term-head`}>
              下書きを保存
            </button>
          </>
        )}
        <Link href="/marketplace/businesses/mine" className="inline-flex min-h-11 items-center text-sm text-term-sub hover:text-term-fg-strong lg:min-h-8">
          自分の掲載へ戻る
        </Link>
      </div>
    </section>
  );
}
