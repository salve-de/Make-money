import type { OwnedBusinessSaleListing } from '@/shared/business-sale';
import { parseBusinessSaleInquiry } from '@/shared/business-sale-input';
import { patchBusinessSale, postBusinessSaleDraft, postBusinessSaleInquiry, type ClientResult } from './business-sale-client';
import { checkBusinessSaleForm, toBusinessSalePayload, type BusinessSaleForm } from './business-sale-form';

/**
 * 掲載フォーム・問い合わせフォームの送信の流れ。画面の部品から切り離した関数にして、
 * 何をどの順で送るか（本文のキー、作成→公開の二段階）を、画面なしでテストできるようにしている。
 */
export type SubmitIntent =
  /** 下書きとして保存する */
  | 'draft'
  /** 公開する（新規なら、下書きを作ってから公開する） */
  | 'publish'
  /** 公開中の掲載の変更を保存する */
  | 'changes';

export type SubmitOutcome =
  /** 送る前の確認で止めた。何も送っていない */
  | { kind: 'invalid'; field: string; message: string }
  /** サーバーが断った、または通信に失敗した。draft があれば、下書きだけは保存できている */
  | { kind: 'failed'; field: string; message: string; draft?: OwnedBusinessSaleListing }
  /** 保存できた。leave が true なら、管理画面へ移る */
  | { kind: 'saved'; listing: OwnedBusinessSaleListing; leave: boolean };

function failed(result: Extract<ClientResult<unknown>, { ok: false }>, prefix = ''): SubmitOutcome & { kind: 'failed' } {
  return { kind: 'failed', field: result.field ?? '', message: `${prefix}${result.message}` };
}

/**
 * 掲載フォームを送る。
 * - 送る前に、サーバーと同じ検証で確かめる（通らない内容は送らない）。
 * - 新規（listingId が null）は、まず10項目を下書きとして作る。公開なら続けて状態だけを公開にする。
 *   公開に失敗しても下書きは残り、呼び出し側は draft の id で続きを PATCH できる（二重に作らない）。
 * - 既存は PATCH。公開するときだけ、本文に status: 'published' を足す。
 * 売上の根拠・検証の記録は、どの経路でも送らない。
 */
export async function submitBusinessSaleForm(input: {
  token: string;
  form: BusinessSaleForm;
  listingId: string | null;
  intent: SubmitIntent;
}): Promise<SubmitOutcome> {
  const { token, form, listingId, intent } = input;
  const check = checkBusinessSaleForm(form, intent === 'draft' ? 'save' : 'publish');
  if (!check.ok) return { kind: 'invalid', field: check.field, message: check.message };

  const payload = toBusinessSalePayload(form);
  if (listingId === null) {
    const created = await postBusinessSaleDraft(token, payload);
    if (!created.ok) return failed(created);
    if (intent === 'draft') return { kind: 'saved', listing: created.data, leave: true };
    const published = await patchBusinessSale(token, created.data.id, { status: 'published' });
    if (!published.ok) return { ...failed(published, '下書きは保存しました。公開はできませんでした: '), draft: created.data };
    return { kind: 'saved', listing: published.data, leave: true };
  }

  const updated = await patchBusinessSale(token, listingId, intent === 'publish' ? { ...payload, status: 'published' } : payload);
  if (!updated.ok) return failed(updated);
  return { kind: 'saved', listing: updated.data, leave: intent === 'publish' };
}

export type InquiryOutcome = { ok: true } | { ok: false; message: string };

/** 問い合わせを送る。内容が基準を満たさないときは、何も送らずに理由を返す。 */
export async function submitBusinessSaleInquiry(input: {
  token: string;
  listingId: string;
  message: string;
  contactEmail: string;
}): Promise<InquiryOutcome> {
  const parsed = parseBusinessSaleInquiry({ message: input.message, contactEmail: input.contactEmail });
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const result = await postBusinessSaleInquiry(input.token, input.listingId, parsed.value);
  return result.ok ? { ok: true } : { ok: false, message: result.message };
}
