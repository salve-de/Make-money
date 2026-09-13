import { describe, expect, it } from 'vitest';
import {
  isPublishableEntity,
  publicSummaryEntity,
} from '@/lib/company-access/public-entity';
import {
  type FinancialEntity,
  computeClaimFingerprint,
  VALIDATOR_VERSION,
} from '@/shared/terminal';
import { sha256Sync } from '@/shared/sha256';
import { GET } from '@/app/api/businesses/route';
import {
  registerFoundationEvidenceForTesting,
  registerMockRawPayloadForTesting,
} from '@/lib/foundation/evidence-store';

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

    // 重厚・非公開フィールドは一切漏洩していないこと（型レベルおよび実行時オブジェクトレベルで排除）
    const record = summary as unknown as Record<string, unknown>;
    expect(record.observations).toBeUndefined();
    expect(record.lootBlueprint).toBeUndefined();
    expect(record.evidenceCards).toBeUndefined();
    expect(record.meta).toBeUndefined();
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

  it('6. isPublishableEntity strictly rejects entities that claim revenue without direct financial evidence (Claim-level gate)', () => {
    // 企業のホームページURLはあるが、売上100億円の証拠がない偽データ
    const fakeRevenueEntity = {
      id: 'fake_100b',
      name: 'Fake Unicorn',
      url: 'https://example.com',
      publishability: 'PUBLISHABLE',
      pnl: {
        monthlyRevenue: 833333333, // 月商8.3億円（年商100億円）
        isRevenueUnconfirmed: false, // 確定売上を主張
        sourceDoc: '', // 根拠書類なし
        sourceClass: 'LLM_DERIVED', // LLMでっち上げ
      },
      evidenceCards: [
        {
          id: 'ev_generic',
          type: 'STORY',
          title: '創業ストーリー',
          sourceNote: 'https://example.com', // 財務と無関係なURL
        },
      ],
    } as unknown as FinancialEntity;

    // Claim-level Gateにより物理遮断
    expect(isPublishableEntity(fakeRevenueEntity)).toBe(false);

    // 一方、財務エビデンス（THE_CRIMEカードまたは決算書locator）を伴う場合は通過
    const verifiedEntity = {
      ...fakeRevenueEntity,
      pnl: {
        ...fakeRevenueEntity.pnl,
        sourceDoc: '2024年有価証券報告書 p.42',
        sourceClass: 'PRIMARY',
        evidenceLocator: 'r2://foundation-raw/blobs/sha256/sec_report_123',
      },
      evidenceCards: [
        {
          id: 'ev_financial',
          type: 'THE_CRIME',
          title: '客観的事実ログ・集金構造',
          evidenceLocator: 'r2://foundation-raw/blobs/sha256/sec_report_123',
          sourceClass: 'PRIMARY',
          details: ['月商 約8.3億円を確認'],
          punchline: '客観的事実ログ・集金構造',
        },
      ],
      claimBindings: [
        (() => {
          const targetText = '確定月商 (monthlyRevenue): 833,333,333円 (月商 約8.3億円を確認)';
          const rawPayloadText = `【一次財務ログ】\n対象企業: Keyence\n${targetText}\n事業急所: 直販高収益`;
          const rawBytes = new TextEncoder().encode(rawPayloadText);
          const originalDigest = sha256Sync(rawPayloadText);
          const start = rawPayloadText.indexOf(targetText);
          const end = start + targetText.length;
          const selector = `text:${start}-${end}`;
          const extractedExcerptDigest = sha256Sync(targetText.trim());
          const foundationEvidenceId = 'fnd_ev_sec_report_123';
          const originalObjectKey = 'evidence/src.sec/2026/03/01/fnd_ev_sec_report_123/payload.txt';

          // テスト用実在エビデンスをストアへ登録（原本実バイト列SHA-256、実Locator、実excerpt）
          registerFoundationEvidenceForTesting({
            evidenceId: foundationEvidenceId,
            sourceId: 'src.sec.disclosure',
            originalObjectKey,
            originalSha256: originalDigest,
            contentType: 'text/plain; charset=utf-8',
            locator: {
              type: 'text',
              start,
              end,
              targetText,
            },
            excerpt: targetText,
          });

          // テスト用原本実体バイト列をモック登録（実際のimmutable raw payload）
          registerMockRawPayloadForTesting(originalObjectKey, rawBytes);

          const fingerprint = computeClaimFingerprint({
            foundationEvidenceId,
            originalDigest,
            selector,
            extractedExcerptDigest,
            normalizedClaimValue: 833333333,
            validatorVersion: VALIDATOR_VERSION,
          });

          return {
            claimKey: 'pnl.monthlyRevenue',
            evidenceId: 'ev_financial',
            foundationEvidenceId,
            originalDigest,
            locator: {
              type: 'text' as const,
              start,
              end,
              targetText,
            },
            sourceClass: 'PRIMARY' as const,
            verificationStatus: 'SUPPORTED' as const,
            supportCheck: 'PASS' as const,
            verificationReceipt: {
              receiptId: 'rcpt_test_verified',
              algorithm: 'SHA-256' as const,
              verifiedAt: '2026-09-13T18:00:00.000Z',
              validatorVersion: VALIDATOR_VERSION,
              originalDigest,
              extractedExcerptDigest,
              fingerprint,
              deterministicCheck: 'PASS' as const,
            },
          };
        })(),
      ],
    } as unknown as FinancialEntity;

    expect(isPublishableEntity(verifiedEntity)).toBe(true);

    // [P0検証・監査役ChatGPT指摘] もっともらしい64桁の偽SHA-256（任意入力ハッシュ）は再計算照合で物理遮断
    const fake64ShaEntity = {
      ...verifiedEntity,
      claimBindings: [
        {
          ...verifiedEntity.claimBindings![0],
          verificationReceipt: {
            ...verifiedEntity.claimBindings![0].verificationReceipt,
            receiptId: 'rcpt_test_fake_sha',
            fingerprint: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0', // 偽の64文字SHA
          },
        },
      ],
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(fake64ShaEntity)).toBe(false);

    // [P0検証・監査役ChatGPT指摘] 原本は月商8.3億円なのにClaimが改ざん（1,000万円）されている場合、再計算不一致で物理遮断
    const tamperedClaimEntity = {
      ...verifiedEntity,
      pnl: {
        ...verifiedEntity.pnl,
        monthlyRevenue: 10000000, // 改ざんされたClaim値
      },
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(tamperedClaimEntity)).toBe(false);

    // [P0検証・監査役ChatGPT指摘] 原本スニペットが別箇所にすり替えられた場合、再計算不一致で物理遮断
    const tamperedSnippetEntity = {
      ...verifiedEntity,
      claimBindings: [
        {
          ...verifiedEntity.claimBindings![0],
          locator: {
            type: 'text',
            start: 0,
            end: 40,
            targetText: '全く無関係な別の文章スニペット',
          },
        },
      ],
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(tamperedSnippetEntity)).toBe(false);

    // [P0検証・監査役ChatGPT指摘] 原本ダイジェストが別原本にすり替えられた場合、再計算不一致で物理遮断
    const tamperedOriginalDigestEntity = {
      ...verifiedEntity,
      claimBindings: [
        {
          ...verifiedEntity.claimBindings![0],
          originalDigest: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        },
      ],
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(tamperedOriginalDigestEntity)).toBe(false);

    // [P0検証・監査役ChatGPT指摘] 存在しない架空の foundationEvidenceId は resolve できず即座に物理遮断
    const unresolvableFoundationEvidenceIdEntity = {
      ...verifiedEntity,
      claimBindings: [
        {
          ...verifiedEntity.claimBindings![0],
          foundationEvidenceId: 'ev_non_existent_fake_id_99999',
        },
      ],
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(unresolvableFoundationEvidenceIdEntity)).toBe(false);

    // [P0検証・監査役ChatGPT指摘] 正しいEvidenceだが Locator が原本の別箇所を指している場合（原本スニペットすり替え）、物理遮断
    const wrongLocatorEntity = {
      ...verifiedEntity,
      claimBindings: [
        {
          ...verifiedEntity.claimBindings![0],
          locator: {
            type: 'text',
            start: 100,
            end: 140,
            targetText: '原本の全く別の箇所にある無関係なテキスト',
          },
        },
      ],
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(wrongLocatorEntity)).toBe(false);

    // [P0検証・監査役ChatGPT必須指摘] 攻撃者が嘘のClaim（1,000万円）に合わせてfingerprintまで完全再生成した場合でも、
    // 原本excerpt（8.3億円）が嘘のClaimを支持していないため、意味論的実支持検証（Semantic Support Check）で100%物理遮断
    const falseClaimValue = 10000000; // 1,000万円（原本excerptは8.3億円）
    const falseClaimBinding = verifiedEntity.claimBindings![0];
    const start = falseClaimBinding.locator.type === 'text' ? (falseClaimBinding.locator.start ?? 0) : 0;
    const end = falseClaimBinding.locator.type === 'text' ? (falseClaimBinding.locator.end ?? 0) : 0;
    const regeneratedFingerprintForFalseClaim = computeClaimFingerprint({
      foundationEvidenceId: falseClaimBinding.foundationEvidenceId!,
      originalDigest: falseClaimBinding.originalDigest!,
      selector: `text:${start}-${end}`,
      extractedExcerptDigest: falseClaimBinding.verificationReceipt!.extractedExcerptDigest!,
      normalizedClaimValue: falseClaimValue, // 嘘のClaim値に合わせてfingerprintを正当に再計算
      validatorVersion: VALIDATOR_VERSION,
    });
    const fullyRegeneratedForFalseClaimEntity = {
      ...verifiedEntity,
      pnl: {
        ...verifiedEntity.pnl,
        monthlyRevenue: falseClaimValue,
      },
      claimBindings: [
        {
          ...falseClaimBinding,
          claimValue: falseClaimValue,
          verificationReceipt: {
            ...falseClaimBinding.verificationReceipt!,
            fingerprint: regeneratedFingerprintForFalseClaim, // 嘘のClaim値と一致する再計算済みfingerprint
          },
        },
      ],
    } as unknown as FinancialEntity;
    // fingerprint暗号照合（Check 3）は通過するが、意味的実支持検証（Check 4）で確実に物理遮断（toBe(false)）
    expect(isPublishableEntity(fullyRegeneratedForFalseClaimEntity)).toBe(false);

    // [P0検証・監査役ChatGPT必須指摘 4] 乖離攻撃負例テスト:
    // Evidence=8.3億 / binding.claimValue=8.3億 / public Claim=1000万 / Receipt=1000万で再生成
    // binding.claimValue と公開 Claim が二重化・乖離している場合、値の一致保証または公開値の支持検証により100%物理遮断
    const decoupledAttackEntity = {
      ...verifiedEntity,
      pnl: {
        ...verifiedEntity.pnl,
        monthlyRevenue: falseClaimValue, // 公開値: 1,000万円
      },
      claimBindings: [
        {
          ...falseClaimBinding,
          claimValue: 833333333, // binding.claimValue には正当な8.3億円を偽装セット
          verificationReceipt: {
            ...falseClaimBinding.verificationReceipt!,
            fingerprint: regeneratedFingerprintForFalseClaim, // 公開値1,000万円で正当に計算された指紋
          },
        },
      ],
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(decoupledAttackEntity)).toBe(false);

    // [P0検証・監査役ChatGPT指摘] 原本実体ファイル（immutable raw bytes）が改ざんされてSHA256不一致の場合、物理遮断
    registerMockRawPayloadForTesting(
      'evidence/src.sec/2026/03/01/fnd_ev_sec_report_123/payload.txt',
      'CORRUPTED_RAW_BYTES_TAMPERED'
    );
    expect(isPublishableEntity(verifiedEntity)).toBe(false);
    // 元の正当なraw payloadを再登録して復元
    registerMockRawPayloadForTesting(
      'evidence/src.sec/2026/03/01/fnd_ev_sec_report_123/payload.txt',
      `【一次財務ログ】\n対象企業: Keyence\n確定月商 (monthlyRevenue): 833,333,333円 (月商 約8.3億円を確認)\n事業急所: 直販高収益`
    );
    expect(isPublishableEntity(verifiedEntity)).toBe(true);

    // [P0検証・監査役ChatGPT指摘] foundationEvidenceId が空文字または欠落している場合、物理遮断
    const missingFoundationEvidenceIdEntity = {
      ...verifiedEntity,
      claimBindings: [
        {
          ...verifiedEntity.claimBindings![0],
          foundationEvidenceId: '',
        },
      ],
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(missingFoundationEvidenceIdEntity)).toBe(false);

    // [P0検証] verificationReceipt が欠落している場合は物理遮断
    const noReceiptEntity = {
      ...verifiedEntity,
      claimBindings: [
        {
          claimKey: 'pnl.monthlyRevenue',
          evidenceId: 'ev_financial',
          locator: {
            type: 'text',
            start: 0,
            end: 40,
            targetText: '客観的事実ログ・集金構造',
          },
          sourceClass: 'PRIMARY',
          verificationStatus: 'SUPPORTED',
          supportCheck: 'PASS',
        },
      ],
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(noReceiptEntity)).toBe(false);

    // [P0検証] verificationReceipt の deterministicCheck が FAIL の場合は物理遮断
    const failReceiptEntity = {
      ...verifiedEntity,
      claimBindings: [
        {
          ...verifiedEntity.claimBindings![0],
          verificationReceipt: {
            ...verifiedEntity.claimBindings![0].verificationReceipt,
            deterministicCheck: 'FAIL',
          },
        },
      ],
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(failReceiptEntity)).toBe(false);

    // 反証（REFUTED）またはFAILのBindingがある場合は厳格拒絶
    const refutedEntity = {
      ...verifiedEntity,
      claimBindings: [
        {
          claimKey: 'pnl.monthlyRevenue',
          evidenceId: 'ev_financial',
          locator: {
            type: 'pdf',
            page: 42,
            table: 'Revenue',
          },
          sourceClass: 'PRIMARY',
          verificationStatus: 'REFUTED',
          supportCheck: 'FAIL',
        },
      ],
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(refutedEntity)).toBe(false);

    // [P0検証] Binding自体が存在しない場合、たとえ財務カードやPnL sourceDocがあっても絶対にfallbackで公開しない（Gate物理遮断）
    const noBindingEntity = {
      ...verifiedEntity,
      claimBindings: [],
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(noBindingEntity)).toBe(false);

    // [P0検証] 自己参照ポインタ（/pnl/monthlyRevenue 等）を持つ自己署名Bindingは物理遮断
    const selfReferentialEntity = {
      ...verifiedEntity,
      claimBindings: [
        {
          claimKey: 'pnl.monthlyRevenue',
          evidenceId: 'ev_financial',
          locator: {
            type: 'json',
            jsonPointer: '/pnl/monthlyRevenue',
          },
          sourceClass: 'PRIMARY',
          verificationStatus: 'SUPPORTED',
          supportCheck: 'PASS',
        },
      ],
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(selfReferentialEntity)).toBe(false);

    // [P0検証] 実在しない架空エビデンスIDを指すBindingは物理遮断
    const fakeEvidenceIdEntity = {
      ...verifiedEntity,
      claimBindings: [
        {
          claimKey: 'pnl.monthlyRevenue',
          evidenceId: 'ev_non_existent_fake_card',
          locator: {
            type: 'pdf',
            page: 42,
            table: 'Revenue',
          },
          sourceClass: 'PRIMARY',
          verificationStatus: 'SUPPORTED',
          supportCheck: 'PASS',
        },
      ],
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(fakeEvidenceIdEntity)).toBe(false);

    // [P0検証] supportCheck: 'PASS' と自己申告していても、紐付けられたエビデンスが UNKNOWN の場合は実検証で遮断
    const unknownEvidenceEntity = {
      ...verifiedEntity,
      evidenceCards: [
        {
          id: 'ev_financial',
          type: 'THE_CRIME',
          title: '未確認カード',
          evidenceStatus: 'UNKNOWN',
          sourceNote: '未確認のメモ',
        },
      ],
      pnl: {
        ...verifiedEntity.pnl,
        sourceDoc: '',
      },
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(unknownEvidenceEntity)).toBe(false);

    // [P0検証] supportCheck: 'PASS' と自己申告していても、エビデンスに財務裏付け文脈が一切ない場合は実検証で遮断
    const nonFinancialEvidenceEntity = {
      ...verifiedEntity,
      evidenceCards: [
        {
          id: 'ev_financial',
          type: 'THE_CRIME',
          title: 'ただのデザイン解説',
          evidenceStatus: 'REPORTED',
          details: ['UIデザインが青色で美しいことのみを説明'],
          punchline: 'デザインレビュー',
          sourceNote: '社内デザインメモ',
        },
      ],
      pnl: {
        ...verifiedEntity.pnl,
        sourceDoc: '',
      },
    } as unknown as FinancialEntity;
    expect(isPublishableEntity(nonFinancialEvidenceEntity)).toBe(false);
  });

  it('7. publicSummaryEntity strictly preserves unconfirmed flags without fabricating confirmed metrics', () => {
    const unconfirmedEntity = {
      id: 'unconfirmed_01',
      name: 'Unconfirmed Entity',
      publishability: 'PUBLISHABLE',
      pnl: {
        monthlyRevenue: 0,
        isRevenueUnconfirmed: true,
        operatingProfit: 0,
        isOperatingProfitUnconfirmed: true,
        operatingMargin: 0,
        isMarginUnconfirmed: true,
      },
      operations: {
        teamSize: 0,
        isTeamSizeUnconfirmed: true,
        weeklyHours: 0,
        isWeeklyHoursUnconfirmed: true,
      },
      growthRateYoY: 0,
      isGrowthUnconfirmed: true,
    } as unknown as FinancialEntity;

    const summary = publicSummaryEntity(unconfirmedEntity);
    expect(summary.pnl.isRevenueUnconfirmed).toBe(true);
    expect(summary.pnl.isOperatingProfitUnconfirmed).toBe(true);
    expect(summary.pnl.isMarginUnconfirmed).toBe(true);
    expect(summary.operations.isTeamSizeUnconfirmed).toBe(true);
    expect(summary.operations.isWeeklyHoursUnconfirmed).toBe(true);
    expect(summary.isGrowthUnconfirmed).toBe(true);
  });
});
