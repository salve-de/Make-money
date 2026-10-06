import { describe, expect, it } from 'vitest';
import { buildHref, parseBuildCaseParam, synthesisHref } from './build-material';

describe('build material', () => {
  it('reads a valid case id and ignores invalid ones', () => {
    expect(parseBuildCaseParam('ent_a')).toBe('ent_a');
    expect(parseBuildCaseParam([' ent_a ', 'ent_b'])).toBe('ent_a');
    expect(parseBuildCaseParam('<script>')).toBeNull();
    expect(parseBuildCaseParam('../etc')).toBeNull();
    expect(parseBuildCaseParam('')).toBeNull();
    expect(parseBuildCaseParam(undefined)).toBeNull();
    expect(parseBuildCaseParam('a'.repeat(201))).toBeNull();
  });

  it('builds links that carry the case, and drops bad ids', () => {
    expect(buildHref('ent_a')).toBe('/build?case=ent_a');
    expect(buildHref('bad id')).toBe('/build');
    expect(synthesisHref('ent_a')).toBe('/?mode=SYNTHESIS&entity=ent_a');
  });
});
