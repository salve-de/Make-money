import { describe, expect, it } from 'vitest';

import { createSentenceMemory, splitSentences } from './case-text';

describe('case-text', () => {
  it('かぎ括弧の中の句点では文を区切らない', () => {
    expect(splitSentences('本人は「月70K。」と投稿した。次の年に伸びた。')).toEqual(['本人は「月70K。」と投稿した。', '次の年に伸びた。']);
  });

  it('同じ内容の文は2回目から出済みになる', () => {
    const memory = createSentenceMemory();
    expect(memory.take('事業者が紹介プログラムを自動で運営する。')).toBe(true);
    expect(memory.take('事業者が紹介プログラムを自動で運営する')).toBe(false);
    expect(memory.take('全く別の内容の文がここにある。')).toBe(true);
  });
});
