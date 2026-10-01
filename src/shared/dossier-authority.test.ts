import { describe, expect, it } from 'vitest';

import {
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
});

describe('一覧用の軽い reader（listForm）', () => {
  const full = { reader: { sources: [], facts: [], metrics: [], unknowns: [], analysis: [] } } as never;
  const light = { reader: { sources: [], facts: [], metrics: [], unknowns: [], analysis: [], listForm: true } } as never;
  it('一覧の行の軽い reader だけでは詳細を取りに行く', () => {
    expect(isDetailSettled(light)).toBe(false);
    expect(isDetailSettled({ ...(light as object), evidenceCards: [{}, {}] } as never)).toBe(false);
    expect(isDetailSettled(full)).toBe(true);
  });
  it('完全な詳細を一覧用の reader で置き換えない。一覧用は完全な詳細で置き換える', () => {
    expect(preferDetail(full, light)).toBe(full);
    expect(preferDetail(light, full)).toBe(full);
  });
});
