import { describe, expect, it } from 'vitest';
import { MediaAssetManifestSchema, mediaAssetIdFromSha256, mediaRawKey, type MediaAssetManifest } from './media-asset-schema';
import {
  MediaLedgerError,
  composeEffectiveManifest,
  displayableMediaAssets,
  formatMediaDecisionLine,
  isMediaDisplayable,
  parseMediaDecisionLog,
  type MediaDecisionLine,
} from './media-decisions';

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

/** A record exactly as the fetcher writes it: held, person flag unconfirmed. */
function captured(sha256: string, kind: 'favicon' | 'og_image' | 'screenshot_home' = 'favicon', extension = 'png'): MediaAssetManifest {
  return MediaAssetManifestSchema.parse({
    assetId: mediaAssetIdFromSha256(sha256),
    entityId: 'ent_keyence',
    kind,
    sourcePageUrl: 'https://www.keyence.co.jp/',
    assetUrl: kind === 'screenshot_home' ? null : 'https://www.keyence.co.jp/img/asset.png',
    retrievedAt: '2026-09-29T00:38:11.808Z',
    capturedBy: 'media-fetch-20260929',
    sha256,
    bytes: 1234,
    contentType: 'image/png',
    width: 152,
    height: 152,
    rights: {
      basis: 'official_marketing_material',
      termsUrl: null,
      licence: null,
      attribution: '出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)',
      decision: 'held',
      reviewedAt: null,
      notes: '自動取得。権利審査前のため held。',
    },
    storage: { bucket: 'foundation-raw', key: mediaRawKey('ent_keyence', sha256, extension), publicKey: null },
    subjectIsPerson: true,
  });
}

function decision(sha256: string, overrides: Partial<MediaDecisionLine> = {}): MediaDecisionLine {
  return {
    assetId: mediaAssetIdFromSha256(sha256),
    decision: 'allowed',
    subjectIsPerson: false,
    reviewer: 'owner-delegated-2026-09-29',
    reviewedAt: '2026-09-29T10:00:00.000Z',
    note: '目視: 赤黒のK印のみ。人物・バナーなし。',
    ...overrides,
  };
}

function rows(...lines: MediaDecisionLine[]): string {
  return lines.map(formatMediaDecisionLine).join('');
}

describe('parseMediaDecisionLog', () => {
  it('reads one decision per line, tolerating blank lines, CRLF and a BOM', () => {
    const text = `﻿${rows(decision(SHA_A))}\r\n\r\n${JSON.stringify(decision(SHA_B, { decision: 'held', subjectIsPerson: true, note: '' }))}\r\n`;
    const parsed = parseMediaDecisionLog(text);
    expect(parsed.map((line) => line.decision)).toEqual(['allowed', 'held']);
    expect(parseMediaDecisionLog('')).toEqual([]);
  });

  it('fails the whole log on a line that is not a valid decision, naming the line', () => {
    const good = rows(decision(SHA_A));
    expect(() => parseMediaDecisionLog(`${good}{"assetId":"ma_${'a'.repeat(24)}","decision":"blo`)).toThrow(/line 2 is not JSON/);
    expect(() => parseMediaDecisionLog(`${good}${JSON.stringify({ ...decision(SHA_B), extra: 1 })}\n`)).toThrow(/line 2 is invalid/);
    expect(() => parseMediaDecisionLog(`${good}${JSON.stringify({ ...decision(SHA_B), reviewedAt: 'yesterday' })}\n`)).toThrow(MediaLedgerError);
  });

  it('refuses allowed without a confirmed non-person subject or a note, and blocked without a reason', () => {
    const line = (overrides: Partial<MediaDecisionLine>) => `${JSON.stringify(decision(SHA_A, overrides))}\n`;
    expect(() => parseMediaDecisionLog(line({ subjectIsPerson: true }))).toThrow(/subjectIsPerson/);
    expect(() => parseMediaDecisionLog(line({ note: '  ' }))).toThrow(/note/);
    expect(() => parseMediaDecisionLog(line({ decision: 'blocked', note: '' }))).toThrow(/note/);
    expect(() => parseMediaDecisionLog(line({ decision: 'blocked', subjectIsPerson: true, note: '人物コラージュ' }))).not.toThrow();
    expect(() => parseMediaDecisionLog(line({ decision: 'held', subjectIsPerson: true, note: '' }))).not.toThrow();
  });
});

describe('composeEffectiveManifest', () => {
  it('keeps the capture-time record in force while there is no decision', () => {
    const record = captured(SHA_A);
    const { assets, problems } = composeEffectiveManifest([record], []);
    expect(problems).toEqual([]);
    expect(assets[0].rights.decision).toBe('held');
    expect(assets[0].review).toBeNull();
    expect(isMediaDisplayable(assets[0])).toBe(false);
  });

  it('applies the latest line per asset and never rewrites the manifest record', () => {
    const a = captured(SHA_A);
    const b = captured(SHA_B, 'og_image');
    const before = structuredClone([a, b]);
    const { assets } = composeEffectiveManifest(
      [a, b],
      [
        decision(SHA_A),
        decision(SHA_B, { decision: 'blocked', subjectIsPerson: true, note: '人物コラージュ', reviewedAt: '2026-09-29T10:05:00.000Z' }),
        decision(SHA_A, { decision: 'blocked', note: '削除依頼を受けたため', reviewedAt: '2026-09-29T11:00:00.000Z' }),
        decision(SHA_A, { decision: 'allowed', note: '再確認: 問題なし', reviewedAt: '2026-09-29T12:00:00.000Z' }),
      ],
    );
    expect([a, b]).toEqual(before);
    expect(assets[0].rights).toMatchObject({ decision: 'allowed', reviewedAt: '2026-09-29T12:00:00.000Z', notes: '再確認: 問題なし' });
    expect(assets[0].subjectIsPerson).toBe(false);
    expect(assets[0].storage.publicKey).toBe(a.storage.key);
    expect(assets[0].review?.note).toBe('再確認: 問題なし');
    expect(assets[1].rights.decision).toBe('blocked');
    expect(assets[1].storage.publicKey).toBeNull();
    expect(assets[1].subjectIsPerson).toBe(true);
    expect(displayableMediaAssets(assets).map((asset) => asset.assetId)).toEqual([a.assetId]);
  });

  it('withdraws the public key again when a later line holds or blocks an allowed asset', () => {
    const record = captured(SHA_A);
    const { assets } = composeEffectiveManifest([record], [decision(SHA_A), decision(SHA_A, { decision: 'held', note: '再確認待ち', reviewedAt: '2026-09-29T13:00:00.000Z' })]);
    expect(assets[0].rights.decision).toBe('held');
    expect(assets[0].storage.publicKey).toBeNull();
    expect(isMediaDisplayable(assets[0])).toBe(false);
  });

  it('ignores and reports a line whose result the schema refuses, keeping the earlier state', () => {
    const unknownBasis = captured(SHA_A);
    unknownBasis.rights.basis = 'unknown';
    const blockedFirst = decision(SHA_A, { decision: 'blocked', subjectIsPerson: true, note: '権利根拠が未決', reviewedAt: '2026-09-29T09:00:00.000Z' });
    const { assets, problems } = composeEffectiveManifest([unknownBasis], [blockedFirst, decision(SHA_A)]);
    expect(assets[0].rights.decision).toBe('blocked');
    expect(assets[0].review).toBe(blockedFirst);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/decision #2 .*ignored.*basis "unknown" cannot be allowed/);
  });

  it('reports a line for an asset that is not in the manifest and does not let it affect anything', () => {
    const { assets, problems } = composeEffectiveManifest([captured(SHA_A)], [decision(SHA_B)]);
    expect(assets.map((asset) => asset.rights.decision)).toEqual(['held']);
    expect(problems[0]).toMatch(/not in manifest\.json/);
  });
});

describe('isMediaDisplayable', () => {
  const gate = (decision: 'allowed' | 'held' | 'blocked', subjectIsPerson: unknown) =>
    ({ rights: { decision }, subjectIsPerson }) as Parameters<typeof isMediaDisplayable>[0];

  it('shows only allowed assets whose subject is confirmed not to be a person', () => {
    expect(isMediaDisplayable(gate('allowed', false))).toBe(true);
    expect(isMediaDisplayable(gate('allowed', true))).toBe(false);
    expect(isMediaDisplayable(gate('held', false))).toBe(false);
    expect(isMediaDisplayable(gate('blocked', false))).toBe(false);
  });

  it('is fail-closed for malformed input', () => {
    expect(isMediaDisplayable(gate('allowed', undefined))).toBe(false);
    expect(isMediaDisplayable(gate('allowed', null))).toBe(false);
    expect(isMediaDisplayable(gate('allowed', 'false'))).toBe(false);
    expect(isMediaDisplayable({ subjectIsPerson: false } as unknown as Parameters<typeof isMediaDisplayable>[0])).toBe(false);
  });
});
