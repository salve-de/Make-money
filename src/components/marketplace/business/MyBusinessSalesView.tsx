import Link from 'next/link';

import {
  BUSINESS_SALE_CATEGORY_LABELS,
  BUSINESS_SALE_STATUS_LABELS,
  type OwnedBusinessSaleWithInquiries,
} from '@/shared/business-sale';
import { PENDING_REVIEW_NOTICE } from '@/shared/marketplace-listing';
import { PriceMultipleValue } from './BusinessSaleValues';
import { formatJstDate, formatJstDateTime } from './format';
import { YenValue } from './YenValue';

export interface MyBusinessSalesViewProps {
  listings: OwnedBusinessSaleWithInquiries[];
  /** 公開申請・終了の処理中の掲載 id */
  busyId: string | null;
  /** 「募集を終了する」を1回押して、確認待ちの掲載 id */
  confirmCloseId: string | null;
  error: string | null;
  onPublish: (id: string) => void;
  onAskClose: (id: string) => void;
  onCancelClose: () => void;
  onConfirmClose: (id: string) => void;
}

const BTN = 'inline-flex min-h-11 items-center justify-center border px-3 text-sm disabled:opacity-50 lg:min-h-8 lg:text-[13px]';
const NORMAL = `${BTN} rounded-sm border-term-line bg-transparent text-term-fg hover:bg-term-head`;
const PRIMARY = `${BTN} rounded-sm border-term-accent bg-transparent text-term-accent hover:bg-term-head`;
const DANGER = `${BTN} rounded-sm border-term-danger bg-transparent text-term-danger hover:bg-term-head`;

function InquiryList({ listing }: { listing: OwnedBusinessSaleWithInquiries }) {
  return (
    <div className="border-t border-term-line-soft">
      <div className="flex h-[26px] items-center gap-2 bg-term-head px-3 text-xs text-term-label">
        <span>問い合わせ</span>
        <span className="term-num text-term-accent">{listing.inquiryCount}</span>
        <span>件</span>
        {listing.inquiryCount > listing.inquiries.length && <span className="text-term-dim">（新しい{listing.inquiries.length}件を表示）</span>}
      </div>
      {listing.inquiries.length === 0 ? (
        <p className="px-3 py-2 text-xs text-term-dim">まだ問い合わせはありません</p>
      ) : listing.inquiries.map((inquiry) => (
        <div key={inquiry.id} className="grid gap-1 border-b border-term-line-soft px-3 py-2 text-sm lg:grid-cols-[140px_260px_minmax(0,1fr)] lg:gap-3">
          <span className="term-num text-xs text-term-label lg:pt-0.5">{formatJstDateTime(inquiry.createdAt)}</span>
          <a href={`mailto:${inquiry.contactEmail}`} className="min-w-0 break-all text-term-fg-strong underline decoration-term-line underline-offset-2 hover:decoration-term-accent">
            {inquiry.contactEmail}
          </a>
          <p className="min-w-0 whitespace-pre-wrap break-words text-term-fg">{inquiry.message}</p>
        </div>
      ))}
    </div>
  );
}

/** 自分の掲載の一覧と、それぞれに届いた問い合わせ。買い手の連絡先は、ここ（掲載した本人の画面）にだけ出る。 */
export function MyBusinessSalesView(props: MyBusinessSalesViewProps) {
  const { listings, busyId, confirmCloseId, error } = props;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-term-line px-3 py-2">
        <Link href="/marketplace/businesses/new" className={PRIMARY}>事業を掲載する</Link>
        <Link href="/marketplace/businesses" className={NORMAL}>売り出し中の一覧を見る</Link>
      </div>
      {error && <p role="alert" className="border-b border-term-line px-3 py-2 text-sm text-term-danger">{error}</p>}
      {listings.length === 0 ? (
        <section className="px-3 py-4 text-sm">
          <p className="text-term-fg-strong">まだ掲載がありません</p>
          <p className="mt-1 text-term-sub">売りに出す事業があるときは、「事業を掲載する」から下書きを作ります。審査を通って公開されるまで、買い手には見えません。</p>
        </section>
      ) : listings.map((listing) => {
        const busy = busyId === listing.id;
        return (
          <section key={listing.id} aria-label={listing.title} className="border-b border-term-line">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
              <h2 className="min-w-0 break-words text-sm font-normal text-term-fg-strong">{listing.title}</h2>
              <span className={`text-xs ${listing.status === 'published' ? 'text-term-fg' : listing.status === 'rejected' ? 'text-term-danger' : 'text-term-muted'}`}>{BUSINESS_SALE_STATUS_LABELS[listing.status]}</span>
              <span className="text-xs text-term-label">{BUSINESS_SALE_CATEGORY_LABELS[listing.category]}</span>
              <span className="text-xs text-term-label">希望価格 <YenValue jpy={listing.askingPriceJpy} className="text-term-fg" /></span>
              <span className="text-xs text-term-label">倍率 <PriceMultipleValue askingPriceJpy={listing.askingPriceJpy} monthlyProfitJpy={listing.monthlyProfitJpy} /></span>
              <span className="text-xs text-term-label">更新 <span className="term-num">{formatJstDate(listing.updatedAt)}</span></span>
            </div>
            {listing.status === 'pending_review' && (
              <p role="status" className="px-3 pb-2 text-xs text-term-sub">{PENDING_REVIEW_NOTICE}</p>
            )}
            {listing.status === 'rejected' && (
              <p role="status" className="px-3 pb-2 text-xs text-term-danger">
                審査で却下されました{listing.reviewNote ? `。理由: ${listing.reviewNote}` : ''}。直してから、もう一度申請できます。
              </p>
            )}
            {listing.status !== 'closed' && (
              <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
                <Link href={`/marketplace/businesses/new?id=${encodeURIComponent(listing.id)}`} className={NORMAL}>編集</Link>
                {(listing.status === 'draft' || listing.status === 'rejected') && (
                  <button type="button" disabled={busy} onClick={() => props.onPublish(listing.id)} className={PRIMARY}>
                    {listing.status === 'rejected' ? '審査に出し直す' : '公開を申請する'}
                  </button>
                )}
                {listing.status === 'published' && (
                  <>
                    <Link href={`/marketplace/businesses/${encodeURIComponent(listing.slug)}`} className={NORMAL}>公開ページを見る</Link>
                    {confirmCloseId === listing.id ? (
                      <>
                        <span className="text-xs text-term-sub">募集を終えると、元に戻せません。</span>
                        <button type="button" disabled={busy} onClick={() => props.onConfirmClose(listing.id)} className={DANGER}>募集を終了する</button>
                        <button type="button" disabled={busy} onClick={props.onCancelClose} className={NORMAL}>やめる</button>
                      </>
                    ) : (
                      <button type="button" disabled={busy} onClick={() => props.onAskClose(listing.id)} className={NORMAL}>募集を終了する</button>
                    )}
                  </>
                )}
              </div>
            )}
            <InquiryList listing={listing} />
          </section>
        );
      })}
    </div>
  );
}
