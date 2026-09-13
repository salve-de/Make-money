import { describe, it, expect } from 'vitest';
import {
  computeDossierContentHash,
  getDossierStoragePath,
  canUpdateDossierPointer,
} from './dossier-projection';

describe('Dossier Projection 100M Storage & CAS Guards', () => {
  it('1. 決定論的コンテンツハッシュの算出（キー順序非依存・Canonical一本化）', () => {
    const data1 = { entityId: 'ent_keyence', revenue: 1000000, tags: ['a', 'b'] };
    const data2 = { tags: ['a', 'b'], revenue: 1000000, entityId: 'ent_keyence' }; // キー順序逆転
    const data3 = { entityId: 'ent_keyence', revenue: 2000000, tags: ['a', 'b'] };

    const hash1 = computeDossierContentHash(data1);
    const hash2 = computeDossierContentHash(data2);
    const hash3 = computeDossierContentHash(data3);

    // キー順序が異なっていても決定論的Canonical JSONにより完全に一致すること
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toHaveLength(64);
  });

  it('2. 100M耐久・R2 イミュータブル物理格納パスの生成', () => {
    const path = getDossierStoragePath('ent_keyence', 'ab1234cd');
    expect(path).toBe('views/make-money/dossier-v1/objects/ab/ent_keyence/ab1234cd.json.gz');
  });

  it('3. CAS安全ポインタ更新: 新Revisionのみポインタ更新を許可し、巻き戻しを遮断すること', () => {
    // 正常系: 101 -> 102 (昇格)
    expect(canUpdateDossierPointer(101, 102)).toBe(true);

    // 異常系: 102 -> 101 (遅延した古いProjectorによる巻き戻し)
    expect(canUpdateDossierPointer(102, 101)).toBe(false);

    // 異常系: 102 -> 102 (同一Revisionの再実行)
    expect(canUpdateDossierPointer(102, 102)).toBe(false);
  });
});
