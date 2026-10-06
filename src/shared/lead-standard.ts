/**
 * リード（HEADLINE）の基準。固定の字数は基準にしない（OWNER_INTENT 3-1）。
 * 画面（ReaderDetail）と取り込み経路が同じ関数で判定する。機械で落とせるのは「明らかに基準外」だけで、
 * 通ったリードが良いかどうかは審査役（別コンテキスト）が判断する。
 */
import { evidenceNumbers, numbersMissingFrom } from './number-evidence';

/** 出どころ・時点・推計の断り書き。リードに入れず、出どころは詳細の出典へ回す */
export const LEAD_DISCLAIMER = /本人(公表|申告|登録)|時点不(詳|明)|対象(月|時点)|掲載(値|額|時点)|第三者掲載|公式(料金|表示|Pro|Essential)|Indie Hackers|推計|推定|仮説|仮定|仮置|（[^）]*(公式|本人|時点)[^）]*）/;
/**
 * 製品・料金・機能の説明語。リードの主体がこれだと「何を売っているか」の説明で、人の出来事にならない。
 * 年・価格・「初」は具体物とみなさない（「2024年に公開された…ツール」「業界初の…」「月額29ドルで…」も説明のまま）。
 */
const PRODUCT_WORDS = /サービス|ツール|プラットフォーム|基盤|ソリューション|システム|アプリ|ソフト|クラウド|機能|製品|を提供|を支援|を自動|を一元|をまとめ|代行|業界初|国内初|世界初|月額|年額|料金|プラン|従量|掲げ|公開された|発表された|提供開始/;
/** 価格・条件の言い回し（機能・料金の説明に特有） */
const PRICE_WORDS = /月[$＄¥￥0-9０-９]|年払い|月払い|契約不要|[0-9０-９][0-9０-９,.]*\s*(ドル|円)|無料で|[0-9０-９]+[%％]の(報酬|還元)/;
/**
 * 人や会社の行動・結果の手がかり（出来事の動詞、「…から…へ」の推移）。
 * これが1つも無く、説明語・価格・機能の言い切り（「…する。」）が主体の文は落とす。
 */
const EVENT = /売却|買収|廃止|転換|閉鎖|撤退|立ち上げ|創業|退職|辞め|やめ|始め|作り直|作っ|売っ|売れ|稼ぎ|稼い|伸ば|伸び|増や|減ら|達し|到達|変え|捨て|断っ|断念|訴え|解雇|倒産|破綻|失敗|成功|突破|超え|越え|返し|手放|譲渡|ピボット|乗り換え|立て直|やり直|貯め|払っ|使っ|読ませ|買わせ|集め|もらっ|育て|続け|諦め|上げ|下げ|置かず|最初|初めて|[へに]\s*(月|年)?[$＄¥￥]?[0-9０-９]|だった/;
/** 辞書形の言い切り（「…する」「…できる」「…募る」）。機能の説明の典型 */
const PRESENT_ENDING = /(できる|くれる|れる|ある|いる|[るうくすつぬむぶぐ]|へ)$/;
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
  const lastSentence = text.split(/[。．]/).map((x) => x.trim()).filter(Boolean).at(-1) ?? '';
  if (!EVENT.test(text) && (PRODUCT_WORDS.test(text) || PRICE_WORDS.test(text) || PRESENT_ENDING.test(lastSentence))) problems.push('product-description');
  if (text.split(/[。．]/).filter((s) => s.trim()).length >= 3) problems.push('too-many-sentences');
  if (RANGE.test(text)) problems.push('number-range');
  if (numbersMissingFrom(text, evidenceNumbers(evidence.facts, evidence.metrics, lead.basis)).length > 0) problems.push('number-without-source');
  return { ok: problems.length === 0, problems };
}
