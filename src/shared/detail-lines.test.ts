import { describe, expect, it } from 'vitest';
import lines from '../../data/detail-lines.json';
import { detailLineFor } from './detail-lines';

describe('detail lines', () => {
  it('元の文と指紋が合わなければ使わない', () => {
    const first = (lines as Array<{ entityId: string; analysisId: string }>)[0];
    expect(detailLineFor(first.entityId, { id: first.analysisId, text: '別の文' })).toBeNull();
    expect(detailLineFor(undefined, { id: first.analysisId, text: '別の文' })).toBeNull();
  });
});
