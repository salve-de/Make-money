import { describe, expect, it } from 'vitest';
import {
  isPublishableEntity,
  publicSummaryEntity,
} from '@/lib/company-access/public-entity';
import type { FinancialEntity } from '@/shared/terminal';
import { GET } from '@/app/api/businesses/route';

describe('Promotion Enforcement Gate - Public Route Safety', () => {

  it('1. isPublishableEntity strictly allows only PUBLISHABLE with valid evidence locator and denies all other stages', () => {
    const baseEntityWithEvidence = {
      id: 'test_promo',
      name: 'Promo Test',
      ticker: 'TEST',
      sector: 'NICHE_SAAS',
      scale: 'SOLO',
      country: 'US',
      url: 'https://example.com',
      evidenceCards: [
        {
          id: 'ev_01',
          evidenceLocator: 'r2://foundation-raw/blobs/sha256/abc123',
          sourceClass: 'SEC_EDINET_PRIMARY',
        },
      ],
    } as unknown as FinancialEntity;

    // PUBLISHABLE かつ Evidence ありのみ true
    expect(isPublishableEntity({ ...baseEntityWithEvidence, publishability: 'PUBLISHABLE' })).toBe(true);

    // 厳格Fail-Closed: undefined も物理遮断 (false)
    expect(isPublishableEntity({ ...baseEntityWithEvidence, publishability: undefined })).toBe(false);

    // それ以外のステータスはすべて物理遮断
    expect(isPublishableEntity({ ...baseEntityWithEvidence, publishability: 'PARTIAL' })).toBe(false);
    expect(isPublishableEntity({ ...baseEntityWithEvidence, publishability: 'RAW' })).toBe(false);
    expect(isPublishableEntity({ ...baseEntityWithEvidence, publishability: 'ARCHIVED' })).toBe(false);
    expect(isPublishableEntity({ ...baseEntityWithEvidence, publishability: 'REJECTED_AS_CASE' })).toBe(false);

    // Evidence Locator が一切ないデータは PUBLISHABLE であっても遮断
    const entityWithoutEvidence = {
      id: 'test_fake',
      name: 'Fake Entity',
      publishability: 'PUBLISHABLE',
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(entityWithoutEvidence)).toBe(false);
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

  it('4. Public API route GET /api/businesses with requested dossier_hash strictly returns 404 when not found and does NOT fallback to latest', async () => {
    // 存在するエンティティIDだが、存在しない特定の過去ハッシュを要求した場合
    const req = new Request('http://localhost:3000/api/businesses?entity_id=ent_keyence&dossier_hash=non_existent_hash_99999');
    const res = await GET(req);
    // フォールバックして最新のキーエンスを返すのではなく、CAS契約に基づき厳格404を返すこと
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Dossier snapshot not found for requested hash');
  });

  it('5. publicSummaryEntity strictly preserves undefined publishability without elevating to PUBLISHABLE', () => {
    const rawEntity = {
      id: 'raw_01',
      name: 'Raw Entity',
      publishability: undefined,
    } as unknown as FinancialEntity;

    const summary = publicSummaryEntity(rawEntity);
    expect(summary.publishability).toBeUndefined();
  });
});
