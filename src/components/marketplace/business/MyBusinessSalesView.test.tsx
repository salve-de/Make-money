import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { OwnedBusinessSaleWithInquiries } from '@/shared/business-sale';
import { MyBusinessSalesView, type MyBusinessSalesViewProps } from './MyBusinessSalesView';
import { detail, expectTerminalStyle, visibleText } from './testing';

vi.mock('next/link', () => ({
  default: ({ children, prefetch: _prefetch, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>) => {
    void _prefetch;
    return <a {...props}>{children}</a>;
  },
}));

const noop = () => {};
function listing(overrides: Partial<OwnedBusinessSaleWithInquiries> = {}): OwnedBusinessSaleWithInquiries {
  return { ...detail(), status: 'published', reviewNote: null, createdAt: '2026-09-01T00:00:00.000Z', inquiryCount: 0, inquiries: [], ...overrides };
}
const props: MyBusinessSalesViewProps = {
  listings: [],
  busyId: null,
  confirmCloseId: null,
  error: null,
  onPublish: noop,
  onAskClose: noop,
  onCancelClose: noop,
  onConfirmClose: noop,
};
const render = (overrides: Partial<MyBusinessSalesViewProps> = {}) => renderToStaticMarkup(<MyBusinessSalesView {...props} {...overrides} />);

describe('MyBusinessSalesView', () => {
  it('explains the first step when there is nothing yet', () => {
    const text = visibleText(render());
    expect(text).toContain('まだ掲載がありません');
    expect(text).toContain('「事業を掲載する」から下書きを作ります');
    expect(text).toContain('審査を通って公開されるまで、買い手には見えません');
  });

  it('links to creating a listing and to the public list', () => {
    const html = render();
    expect(html).toContain('href="/marketplace/businesses/new"');
    expect(html).toContain('href="/marketplace/businesses"');
  });

  it('offers edit and publish for a draft, and nothing that closes it', () => {
    const html = render({ listings: [listing({ id: 'draft-1', status: 'draft' })] });
    const text = visibleText(html);
    expect(text).toContain('下書き');
    expect(html).toContain('href="/marketplace/businesses/new?id=draft-1"');
    expect(text).toContain('公開を申請する');
    expect(text).not.toContain('募集を終了する');
    expect(text).not.toContain('公開ページを見る');
  });

  it('tells the owner a pending listing awaits review and offers no public page or closing', () => {
    const html = render({ listings: [listing({ id: 'p1', status: 'pending_review' })] });
    const text = visibleText(html);
    expect(text).toContain('審査待ち');
    expect(text).toContain('審査待ちです。承認されると公開されます');
    expect(text).not.toContain('公開ページを見る');
    expect(text).not.toContain('募集を終了する');
    expect(text).not.toContain('公開を申請する');
  });

  it('shows the rejection reason to the owner and offers resubmission', () => {
    const html = render({ listings: [listing({ id: 'r1', status: 'rejected', reviewNote: '事業の説明が実態とずれています' })] });
    const text = visibleText(html);
    expect(text).toContain('却下');
    expect(text).toContain('事業の説明が実態とずれています');
    expect(text).toContain('審査に出し直す');
    expect(html).toContain('href="/marketplace/businesses/new?id=r1"');
    expect(text).not.toContain('公開ページを見る');
  });

  it('offers edit, the public page and closing for a published listing', () => {
    const html = render({ listings: [listing({ id: 'pub-1', slug: 'camera-shop-0123456789' })] });
    const text = visibleText(html);
    expect(text).toContain('公開中');
    expect(html).toContain('href="/marketplace/businesses/new?id=pub-1"');
    expect(html).toContain('href="/marketplace/businesses/camera-shop-0123456789"');
    expect(text).toContain('公開ページを見る');
    expect(text).toContain('募集を終了する');
    expect(text).not.toContain('公開する');
  });

  it('asks for confirmation before closing, and shows the confirm step only for that listing', () => {
    const listings = [listing({ id: 'a', title: 'あ事業' }), listing({ id: 'b', title: 'い事業', slug: 'b-0123456789' })];
    const text = visibleText(render({ listings, confirmCloseId: 'a' }));
    expect(text).toContain('募集を終えると、元に戻せません');
    expect(text).toContain('やめる');
    expect((text.match(/募集を終えると、元に戻せません/g) ?? []).length).toBe(1);
    expect(visibleText(render({ listings }))).not.toContain('元に戻せません');
  });

  it('offers no actions for a closed listing but keeps its inquiries', () => {
    const closed = listing({
      status: 'closed',
      inquiryCount: 1,
      inquiries: [{ id: 'i1', message: '終了前に届いた問い合わせです。', contactEmail: 'buyer@example.com', createdAt: '2026-09-10T00:00:00.000Z' }],
    });
    const text = visibleText(render({ listings: [closed] }));
    expect(text).toContain('募集終了');
    expect(text).not.toContain('編集');
    expect(text).not.toContain('公開する');
    expect(text).toContain('終了前に届いた問い合わせです。');
  });

  it('shows each inquiry with its time, a mailto link and the message', () => {
    const html = render({
      listings: [listing({
        inquiryCount: 2,
        inquiries: [
          { id: 'i1', message: '一通目の問い合わせです。\n改行を含みます。', contactEmail: 'one@example.com', createdAt: '2026-09-10T03:05:00.000Z' },
          { id: 'i2', message: '二通目の問い合わせです。', contactEmail: 'two@example.com', createdAt: '2026-09-09T00:00:00.000Z' },
        ],
      })],
    });
    const text = visibleText(html);
    expect(text).toContain('問い合わせ2件');
    expect(text).toContain('2026-09-10 12:05');
    expect(html).toContain('href="mailto:one@example.com"');
    expect(html).toContain('href="mailto:two@example.com"');
    expect(text).toContain('一通目の問い合わせです。');
    expect(html).toContain('whitespace-pre-wrap');
    expect(text).not.toContain('まだ問い合わせはありません');
  });

  it('says so when a listing has no inquiries, and how many are hidden when there are many', () => {
    expect(visibleText(render({ listings: [listing()] }))).toContain('まだ問い合わせはありません');
    const many = listing({ inquiryCount: 120, inquiries: Array.from({ length: 50 }, (_, index) => ({ id: `i${index}`, message: `問い合わせ ${index} 番目です。`, contactEmail: 'b@example.com', createdAt: '2026-09-10T00:00:00.000Z' })) });
    expect(visibleText(render({ listings: [many] }))).toContain('問い合わせ120件（新しい50件を表示）');
  });

  it('disables the actions of the listing that is being changed', () => {
    const html = render({ listings: [listing({ id: 'busy-1' })], busyId: 'busy-1' });
    expect(html).toContain('disabled=""');
    expect(render({ listings: [listing({ id: 'busy-1' })] })).not.toContain('disabled=""');
  });

  it('shows a failed action as an alert', () => {
    const html = render({ listings: [listing({ status: 'draft' })], error: '公開するには、手放す理由を書いてください' });
    expect(html).toContain('role="alert"');
    expect(visibleText(html)).toContain('公開するには、手放す理由を書いてください');
  });

  it('hides the multiple when the profit is zero, and never shows a buyer identifier', () => {
    const html = render({ listings: [listing({ monthlyProfitJpy: 0 })] });
    expect(visibleText(html)).not.toMatch(/\d(?:\.\d)?倍/);
    expect(html).not.toContain('buyerUserId');
    expect(html).not.toContain('userId');
  });

  it('stays inside the terminal style rules and keeps tap targets tall', () => {
    const html = render({ listings: [listing({ status: 'draft' }), listing({ id: 'b', slug: 'b-0123456789' })] });
    expect(html).toContain('min-h-11');
    expectTerminalStyle(html);
  });
});
