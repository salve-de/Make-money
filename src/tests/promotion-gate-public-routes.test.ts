import { describe, expect, it } from 'vitest';
import {
  isPublishableEntity,
  publicSummaryEntity,
} from '@/lib/company-access/public-entity';
import type { FinancialEntity } from '@/shared/terminal';
import { GET } from '@/app/api/businesses/route';

describe('Promotion Enforcement Gate - Public Route Safety', () => {

  it('1. isPublishableEntity strictly allows only PUBLISHABLE and denies all other stages', () => {
    const baseEntity = {
      id: 'test_promo',
      name: 'Promo Test',
      ticker: 'TEST',
      sector: 'NICHE_SAAS',
      scale: 'SOLO',
      country: 'US',
    } as unknown as FinancialEntity;

    // PUBLISHABLE のみ true
    expect(isPublishableEntity({ ...baseEntity, publishability: 'PUBLISHABLE' })).toBe(true);

    // 後方互換（未指定は既存データとして許可）
    expect(isPublishableEntity({ ...baseEntity, publishability: undefined })).toBe(true);

    // それ以外はすべて物理遮断
    expect(isPublishableEntity({ ...baseEntity, publishability: 'PARTIAL' })).toBe(false);
    expect(isPublishableEntity({ ...baseEntity, publishability: 'RAW' })).toBe(false);
    expect(isPublishableEntity({ ...baseEntity, publishability: 'ARCHIVED' })).toBe(false);
    expect(isPublishableEntity({ ...baseEntity, publishability: 'REJECTED_AS_CASE' })).toBe(false);
  });

  it('2. publicSummaryEntity projects strictly explicit whitelist fields without leaking heavy dossiers or meta', () => {
    const heavyEntity = {
      id: 'heavy_01',
      name: 'Heavy Corp',
      ticker: 'HVY',
      sector: 'FINTECH_INFRA',
      scale: 'SCALEUP',
      country: 'JP',
      publishability: 'PUBLISHABLE',
      sourceRevision: 5,
      latestDossierHash: 'hash_heavy_v5',
      // 重厚・機密フィールド
      observationsStream: [
        {
          id: 'obs_1',
          text: 'Confidential observation log',
          sourceClass: 'PRIMARY',
        },
      ],
      observations: ['Confidential observation 1'],
      lootBlueprint: {
        targetPrey: 'Target',
        structuralFlaw: 'Flaw',
        stealthEntry: 'Stealth',
        tollGateSetup: 'Confidential setup',
        executionChecklist: ['step1', 'step2', 'step3'],
      },
      meta: {
        proAnalysis: 'Confidential premium content',
      },
    } as unknown as FinancialEntity;

    const summary = publicSummaryEntity(heavyEntity);

    // 必須メタデータは保持されること
    expect(summary.id).toBe('heavy_01');
    expect(summary.name).toBe('Heavy Corp');
    expect(summary.latestDossierHash).toBe('hash_heavy_v5');
    expect(summary.sourceRevision).toBe(5);

    // 重厚・非公開フィールドは一切漏洩していないこと
    expect(summary.observations).toBeUndefined();
    expect(summary.lootBlueprint).toBeUndefined();
    expect((summary as unknown as Record<string, unknown>).meta).toBeUndefined();
  });

  it('3. Public API route GET /api/businesses rejects non-publishable entities from direct lookup with 404', async () => {
    // 存在しない、または非公開のエンティティIDを直接叩く
    const req = new Request('http://localhost:3000/api/businesses?entity_id=non_existent_or_unapproved');
    const res = await GET(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Entity not found');
  });
});
