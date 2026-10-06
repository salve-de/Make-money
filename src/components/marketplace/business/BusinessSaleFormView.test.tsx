import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { BUSINESS_SALE_CATEGORIES, BUSINESS_SALE_NOTICE } from '@/shared/business-sale';
import { BusinessSaleFormView, type BusinessSaleFormViewProps } from './BusinessSaleFormView';
import { EMPTY_BUSINESS_SALE_FORM } from './business-sale-form';
import { expectTerminalStyle, visibleText } from './testing';

vi.mock('next/link', () => ({
  default: ({ children, prefetch: _prefetch, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>) => {
    void _prefetch;
    return <a {...props}>{children}</a>;
  },
}));

const noop = () => {};
const props: BusinessSaleFormViewProps = {
  form: EMPTY_BUSINESS_SALE_FORM,
  onChange: noop,
  mode: 'create',
  status: null,
  problem: null,
  notice: null,
  saving: false,
  onPublish: noop,
  onSaveDraft: noop,
  onSaveChanges: noop,
};
const render = (overrides: Partial<BusinessSaleFormViewProps> = {}) => renderToStaticMarkup(<BusinessSaleFormView {...props} {...overrides} />);

describe('BusinessSaleFormView', () => {
  it('asks for exactly the ten listing fields and nothing that sets trust or ownership', () => {
    const html = render();
    const text = visibleText(html);
    for (const label of [
      '事業名', '区分', '開始年（西暦）', '月商（円）', '月の利益（円）', '希望価格（円）',
      '事業の説明（買い手が最初に読む文章）', '手放す理由', '引き渡すもの', '掲載者名（任意）',
    ]) expect(text).toContain(label);
    expect((html.match(/<input /g) ?? []).length).toBe(6);
    expect((html.match(/<textarea/g) ?? []).length).toBe(3);
    expect((html.match(/<select/g) ?? []).length).toBe(1);
    expect(html).not.toMatch(/type="url"|type="hidden"/);
    for (const forbidden of ['revenueBasis', 'verification', 'Stripe', 'status']) expect(html).not.toContain(forbidden);
  });

  it('offers every business sale category', () => {
    const html = render();
    expect((html.match(/<option /g) ?? []).length).toBe(BUSINESS_SALE_CATEGORIES.length);
    for (const value of BUSINESS_SALE_CATEGORIES) expect(html).toContain(`value="${value}"`);
  });

  it('shows the notice right before the buttons that submit the form', () => {
    const html = render();
    const notice = html.indexOf(BUSINESS_SALE_NOTICE);
    expect(notice).toBeGreaterThan(-1);
    // ヒント文にも「公開する」が出るので、ボタン要素の終わりまで含めて探す
    expect(notice).toBeLessThan(html.indexOf('公開を申請する</button>'));
    expect(notice).toBeLessThan(html.indexOf('下書きを保存</button>'));
    const editing = render({ mode: 'edit', status: 'published' });
    expect(editing.indexOf(BUSINESS_SALE_NOTICE)).toBeLessThan(editing.indexOf('変更を保存</button>'));
  });

  it('offers publish and save-draft for a new or draft listing, and only save-changes for a published one', () => {
    const buttons = (html: string) => ({
      publish: html.includes('公開を申請する</button>'),
      draft: html.includes('下書きを保存</button>'),
      changes: html.includes('変更を保存</button>'),
    });
    expect(buttons(render())).toEqual({ publish: true, draft: true, changes: false });
    expect(buttons(render({ mode: 'edit', status: 'draft' }))).toEqual({ publish: true, draft: true, changes: false });
    expect(buttons(render({ mode: 'edit', status: 'published' }))).toEqual({ publish: false, draft: false, changes: true });
    expect(buttons(render({ mode: 'edit', status: 'pending_review' }))).toEqual({ publish: false, draft: false, changes: true });
  });

  it('says a pending listing awaits review and shows the rejection reason to its owner', () => {
    expect(render({ mode: 'edit', status: 'pending_review' })).toContain('審査待ちです。承認されると公開されます');
    const rejected = render({ mode: 'edit', status: 'rejected', reviewNote: '事業の説明が実態とずれています' });
    expect(rejected).toContain('事業の説明が実態とずれています');
    expect(rejected).toContain('審査に出し直す</button>');
    expect(render({ mode: 'edit', status: 'draft' })).not.toContain('審査待ち');
  });

  it('disables the buttons while saving', () => {
    expect((render({ saving: true }).match(/disabled=""/g) ?? []).length).toBe(2);
    expect(render({ saving: false })).not.toContain('disabled=""');
  });

  it('shows the problem once as an alert and marks only that field', () => {
    const html = render({ problem: { field: 'monthlyRevenueJpy', message: '月商（円）は整数で入力してください' } });
    expect((html.match(/role="alert"/g) ?? []).length).toBe(1);
    expect(visibleText(html)).toContain('月商（円）は整数で入力してください');
    expect((html.match(/aria-invalid="true"/g) ?? []).length).toBe(1);
    expect(html).toContain('border-term-danger');
    expect(render()).not.toContain('aria-invalid="true"');
  });

  it('shows the saved message as a status', () => {
    const html = render({ notice: '保存しました' });
    expect(html).toContain('role="status"');
    expect(visibleText(html)).toContain('保存しました');
  });

  it('repeats each amount in the 万円 notation so a wrong digit count is easy to spot', () => {
    const text = visibleText(render({
      form: { ...EMPTY_BUSINESS_SALE_FORM, monthlyRevenueJpy: '1200000', monthlyProfitJpy: '１，０００，０００', askingPriceJpy: '4,500,000円' },
    }));
    expect(text).toContain('= 120万円');
    expect(text).toContain('= 100万円');
    expect(text).toContain('= 450万円');
  });

  it('refuses to guess an amount that has a decimal point or letters', () => {
    const text = visibleText(render({ form: { ...EMPTY_BUSINESS_SALE_FORM, monthlyRevenueJpy: '1.5', askingPriceJpy: '12abc' } }));
    expect((text.match(/数字だけで入力してください/g) ?? []).length).toBe(2);
    expect(text).not.toContain('= 15');
  });

  it('shows the multiple estimate, and says it is not shown when profit is zero', () => {
    const ready = { ...EMPTY_BUSINESS_SALE_FORM, monthlyRevenueJpy: '1200000', monthlyProfitJpy: '100000', askingPriceJpy: '3000000' };
    expect(visibleText(render({ form: ready }))).toContain('倍率の目安（希望価格 ÷ (月の利益 × 12)）: 2.5倍');
    const noProfit = visibleText(render({ form: { ...ready, monthlyProfitJpy: '0' } }));
    expect(noProfit).toContain('出しません（月の利益が0円）');
    expect(noProfit).not.toMatch(/\d(?:\.\d)?倍/);
    expect(visibleText(render())).not.toContain('倍率の目安');
  });

  it('tells sellers what to enter for a loss and that links are not accepted', () => {
    const text = visibleText(render());
    expect(text).toContain('月の利益が赤字のときは 0 と入力し、事業の説明に赤字の額を書いてください');
    expect(text).toContain('URL（https:// など）は入力できません');
  });

  it('shows the character counters with the limits the server enforces', () => {
    const text = visibleText(render({ form: { ...EMPTY_BUSINESS_SALE_FORM, summary: '😀😀' } }));
    expect(text).toContain('2/600');
    expect(text).toContain('0/400');
  });

  it('keeps every control tall enough to tap on a phone and inside the terminal style rules', () => {
    const html = render();
    expect(html).toContain('min-h-11');
    expectTerminalStyle(html);
  });
});
