import { describe, expect, it } from 'vitest';

import { caseLabels } from './display-text';
import { factLineFor } from './fact-lines';
import { textFingerprint, trimLineEnd } from './list-lines';
import { displayForEntity, type DisplaySourceFiles } from './reader-display';

const original = '公式Aboutは、制作費が1分あたり最低1,000ドルになることもあると述べる。';
const files = (extra: Partial<DisplaySourceFiles>): DisplaySourceFiles => ({ 'list-lines': [], 'summary-lines': [], 'detail-lines': [], 'success-points': [], 'case-chapters': [], ...extra });

describe('言い直しの文（fact-lines）', () => {
  const display = displayForEntity(files({ 'fact-lines': [{ entityId: 'e1', kind: 'fact', targetId: 'f3', hash: textFingerprint(original), text: '従来の動画づくりは、1分あたり最低1,000ドルかかることもある。' }] }), 'e1');

  it('元の文の指紋が合う時だけ使い、円換算はコードが付ける', () => {
    expect(factLineFor(display, 'fact', 'f3', original)).toBe('従来の動画づくりは、1分あたり最低1,000ドル（約15万円）かかることもある。');
  });
  it('元の文が変わった・別の種類・別の欄なら使わない', () => {
    expect(factLineFor(display, 'fact', 'f3', `${original}追記`)).toBeNull();
    expect(factLineFor(display, 'basis', 'f3', original)).toBeNull();
    expect(factLineFor(display, 'fact', 'f4', original)).toBeNull();
    expect(factLineFor(undefined, 'fact', 'f3', original)).toBeNull();
  });
  it('札は displayForEntity が kind: labels から作る', () => {
    const d = displayForEntity(files({ 'fact-lines': [{ entityId: 'e1', kind: 'labels', targetId: 'labels', hash: 'abc', text: 'ブラウザ拡張、開発者向けツール' }] }), 'e1');
    expect(d?.labels).toEqual({ hash: 'abc', labels: ['ブラウザ拡張', '開発者向けツール'] });
    expect(d?.factLines).toBeUndefined();
  });
});

describe('一覧と概要の1行の文末', () => {
  it('句点を外してそろえる', () => {
    expect(trimLineEnd('チームで使う管理ツール。')).toBe('チームで使う管理ツール');
    expect(trimLineEnd('チームで使う管理ツール')).toBe('チームで使う管理ツール');
    expect(trimLineEnd('一文目。二文目。')).toBe('一文目。二文目');
  });
});

describe('caseLabels（事業の札が少ない事例は、事業の中身から付けた札で2〜3個にそろえる）', () => {
  const tagline = 'APIの設計・テストと通信の変更を提供し、利用者単位で課金する';
  const labels = { hash: textFingerprint(tagline), labels: ['開発者向けツール', 'ブラウザ拡張'] };
  it('札が0個・1個の事例を2〜3個にする。運営の印と重複は足さない', () => {
    expect(caseLabels({ tags: [], tagline, reader: { display: { labels } } })).toEqual(['開発者向けツール', 'ブラウザ拡張']);
    expect(caseLabels({ tags: ['収集事例'], tagline, reader: { display: { labels } } })).toEqual(['開発者向けツール', 'ブラウザ拡張']);
    expect(caseLabels({ tags: ['ブラウザ拡張'], tagline, reader: { display: { labels } } })).toEqual(['ブラウザ拡張', '開発者向けツール']);
  });
  it('事業の札が2個以上あれば足さない。tagline が変わっていたら使わない', () => {
    expect(caseLabels({ tags: ['教材', 'デザイン'], tagline, reader: { display: { labels } } })).toEqual(['教材', 'デザイン']);
    expect(caseLabels({ tags: [], tagline: `${tagline}。`, reader: { display: { labels } } })).toEqual([]);
  });
});
