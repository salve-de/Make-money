import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCompleteEntity } from './build-complete-entity';
import { extractDossierFromSignal } from './extractDossier';
import type { RawSignalLead } from './scoutSignals';
import { verifyAndIntegrate } from './verifyAndIntegrate';

test('default extraction preserves unknowns instead of fabricating AI sector or financials', () => {
  const lead: RawSignalLead = {
    id: 'sig_unknown_regression',
    sourcePlatform: 'DIRECT_DISCLOSURE',
    sourceUrl: 'https://example.com/source',
    authorOrHandle: 'UNKNOWN',
    capturedAt: '2026-09-22T00:00:00Z',
    rawText: 'A business exists, but the source excerpt does not disclose sector, revenue, profit, or operating burden.',
    extractedKeywords: ['Example Business'],
    initialSignals: {},
  };

  const dossier = extractDossierFromSignal(lead);

  assert.equal(dossier.entity.sector, 'UNKNOWN');
  assert.equal(dossier.entity.teamSize, null);
  assert.equal(dossier.moneyFlow.monthlyRevenueJpy, null);
  assert.equal(dossier.moneyFlow.grossMarginPercent, null);
  assert.equal(dossier.moneyFlow.operatingProfitJpy, null);
  assert.equal(dossier.operations.weeklyHours, null);
  assert.equal(dossier.operations.automationLevelPercent, null);
  assert.equal(dossier.evidenceVerification.verificationStatus, 'UNVERIFIED');
});

test('unverified dossier cannot be promoted into a synthetic FinancialEntity', () => {
  const lead: RawSignalLead = {
    id: 'sig_unknown_reject',
    sourcePlatform: 'DIRECT_DISCLOSURE',
    sourceUrl: 'https://example.com/source',
    authorOrHandle: 'UNKNOWN',
    capturedAt: '2026-09-22T00:00:00Z',
    rawText: 'Only a weak lead is available.',
    extractedKeywords: ['Weak Lead'],
    initialSignals: {},
  };

  const dossier = extractDossierFromSignal(lead);

  assert.throws(
    () => verifyAndIntegrate(dossier),
    /UNVERIFIED DOSSIER/,
  );
});

test('supported fixture retains explicit sector evidence and passes promotion gate', () => {
  const lead: RawSignalLead = {
    id: 'sig_reddit_001',
    sourcePlatform: 'REDDIT',
    sourceUrl: 'https://reddit.com/r/SaaS/comments/sample_headshot',
    authorOrHandle: 'u/DannyPostma',
    capturedAt: '2023-11-15T12:00:00Z',
    rawText: 'AI headshot product with reported financial and operating facts.',
    extractedKeywords: ['AI Headshot'],
    initialSignals: {
      claimedRevenue: '$250,000 / month',
      claimedProfitOrMargin: '70% gross margin',
      teamSize: 1,
      businessModel: 'B2B AI Photos',
    },
  };

  const dossier = extractDossierFromSignal(lead);
  assert.equal(dossier.entity.sectorEvidence?.verificationStatus, 'SUPPORTED');

  const entity = verifyAndIntegrate(dossier) as ReturnType<typeof verifyAndIntegrate> & {
    verificationStatus?: string;
    sectorEvidence?: {
      value?: string;
      verificationStatus?: string;
      sourceUrls?: string[];
    };
  };

  assert.equal(entity.sector, 'AI_AUTOMATION');
  assert.equal(entity.verificationStatus, 'SUPPORTED');
  assert.equal(entity.sectorEvidence?.value, 'AI_AUTOMATION');
  assert.equal(entity.sectorEvidence?.verificationStatus, 'SUPPORTED');
  assert.deepEqual(entity.sectorEvidence?.sourceUrls, [lead.sourceUrl]);
  assert.equal(entity.pnl.estimatedAnnualNetProfit, 0);
  assert.equal(entity.pnl.isNetProfitUnconfirmed, true);
});


test('legacy annual-revenue generator fails closed instead of dividing by twelve', () => {
  assert.throws(
    () => buildCompleteEntity({
      name: 'Legacy Annual Example',
      tagline: 'legacy generator test',
      sector: 'UNKNOWN',
      annualRevenueRaw: 12000000,
      grossMarginPct: 50,
      operatingMarginPct: 20,
    }),
    /annualRevenueRaw -> monthlyRevenue conversion is forbidden/,
  );
});
