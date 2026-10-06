/**
 * リード（HEADLINE）の基準。固定の字数は基準にしない（OWNER_INTENT 3-1）。
 * 画面（ReaderDetail）と取り込み経路が同じ関数で判定する。機械で落とせるのは「明らかに基準外」だけで、
 * 通ったリードが良いかどうかは審査役（別コンテキスト）が判断する。
 */
import { evidenceNumbers, numbersMissingFrom } from './number-evidence';

/** 出どころ・時点・推計の断り書き。リードに入れず、出どころは詳細の出典へ回す */
export const LEAD_DISCLAIMER = /本人(公表|申告|登録)|時点不(詳|明)|対象(月|時点)|掲載(値|額|時点)|第三者掲載|公式(料金|表示|Pro|Essential)|Indie Hackers|推計|推定|仮説|仮定|仮置|（[^）]*(公式|本人|時点)[^）]*）/;
/** 製品説明の語 */
const PRODUCT_WORDS = /サービス|ツール|プラットフォーム|アプリ|ソフト|機能|を提供|を支援|を自動|をまとめ|代行/;
/** 具体物: 年・月・数字・出来事の動詞 */
const CONCRETE = /[0-9０-９]|売却|買収|廃止|転換|閉鎖|立ち上げ|最初|初(め|の|回|年|期|客|月|日)|加わ|公開|始め/;
/** 数字の幅（「$2万〜6.9万」型）。幅は推計の合図なので、リードには使わない */
const RANGE = /[0-9０-９][0-9０-９,.，万億千kKmM%％]*\s*(円|ドル|人|件|社)?\s*[〜~～]\s*[$＄¥￥]?[0-9０-９]/;

export type LeadProblem = 'disclaimer' | 'product-description' | 'too-many-sentences' | 'number-without-source' | 'number-range' | 'empty';
export interface LeadVerdict { ok: boolean; problems: LeadProblem[] }

/**
 * リードの機械検査。basis は、そのリードが拠って立つ事実・数値の id。
 * リード内の数字は basis の事実・数値に同じ値があるものだけ使える（幅・出典に無い数字は不可）。
 */
export function checkLead(
  lead: { text: string; basis: readonly string[] },
  evidence: { facts: readonly { id: string; text: string }[]; metrics: readonly { id: string; amount: number; period?: string }[] },
): LeadVerdict {
  const text = lead.text.trim();
  const problems: LeadProblem[] = [];
  if (!text) return { ok: false, problems: ['empty'] };
  if (LEAD_DISCLAIMER.test(text)) problems.push('disclaimer');
  if (!CONCRETE.test(text) && PRODUCT_WORDS.test(text)) problems.push('product-description');
  if (text.split(/[。．]/).filter((s) => s.trim()).length >= 3) problems.push('too-many-sentences');
  if (RANGE.test(text)) problems.push('number-range');
  if (numbersMissingFrom(text, evidenceNumbers(evidence.facts, evidence.metrics, lead.basis)).length > 0) problems.push('number-without-source');
  return { ok: problems.length === 0, problems };
}
