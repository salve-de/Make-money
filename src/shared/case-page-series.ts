import type { CasePage } from './case-page';

/**
 * 事例の「時間順の流れ」から、年月と円の金額を取り出して図の材料にする。
 * 数字は文に書いてある物だけを使う（作らない）。円の額は本文中の「（約2,700万円）」を読む。
 * 意味の違う数字（年の売上と月の売上、累計、1回の募集額 など）は混ぜず、種類ごとに分ける。
 */

export type SeriesKind = 'annual' | 'monthly' | 'campaign' | 'cumulative' | 'profit';

export interface TimelinePoint {
  kind: SeriesKind;
  /** 並べる位置（年。月があれば年＋(月-1)/12） */
  x: number;
  /** 元の日付の文字（「2020年6月」） */
  when: string;
  yen: number;
  /** 推定・推測と書いてある数字 */
  estimated: boolean;
}

export interface Series {
  kind: SeriesKind;
  title: string;
  /** 'line'＝推移（同じ物を時間で追う）、'bar'＝1回ごとの値 */
  shape: 'line' | 'bar';
  points: TimelinePoint[];
}

export const SERIES_TITLES: Record<SeriesKind, string> = {
  annual: '年の売上',
  monthly: '月の売上',
  campaign: '1回の募集額',
  cumulative: '累計の売上',
  profit: '年の利益',
};

const SERIES_ORDER: SeriesKind[] = ['annual', 'monthly', 'campaign', 'cumulative', 'profit'];

/** 「約2,700万円」「約1.5億円」「約450円」の円の額。範囲（〜）や円でない物は null。 */
export function parseYenAmount(text: string): number | null {
  const m = text.match(/（約?([0-9][0-9,]*(?:\.[0-9]+)?)(億|万)?円）/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * (m[2] === '億' ? 100_000_000 : m[2] === '万' ? 10_000 : 1));
}

/** 日付の文字から年（と月）を取る。年が無ければ null。 */
export function parseWhen(when: string): { x: number; hasMonth: boolean } | null {
  const m = when.match(/(\d{4})年(?:(\d{1,2})(?:〜\d{1,2})?月)?/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : 0;
  if (month < 0 || month > 12) return null;
  return { x: month ? year + (month - 1) / 12 : year, hasMonth: month > 0 };
}

/** 文の言い回しから、どの種類の数字かを決める。決められなければ null（図に入れない）。 */
export function kindOf(when: string, what: string): SeriesKind | null {
  const head = what.split(/（約?[0-9]/)[0]; // 円の括弧より前の言い回しだけで見る
  if (/累計/.test(head)) return 'cumulative';
  if (/月(?:の(?:売上|継続収入|定期売上))?[はが]?[0-9]/.test(head)) return 'monthly';
  if (/集め/.test(what)) return 'campaign';
  if (/利益/.test(head)) return 'profit';
  if (/年(?:間)?の(?:売上|継続収入|定期売上)/.test(head)) return 'annual';
  // 「2011年：売上17.8万ドル」のように年だけの日付に、売上と書いてある場合
  if (/^売上/.test(head) && parseWhen(when) && !parseWhen(when)!.hasMonth) return 'annual';
  return null;
}

export function timelinePoints(timeline: CasePage['timeline']): TimelinePoint[] {
  const out: TimelinePoint[] = [];
  for (const { when, what } of timeline) {
    const date = parseWhen(when);
    const yen = parseYenAmount(what);
    const kind = kindOf(when, what);
    if (!date || yen === null || !kind) continue;
    out.push({ kind, x: date.x, when, yen, estimated: /推定|推測/.test(when + what) });
  }
  return out;
}

/** 図にする系列。2点以上ある種類だけ。同じ日付が重なる種類は混ぜ物なので除く。 */
export function seriesFor(timeline: CasePage['timeline']): Series[] {
  const points = timelinePoints(timeline);
  const result: Series[] = [];
  for (const kind of SERIES_ORDER) {
    const pts = points.filter((p) => p.kind === kind).sort((a, b) => a.x - b.x);
    if (pts.length < 2) continue;
    if (new Set(pts.map((p) => p.x)).size !== pts.length) continue;
    result.push({ kind, title: SERIES_TITLES[kind], shape: kind === 'campaign' ? 'bar' : 'line', points: pts });
  }
  return result;
}
