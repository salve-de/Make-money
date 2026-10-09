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

describe('caseLabels（札は決まった言葉の一覧のタグだけ。古い経路は使わない）', () => {
  const tagline = 'APIの設計・テストと通信の変更を提供し、利用者単位で課金する';
  const labels = { hash: textFingerprint(tagline), labels: ['開発者向けツール', 'ブラウザ拡張'] };
  const tags = { field: '開発・IT', form: 'ソフト・アプリ', buyer: '開発者向け', features: [] };
  it('タグがあれば、分野・事業の形・売る相手・特徴の順でそれだけを返す', () => {
    expect(caseLabels({ reader: { display: { tags } } })).toEqual(['開発・IT', 'ソフト・アプリ', '開発者向け']);
    expect(caseLabels({ reader: { display: { tags: { ...tags, features: ['AI'] } } } })).toEqual(['開発・IT', 'ソフト・アプリ', '開発者向け', 'AI']);
  });
  it('タグが無い事例は、fact-lines の札があっても札を出さない', () => {
    expect(caseLabels({ reader: { display: { labels } } })).toEqual([]);
    expect(caseLabels({})).toEqual([]);
  });
});
