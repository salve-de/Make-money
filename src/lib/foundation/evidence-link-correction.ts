type Row = Record<string, unknown>;
const GROUPS = ['entities', 'claims', 'metrics', 'money_signals', 'events', 'relationships', 'observations'];
function rows(value: unknown): Row[] {
  if (!Array.isArray(value) || value.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('Invalid correction records');
  return value as Row[];
}
function withoutLinks(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'evidence_ids'));
}

/** Only removes incorrect links; cannot introduce facts, identities or evidence. */
export function validateEvidenceLinkCorrection(original: Row, corrected: Row): void {
  const allowed = new Set([...GROUPS, 'evidence', 'collection_coverage']);
  for (const key of new Set([...Object.keys(original), ...Object.keys(corrected)])) {
    if (!allowed.has(key) && JSON.stringify(original[key]) !== JSON.stringify(corrected[key])) throw new Error(`Correction changes protected field: ${key}`);
  }
  const originalEvidence = new Map(rows(original.evidence).map((row) => [row.evidence_id, row]));
  const correctedEvidence = rows(corrected.evidence);
  const evidenceIds = new Set(correctedEvidence.map((row) => row.evidence_id));
  if (!evidenceIds.size || evidenceIds.size !== correctedEvidence.length) throw new Error('Invalid corrected evidence inventory');
  for (const row of correctedEvidence) {
    if (JSON.stringify(row) !== JSON.stringify(originalEvidence.get(row.evidence_id))) throw new Error('Correction introduces or changes evidence');
  }
  for (const group of GROUPS) {
    const before = rows(original[group]);
    const after = rows(corrected[group]);
    if (before.length !== after.length) throw new Error(`Correction drops records: ${group}`);
    after.forEach((row, index) => {
      if (JSON.stringify(withoutLinks(before[index])) !== JSON.stringify(withoutLinks(row))) throw new Error(`Correction changes record content: ${group}`);
      const prior = before[index].evidence_ids;
      const next = row.evidence_ids;
      if (!Array.isArray(prior) || !Array.isArray(next) || !next.length ||
          next.some((id) => !prior.includes(id) || !evidenceIds.has(id))) throw new Error(`Correction introduces invalid evidence links: ${group}`);
    });
  }
}
