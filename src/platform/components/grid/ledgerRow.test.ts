import { describe, expect, it } from 'vitest';
import { listDescription } from './ledgerRow';

describe('list description', () => {
  it('drops a leading bracketed revenue headline shown in its own column', () => {
    expect(listDescription('【月商150万円】月額20ドルの格安サーバー1台で運用')).toBe('月額20ドルの格安サーバー1台で運用');
  });
  it('keeps text without a leading headline', () => {
    expect(listDescription('AI 写真ツールに月額 14 ドルで提供')).toBe('AI 写真ツールに月額 14 ドルで提供');
    expect(listDescription(undefined)).toBe('');
  });
});
