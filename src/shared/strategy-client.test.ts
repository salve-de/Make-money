import { describe, expect, it } from 'vitest';
import { parseStrategyRequest } from './strategy-schema';
import { notesForRequest, readStrategyError } from './strategy-client';

describe('企画案の送信', () => {
  const notes = {
    ent_a: { entityId: 'ent_a', content: '料金が安い', updatedAt: '2026-10-06T00:00:00.000Z' },
    ent_b: { entityId: 'ent_b', content: '  ', updatedAt: '2026-10-06T00:00:00.000Z' },
    ent_c: { entityId: 'ent_c', content: '紹介で伸びた', updatedAt: '2026-10-06T00:00:00.000Z' },
  };

  it('メモを書いた事例を選んでも、入力検査で弾かれない（事例IDの項目は送らない）', () => {
    const body = { action: 'SYNTHESIZE', selectedEntityIds: ['ent_a'], notes: notesForRequest(notes, new Set(['ent_a'])) };
    expect(() => parseStrategyRequest(body)).not.toThrow();
    expect(body.notes).toEqual({ ent_a: { content: '料金が安い', updatedAt: '2026-10-06T00:00:00.000Z' } });
    // 元の形（entityId つき）のままだと弾かれる
    expect(() => parseStrategyRequest({ action: 'SYNTHESIZE', selectedEntityIds: ['ent_a'], notes })).toThrow();
  });

  it('選んでいない事例と空のメモは送らない', () => {
    expect(Object.keys(notesForRequest(notes))).toEqual(['ent_a', 'ent_c']);
  });

  it('失敗の文は日本語で出し、API の英語の文は出さない', () => {
    expect(readStrategyError({ error: 'Authentication is required for AI analysis' }, 401, '失敗')).toContain('ログイン');
    expect(readStrategyError({ error: 'Invalid strategy request' }, 400, '失敗')).not.toMatch(/[A-Za-z]/);
    expect(readStrategyError({ error: 'Internal Server Error' }, 500, '失敗しました')).toBe('失敗しました');
    expect(readStrategyError({ error: '日本語の理由' }, 500, '失敗')).toBe('日本語の理由');
  });
});
