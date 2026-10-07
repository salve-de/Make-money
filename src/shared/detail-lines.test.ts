import { describe, expect, it } from 'vitest';
import lines from '../../data/detail-lines.json';
import { detailLineFor } from './detail-lines';
import { displayForEntity, type DisplaySourceFiles } from './reader-display';

const only = (name: keyof DisplaySourceFiles, rows: unknown): DisplaySourceFiles => ({ 'list-lines': [], 'summary-lines': [], 'detail-lines': [], 'success-points': [], 'case-chapters': [], [name]: rows }) as DisplaySourceFiles;
const displayOf = (entityId: string) => displayForEntity(only('detail-lines', lines), entityId);

describe('detail lines', () => {
  it('元の文と指紋が合わなければ使わない', () => {
    const first = (lines as Array<{ entityId: string; analysisId: string }>)[0];
    expect(detailLineFor(displayOf(first.entityId), { id: first.analysisId, text: '別の文' })).toBeNull();
    expect(detailLineFor(undefined, { id: first.analysisId, text: '別の文' })).toBeNull();
  });
});
