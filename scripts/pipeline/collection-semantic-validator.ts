export interface CollectionSemanticViolation {
  code: string;
  path: string;
  message: string;
}

export interface CollectionSemanticValidationOptions {
  requireSectorEvidence?: boolean;
  label?: string;
}

const ALLOWED_TIERS = new Set(['CANDIDATE', 'HIGH_SIGNAL']);
const SUPPORTED_STATES = new Set(['SUPPORTED', 'VERIFIED']);
const CURRENCY_CODE = /^[A-Z]{3}$/;
const NON_MONETARY_UNIT = /^(years?|yrs?|months?|weeks?|days?|hours?|minutes?|seconds?|people|persons?|employees?|users?|customers?|stores?|locations?|items?|count|contracts?|projects?|units?|shares?|percent|percentage|%|ratio|mw|gw|kw|gb|tb|requests?|visits?|sessions?)$/i;
const TENURE_KEY = /(owner[_-]?tenure|tenure|duration|age|years?[_-]?(owned|operated)|operating[_-]?years?)/i;
const ANNUAL_TO_MONTHLY = /(annual|yearly|per year|year|年商|年間|通期).{0,80}(?:\/\s*12|÷\s*12|divide(?:d)?\s+by\s+12)/i;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function hasEvidenceReference(value: Record<string, unknown>): boolean {
  const evidenceIds = value.evidenceIds ?? value.evidence_ids;
  if (Array.isArray(evidenceIds) && evidenceIds.some((item) => typeof item === 'string' && item.trim())) return true;
  if (stringValue(value.evidenceId) || stringValue(value.evidence_id)) return true;
  if (stringValue(value.sourceUrl) || stringValue(value.source_url) || stringValue(value.sourceDoc)) return true;
  if (isObject(value.evidenceLocator) || isObject(value.locator)) return true;
  return false;
}

function walkSemanticTuples(
  value: unknown,
  path: string,
  violations: CollectionSemanticViolation[],
  parentKey = '',
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkSemanticTuples(item, `${path}[${index}]`, violations, parentKey));
    return;
  }
  if (!isObject(value)) return;

  const semanticName = [
    parentKey,
    stringValue(value.metric_type),
    stringValue(value.metricType),
    stringValue(value.money_type),
    stringValue(value.moneyType),
    stringValue(value.type),
    stringValue(value.name),
    stringValue(value.key),
  ].filter(Boolean).join(' ');

  const unit = stringValue(value.unit);
  const currencyRaw = value.currency;
  const currency = currencyRaw == null ? null : stringValue(currencyRaw);

  if (currency !== null && currency !== '' && !CURRENCY_CODE.test(currency)) {
    violations.push({
      code: 'INVALID_CURRENCY_CODE',
      path: `${path}.currency`,
      message: `currency must be null or an ISO-like 3-letter code, got "${currency}"`,
    });
  }

  if (unit && NON_MONETARY_UNIT.test(unit) && currency !== null && currency !== '') {
    violations.push({
      code: 'CURRENCY_ON_NON_MONETARY_UNIT',
      path,
      message: `non-monetary unit "${unit}" must keep currency=null; it must never be formatted as money`,
    });
  }

  if (TENURE_KEY.test(semanticName)) {
    if (unit && !/^(years?|yrs?|months?)$/i.test(unit)) {
      violations.push({
        code: 'TENURE_UNIT_MISMATCH',
        path: `${path}.unit`,
        message: `tenure/duration value must retain a time unit, got "${unit}"`,
      });
    }
    if (currency !== null && currency !== '') {
      violations.push({
        code: 'TENURE_CURRENCY_CORRUPTION',
        path: `${path}.currency`,
        message: 'tenure/duration is non-monetary and must keep currency=null',
      });
    }
  }

  const verification = stringValue(value.verificationStatus || value.verification_status);
  if (verification && SUPPORTED_STATES.has(verification) && !hasEvidenceReference(value)) {
    const nestedEvidence = Array.isArray(value.evidence)
      && value.evidence.some((item) => isObject(item) && hasEvidenceReference(item));
    if (!nestedEvidence) {
      violations.push({
        code: 'SUPPORTED_WITHOUT_EVIDENCE',
        path,
        message: `${verification} data requires an evidence/source reference`,
      });
    }
  }

  for (const [key, child] of Object.entries(value)) {
    walkSemanticTuples(child, path ? `${path}.${key}` : key, violations, key);
  }
}

function checkSectionDuplicateIds(
  root: Record<string, unknown>,
  section: string,
  idKey: string,
  violations: CollectionSemanticViolation[],
  basePath: string,
) {
  const values = root[section];
  if (!Array.isArray(values)) return;
  const seen = new Set<string>();
  values.forEach((item, index) => {
    if (!isObject(item)) return;
    const id = stringValue(item[idKey]);
    if (!id) return;
    if (seen.has(id)) {
      violations.push({
        code: 'DUPLICATE_ID',
        path: `${basePath}.${section}[${index}].${idKey}`,
        message: `duplicate ${idKey} "${id}" within ${section}`,
      });
    }
    seen.add(id);
  });
}

function checkFinancialEntity(
  entity: Record<string, unknown>,
  path: string,
  violations: CollectionSemanticViolation[],
  options: CollectionSemanticValidationOptions,
) {
  const sector = stringValue(entity.sector);
  if (options.requireSectorEvidence && sector && sector !== 'UNKNOWN') {
    const direct = isObject(entity.sectorEvidence) ? entity.sectorEvidence : null;
    const classification = isObject(entity.classificationEvidence)
      && isObject(entity.classificationEvidence.sector)
      ? entity.classificationEvidence.sector
      : null;
    const evidence = direct || classification;
    const evidenceValue = evidence ? stringValue(evidence.value) : '';
    const verification = evidence ? stringValue(evidence.verificationStatus || evidence.verification_status) : '';
    if (!evidence || evidenceValue !== sector || !SUPPORTED_STATES.has(verification) || !hasEvidenceReference(evidence)) {
      violations.push({
        code: 'UNGROUNDED_SECTOR_CLASSIFICATION',
        path: `${path}.sector`,
        message: `sector "${sector}" requires explicit sectorEvidence; otherwise use UNKNOWN`,
      });
    }
  }

  for (const key of ['collectionTier', 'tier']) {
    const tier = stringValue(entity[key]);
    if (tier && !ALLOWED_TIERS.has(tier)) {
      violations.push({
        code: 'INVALID_COLLECTION_TIER',
        path: `${path}.${key}`,
        message: `${key} must preserve CANDIDATE/HIGH_SIGNAL when present, got "${tier}"`,
      });
    }
  }

  if (entity.verifiedBadge === true) {
    const cards = entity.evidenceCards;
    const supportedCard = Array.isArray(cards) && cards.some((card) => {
      if (!isObject(card)) return false;
      const status = stringValue(card.evidenceStatus);
      return SUPPORTED_STATES.has(status) || status === 'REPORTED';
    });
    if (!supportedCard) {
      violations.push({
        code: 'VERIFIED_BADGE_WITHOUT_EVIDENCE',
        path: `${path}.verifiedBadge`,
        message: 'verifiedBadge=true requires at least one evidence card with a supported/reported status',
      });
    }
  }

  const cards = entity.evidenceCards;
  if (Array.isArray(cards)) {
    cards.forEach((card, index) => {
      if (!isObject(card)) return;
      const status = stringValue(card.evidenceStatus);
      if ((SUPPORTED_STATES.has(status) || status === 'REPORTED') && !stringValue(card.sourceNote) && !stringValue(card.sourceUrl)) {
        violations.push({
          code: 'EVIDENCE_CARD_WITHOUT_SOURCE',
          path: `${path}.evidenceCards[${index}]`,
          message: `evidenceStatus=${status} requires sourceNote/sourceUrl`,
        });
      }
    });
  }

  const observations = entity.observationsStream;
  if (Array.isArray(observations)) {
    observations.forEach((obs, index) => {
      if (!isObject(obs)) return;
      const status = stringValue(obs.verificationStatus);
      if (status === 'SUPPORTED' && !stringValue(obs.sourceUrl) && !isObject(obs.evidenceLocator)) {
        violations.push({
          code: 'SUPPORTED_OBSERVATION_WITHOUT_SOURCE',
          path: `${path}.observationsStream[${index}]`,
          message: 'SUPPORTED observation requires sourceUrl/evidenceLocator',
        });
      }
    });
  }

  const pnl = isObject(entity.pnl) ? entity.pnl : null;
  if (pnl) {
    const status = stringValue(pnl.financialStatus);
    if (status === 'UNAVAILABLE') {
      if (pnl.isRevenueUnconfirmed !== true) {
        violations.push({
          code: 'UNAVAILABLE_REVENUE_NOT_FLAGGED',
          path: `${path}.pnl.isRevenueUnconfirmed`,
          message: 'UNAVAILABLE financial data must keep revenue explicitly unconfirmed',
        });
      }
      if (pnl.isMarginUnconfirmed !== true) {
        violations.push({
          code: 'UNAVAILABLE_MARGIN_NOT_FLAGGED',
          path: `${path}.pnl.isMarginUnconfirmed`,
          message: 'UNAVAILABLE financial data must keep margin explicitly unconfirmed',
        });
      }
    }

    if (status === 'ESTIMATED') {
      if (!stringValue(pnl.estimationLogic) || !stringValue(pnl.dataSnapshotPeriod) || !stringValue(pnl.sourceDoc)) {
        violations.push({
          code: 'ESTIMATE_WITHOUT_METHOD',
          path: `${path}.pnl`,
          message: 'ESTIMATED financials require inputs/formula, period, and source context',
        });
      }
    }

    if (stringValue(pnl.estimationLogic) && ANNUAL_TO_MONTHLY.test(stringValue(pnl.estimationLogic))) {
      violations.push({
        code: 'ANNUAL_TO_MONTHLY_COERCION',
        path: `${path}.pnl.estimationLogic`,
        message: 'annual revenue must remain annual; do not derive monthly revenue by dividing by 12',
      });
    }

    const revenue = pnl.monthlyRevenue;
    const cogs = pnl.cogs;
    const grossProfit = pnl.grossProfit;
    if (
      pnl.isRevenueUnconfirmed !== true
      && typeof revenue === 'number'
      && typeof cogs === 'number'
      && typeof grossProfit === 'number'
      && revenue - cogs !== grossProfit
    ) {
      violations.push({
        code: 'PNL_GROSS_ARITHMETIC_MISMATCH',
        path: `${path}.pnl`,
        message: 'monthlyRevenue - cogs must equal grossProfit when values are confirmed',
      });
    }

    if (
      pnl.isGrossProfitUnconfirmed !== true
      && pnl.isCostsUnconfirmed !== true
      && typeof grossProfit === 'number'
      && typeof pnl.operatingProfit === 'number'
      && isObject(pnl.operatingExpenses)
    ) {
      const opex = Object.values(pnl.operatingExpenses).reduce(
        (sum, value) => sum + (typeof value === 'number' ? value : 0),
        0,
      );
      if (grossProfit - opex !== pnl.operatingProfit) {
        violations.push({
          code: 'PNL_OPERATING_ARITHMETIC_MISMATCH',
          path: `${path}.pnl`,
          message: 'grossProfit - operatingExpenses must equal operatingProfit when values are confirmed',
        });
      }
    }
  }
}

export function validateCollectionGeneratedPayload(
  payload: unknown,
  options: CollectionSemanticValidationOptions = {},
): CollectionSemanticViolation[] {
  const violations: CollectionSemanticViolation[] = [];
  const items = Array.isArray(payload) ? payload : [payload];
  const seenTopLevelIds = new Set<string>();

  items.forEach((item, index) => {
    const path = `$[${index}]`;
    if (!isObject(item)) {
      violations.push({
        code: 'INVALID_ITEM',
        path,
        message: 'collection output item must be an object',
      });
      return;
    }

    const id = stringValue(item.id);
    if (id) {
      if (seenTopLevelIds.has(id)) {
        violations.push({
          code: 'DUPLICATE_ID',
          path: `${path}.id`,
          message: `duplicate top-level id "${id}" within generated batch`,
        });
      }
      seenTopLevelIds.add(id);
    }

    checkSectionDuplicateIds(item, 'entities', 'entity_id', violations, path);
    checkSectionDuplicateIds(item, 'evidence', 'evidence_id', violations, path);
    checkSectionDuplicateIds(item, 'claims', 'claim_id', violations, path);
    checkSectionDuplicateIds(item, 'metrics', 'metric_id', violations, path);
    checkSectionDuplicateIds(item, 'money_signals', 'money_signal_id', violations, path);
    checkSectionDuplicateIds(item, 'events', 'event_id', violations, path);
    checkSectionDuplicateIds(item, 'relationships', 'relationship_id', violations, path);
    checkSectionDuplicateIds(item, 'derived', 'derived_id', violations, path);

    if ('pnl' in item || 'sector' in item || 'verifiedBadge' in item) {
      checkFinancialEntity(item, path, violations, options);
    }

    walkSemanticTuples(item, path, violations);
  });

  return violations;
}

export function assertCollectionGeneratedPayload(
  payload: unknown,
  options: CollectionSemanticValidationOptions = {},
): void {
  const violations = validateCollectionGeneratedPayload(payload, options);
  if (!violations.length) return;
  const label = options.label ? ` [${options.label}]` : '';
  const detail = violations
    .slice(0, 50)
    .map((v) => `${v.code} at ${v.path}: ${v.message}`)
    .join('\n');
  throw new Error(
    `[COLLECTION SEMANTIC VALIDATION FAILED]${label} ${violations.length} violation(s)\n${detail}`,
  );
}
