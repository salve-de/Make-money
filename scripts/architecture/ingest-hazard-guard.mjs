const HAZARD_TAG_PATTERN = /破綻|倒産|粉飾|不正|清算|枯渇|崩壊|撤退|レシーバーシップ/i;

export function entityFinancialStatus(entity) {
  return entity?.pnl?.financialStatus ?? entity?.financialStatus;
}

export function hasHazardEvidence(entity) {
  return (Array.isArray(entity?.tags) && entity.tags.some((tag) => HAZARD_TAG_PATTERN.test(tag))) ||
    (Array.isArray(entity?.evidenceCards) && entity.evidenceCards.some((card) => card && card.type === 'FATAL_BLEED'));
}

export function hazardStatusViolation(entity) {
  if (!hasHazardEvidence(entity) || entityFinancialStatus(entity) === 'POST_MORTEM') return null;
  return `[DENSITY VIOLATION: Hazard Status Mismatch] ${entity?.name || 'Unknown entity'} has failure/fatal bleed evidence but financialStatus is not POST_MORTEM.`;
}
