import { z } from 'zod';

/**
 * 事例の「章ごとの文」（case-page）。正本は data/case-pages/<事例ID>.md、
 * scripts/case-pages/ が読んで data/case-pages.json に直し、公開版を作る時に事例の reader.display.casePage へ入れる。
 * 事例にこれがある時、詳細画面はここにある章だけを出す（古い章は出さない）。
 */
export const CasePageSchema = z.object({
  /** 一覧の1行（40字以内） */
  listLine: z.string().min(1),
  overview: z.string().min(1),
  secrets: z.array(z.object({ head: z.string().min(1), body: z.string() })).min(1),
  did: z.array(z.string().min(1)).min(1),
  /** 材料の無い事例では空（画面ではその章を出さない） */
  setbacks: z.array(z.string().min(1)),
  pricing: z.array(z.string().min(1)).min(1),
  timeline: z.array(z.object({ when: z.string(), what: z.string().min(1) })).min(1),
  /** 数字と出典。番号つきのリンク */
  sources: z.array(z.object({ no: z.number().int().positive(), label: z.string().min(1), url: z.url() })).min(1),
  /** 出典の下に出す注記（円の目安・数字の範囲・未確認） */
  notes: z.array(z.string().min(1)),
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
    ...page.did, ...page.setbacks, ...page.pricing,
    ...page.timeline.flatMap((x) => [x.when, x.what]),
    ...page.sources.flatMap((x) => [String(x.no), x.label, host(x.url)]),
    ...page.notes,
  ].map((t) => t.trim()).filter(Boolean);
}
