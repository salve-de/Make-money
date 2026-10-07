import { describe, expect, it } from 'vitest';

import { stripOriginTag } from './origin-tag';

describe('stripOriginTag', () => {
  it.each([
    ['売上（保存ページ）です', '売上です'],
    ['売上（本人、2018年5月）です', '売上（2018年5月）です'],
    ['投稿（Hacker News、2022-03-04）です', '投稿です'],
    ['a（根拠: 本人の説明）b', 'ab'],
    ['調達（6万ドル、創業者の発言）', '調達（6万ドル）'],
    ['客（Grover、選別あり）', '客（Grover）'],
    ['a（2013年7月の保存ページ）b', 'ab'],
    ['（152点・コメント55件、投稿は第三者）', '（152点・コメント55件）'],
    ['年商（約3億円）', '年商（約3億円）'],
    ['（年払い）', '（年払い）'],
  ])('%s', (input, expected) => {
    expect(stripOriginTag(input)).toBe(expected);
  });
});
