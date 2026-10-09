import type { ReaderDisplay } from './reader-case';

/**
 * 一覧の行と詳細の見出しに出す「事業が作られた年」（創業・公開の年）。出せない時は null（札を出さない。推測で作らない）。
 * 元は2つだけ。
 *  1. 事例の記録の創業・公開年（temporal.foundedYear）。ただし「時間順の流れ」の確かな創業・公開の行（推測・推定・前身の行を除く）より後の年なら、記録の誤りとして使わない
 *  2. 「時間順の流れ」の最初の出来事が、創業・公開・開始を指す時だけ、その年（推測・推定の印がある行は使わない）
 */
type TimelineItem = { when: string; what: string };

const YEAR_AT_HEAD = /^(\d{4})年/;
const LAUNCH_WORDS = /創業|会社を作る|開始|始め|始ま|公開|立ち上げ|売り出|サービスを/;
const STARTED_WORDS = /創業|会社を作る|開始|始め|公開|登録|売り出|立ち上げ/;
const UNSURE = /推測|推定/;
const MIN_YEAR = 1990;

export function caseYearFrom(recordYear: number | null | undefined, timeline: readonly TimelineItem[] | undefined): number | null {
  // 記録の年より前に、事業の創業・公開・登録を指す確かな行があるなら、記録の年は誤り
  const contradicted = (timeline ?? []).some((item) => {
    const year = YEAR_AT_HEAD.exec(item.when)?.[1];
    return Boolean(year) && Number(year) < (recordYear ?? 0) && STARTED_WORDS.test(item.what.split('。')[0]) && !UNSURE.test(item.when + item.what) && !item.what.includes('前身');
  });
  if (recordYear && Number.isInteger(recordYear) && recordYear >= MIN_YEAR && !contradicted) return recordYear;
  const first = timeline?.[0];
  if (!first || UNSURE.test(first.when) || UNSURE.test(first.what)) return null;
  const year = YEAR_AT_HEAD.exec(first.when)?.[1];
  if (!year || !LAUNCH_WORDS.test(first.what.split('。')[0])) return null;
  return Number(year);
}

/** 画面に出す年。公開版が持つ display.year を先に、無ければ（詳細の章ごとの文から）その場で決める。 */
export function caseYearOf(entity: { temporal?: { foundedYear?: number | null } | null; reader?: { display?: ReaderDisplay } | null }): number | null {
  const display = entity.reader?.display;
  if (display?.year) return display.year;
  if (display?.casePage) return caseYearFrom(entity.temporal?.foundedYear, display.casePage.timeline);
  return null;
}
