import { describe, expect, it } from 'vitest';

import { clipAtClause, createSentenceMemory, splitKeyNumbers, splitSentences } from './case-text';

describe('case-text', () => {
  it('かぎ括弧の中の句点では文を区切らない', () => {
    expect(splitSentences('本人は「月70K。」と投稿した。次の年に伸びた。')).toEqual(['本人は「月70K。」と投稿した。', '次の年に伸びた。']);
  });

  it('長い文は読点で切り、収まれば何も足さない', () => {
    expect(clipAtClause('短い文。', 40)).toEqual({ text: '短い文', clipped: false });
    const clipped = clipAtClause('月59ドルの有料版に2日で最初の客が付き、外部資金なしで営業を雇い直し、さらに年払いを足して伸ばした話', 30);
    expect(clipped.clipped).toBe(true);
    expect([...clipped.text].length).toBeLessThanOrEqual(31);
    expect(clipped.text.endsWith('…')).toBe(true);
  });

  it('金額・割合・件数だけ太字にし、年や順番の数字は太字にしない', () => {
    const strong = (t: string) => splitKeyNumbers(t).filter((p) => p.strong).map((p) => p.text);
    expect(strong('2016年2月に月250ドル、年払いは10%引き、1社から$1,500')).toEqual(['250ドル', '10%', '1社', '$1,500']);
    expect(strong('2人目の社員')).toEqual([]);
  });

  it('同じ内容の文は2回目から出済みになる', () => {
    const memory = createSentenceMemory();
    expect(memory.take('事業者が紹介プログラムを自動で運営する。')).toBe(true);
    expect(memory.take('事業者が紹介プログラムを自動で運営する')).toBe(false);
    expect(memory.take('全く別の内容の文がここにある。')).toBe(true);
  });
});
