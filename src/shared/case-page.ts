import { z } from 'zod';

/**
 * 事例の「章ごとの文」（case-page）。正本は data/case-pages/<事例ID>.md、
 * scripts/case-pages/ が読んで data/case-pages.json に直し、公開版を作る時に事例の reader.display.casePage へ入れる。
 * 事例にこれがある時、詳細画面はここにある章だけを出す（古い章は出さない）。
 */
/** 「実際にやったこと」「つまずきと立て直し」の1項目。見出し（答えの1行）＋補足の形か、見出しの無い1文（古い形） */
export const CaseItemSchema = z.union([z.string().min(1), z.object({ head: z.string().min(1), body: z.string() })]);
export type CaseItem = z.infer<typeof CaseItemSchema>;
/** 1項目の画面に出る文字（見出しと補足） */
export const caseItemTexts = (x: CaseItem): string[] => (typeof x === 'string' ? [x] : [x.head, x.body]);

export const CasePageSchema = z.object({
  /** 一覧の1行（40字以内） */
  listLine: z.string().min(1),
  overview: z.string().min(1),
  secrets: z.array(z.object({ head: z.string().min(1), body: z.string() })).min(1),
  did: z.array(CaseItemSchema).min(1),
  /** 材料の無い事例では空（画面ではその章を出さない） */
  setbacks: z.array(CaseItemSchema),
  pricing: z.array(z.string().min(1)).min(1),
  timeline: z.array(z.object({ when: z.string(), what: z.string().min(1) })).min(1),
  /** 数字と出典。番号つきのリンク */
  sources: z.array(z.object({ no: z.number().int().positive(), label: z.string().min(1), url: z.url() })).min(1),
  /** 出典の下に出す注記（円の目安・数字の範囲・未確認） */
  notes: z.array(z.string().min(1)),
  /** お金の流れ（払う側→受け取る側・何の代金かといくら）。本文にある事実だけ。章が無い事例では付けない */
  flows: z.array(z.object({ from: z.string().min(1), to: z.string().min(1), label: z.string().min(1) })).optional(),
  /** 概要の下の「主な数字」の帯（3つ前後）。数字は本文にある物だけ。bars=true の数字には、募集ごとの額の小さな棒を添える */
  keyNumbers: z.array(z.object({ label: z.string().min(1), value: z.string().min(1), note: z.string().min(1), bars: z.boolean().optional() })).optional(),
});
export type CasePage = z.infer<typeof CasePageSchema>;

/** 出典ごとの権利の記録（画面には出さない） */
export interface CasePageRight { no: number; host: string; text: string }

/** 画面に出る文字の一覧（文字の出どころの検査 scripts/architecture/screen-text.tsx が、この事例のデータから来た文字として許すため） */
export function casePageTexts(page: CasePage): string[] {
  const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
  return [
    page.listLine, page.overview,
    ...page.secrets.flatMap((x) => [x.head, x.body]),
    ...page.did.flatMap(caseItemTexts), ...page.setbacks.flatMap(caseItemTexts),
    // 料金は「品名：値段」を左右の表に分けて出すので、分けた後の品名と値段も許す
    ...page.pricing.flatMap((t) => { const cut = t.indexOf('：'); return cut > 0 ? [t, t.slice(0, cut), t.slice(cut + 1)] : [t]; }),
    ...page.timeline.flatMap((x) => [x.when, x.what]),
    ...page.sources.flatMap((x) => [String(x.no), x.label, host(x.url)]),
    ...page.notes,
    ...(page.flows ?? []).flatMap((x) => [x.from, x.to, x.label]),
    ...(page.keyNumbers ?? []).flatMap((x) => [x.label, x.value, x.note]),
  ]
    // 段落が2つ以上の文（概要など）は、画面では改行が空白になって1つの文字列で読まれる。段落ごとの形と、空白でつないだ形の両方を許す
    .flatMap((t) => (t.includes('\n') ? [t, t.replace(/\s*\n\s*/g, ' '), ...t.split('\n')] : [t]))
    .map((t) => t.trim()).filter(Boolean);
}
