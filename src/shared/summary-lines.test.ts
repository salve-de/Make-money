import { describe, expect, it } from 'vitest';
import lines from '../../data/summary-lines.json';
import { summaryRestFor } from './summary-lines';
import { displayForEntity, type DisplaySourceFiles } from './reader-display';

type Line = { entityId: string; factId: string; factHash: string; text: string };

const only = (name: keyof DisplaySourceFiles, rows: unknown): DisplaySourceFiles => ({ 'list-lines': [], 'summary-lines': [], 'detail-lines': [], 'success-points': [], 'case-chapters': [], [name]: rows }) as DisplaySourceFiles;
const displayOf = (entityId: string) => displayForEntity(only('summary-lines', lines), entityId);

describe('summary-lines', () => {
  it('元の要約の文が変わったら、編集文は使わない', () => {
    const line = (lines as Line[])[0];
    expect(summaryRestFor(displayOf(line.entityId), { id: line.factId, text: '別の文' })).toBeNull();
    expect(summaryRestFor(displayOf('ent_none'), { id: 'f1', text: 'x' })).toBeNull();
  });
  it('全件が元の事実との紐付けを持つ', () => {
    for (const line of lines as Line[]) expect(line.factHash).toMatch(/^[0-9a-f]{8}$/);
  });
});
