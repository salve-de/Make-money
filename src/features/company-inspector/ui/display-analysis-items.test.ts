import { describe, expect, it } from 'vitest';
import { DISPLAY_ANALYSIS_ITEMS } from '@/shared/display-build';
import { ANALYSIS_GROUPS } from './ReaderOverview';

// 画面の文の自動作成（scripts/reader-case/build-display.ts）は、画面に出る分析項目だけに文を作る。画面の並びが変わったら、ここで気づく
describe('画面に出る分析項目', () => {
  it('ReaderOverview の並び（ANALYSIS_GROUPS と STORY）と、自動作成の対象が同じ', () => {
    const shown = new Set<string>(['STORY', ...ANALYSIS_GROUPS.flatMap((g) => g.items)]);
    expect(new Set(DISPLAY_ANALYSIS_ITEMS)).toEqual(shown);
  });
});
