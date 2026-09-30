import { describe, expect, it } from 'vitest';

import {
  foundationMayServeDetail,
  hasReader,
  isDetailSettled,
  mayFoundationReplaceCurated,
  mayReplaceDetail,
  preferDetail,
} from './dossier-authority';
import type { ReaderCase } from './reader-case';

const reader = { sources: [], facts: [], metrics: [], unknowns: [], analysis: [] } as unknown as ReaderCase;
const withReader: { reader?: ReaderCase } = { reader };
const bare: { reader?: ReaderCase } = {};
const cards = (n: number) => Array.from({ length: n }, () => ({})) as never;

describe('dossier-authority', () => {
  it('reader の有無で詳細取得済みを判定し、lootBlueprint には依存しない', () => {
    expect(isDetailSettled(undefined)).toBe(false);
    expect(isDetailSettled({})).toBe(false);
    expect(isDetailSettled({ reader })).toBe(true);
    expect(isDetailSettled({ evidenceCards: cards(1) })).toBe(false);
    expect(isDetailSettled({ evidenceCards: cards(2) })).toBe(true);
  });

  it('reader を持つ詳細は reader の無い詳細で置き換えられない', () => {
    expect(hasReader(withReader)).toBe(true);
    expect(mayReplaceDetail(withReader, bare)).toBe(false);
    expect(preferDetail(withReader, bare)).toBe(withReader);
  });

  it('それ以外の置き換えは従来どおり認める', () => {
    expect(mayReplaceDetail(undefined, bare)).toBe(true);
    expect(mayReplaceDetail(bare, withReader)).toBe(true);
    expect(mayReplaceDetail(bare, {})).toBe(true);
    expect(preferDetail(undefined, bare)).toBe(bare);
  });

  it('公開版の印（reader か latestDossierHash）を持つ curated は Foundation で置き換えない', () => {
    expect(mayFoundationReplaceCurated(undefined)).toBe(true);
    expect(mayFoundationReplaceCurated({})).toBe(true);
    expect(mayFoundationReplaceCurated({ reader })).toBe(false);
    expect(mayFoundationReplaceCurated({ latestDossierHash: 'f'.repeat(64) })).toBe(false);
  });

  it('サーバーは目録にある ID の Foundation 詳細を返さない', () => {
    expect(foundationMayServeDetail(true)).toBe(false);
    expect(foundationMayServeDetail(false)).toBe(true);
  });
});
